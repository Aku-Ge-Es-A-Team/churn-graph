// Tanya Graph orchestration (F-14): question → LLM with the six fixed tools → structured answer → citation validator
// (F-10) → response assembled only from validated claims. Pure with respect to HTTP: the route handler and F-15 (preset
// cache) both call askQuestion. The model and the Cypher runner are injected, so tests never call a real LLM or Aura.
//
// Two phases, because the 9router endpoint ignores `response_format` (no structured output) and rejects an object
// `tool_choice`, while plain tool calling works:
//   1. research: the six data tools; the loop stops on its own once a soft time budget is spent, so evidence gathered
//      so far is kept instead of being lost to an abort;
//   2. submit (only when phase 1 did not already end with the JSON answer): the conversation so far plus a single
//      output-only tool `submit_answer`, forced with toolChoice "required". It reads no data.
import { generateText, isStepCount, tool, type LanguageModel, type ModelMessage } from "ai";
import { z } from "zod";
import { ClaimSchema, type AskResponse } from "../../types/graph";
import type { CypherRunner } from "../queries/runner";
import { EvidenceRegistry } from "./evidence";
import { REFUSAL_SUGGESTIONS } from "./presets";
import { SUBMIT_INSTRUCTION, SYSTEM_PROMPT } from "./prompt";
import { renderAnswer, REFUSAL_MESSAGE } from "./render-answer";
import { createAskTools } from "./tools";
import { validateAnswer } from "./validate-citations";
import { logValidation } from "./validation-log";

// ASSUMPTION (spec §6 starts at 25 s; measured on 9router 2026-10-10: one LLM call takes 6–10 s, submit up to ~18 s):
// research stops starting new steps after the soft budget, the hard limits abort a hung call.
// 38 + 20 s stays inside the route's maxDuration of 60 s.
export const RESEARCH_SOFT_BUDGET_MS = 20_000;
export const RESEARCH_TIMEOUT_MS = 38_000;
export const SUBMIT_TIMEOUT_MS = 20_000;
/** Upper bound of research steps (each step may hold several tool calls). */
export const MAX_STEPS = 6;

export const QuestionSchema = z.string().trim().min(3).max(500);
export const AnswerSchema = z.object({ answer: z.string(), claims: z.array(ClaimSchema) });

export const FAILURE_MESSAGE =
  "The answer could not be generated right now (the language model or the graph did not respond). Please try a preset question.";

export type AskDeps = { model: LanguageModel; run: CypherRunner };

/** Finds the JSON object in the model's final text (tolerates code fences or a sentence around it). */
export function parseAnswerJson(text: string): unknown {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}

function logFailure(phase: string, error: unknown): null {
  // Name, status and a short message only; never request headers (they carry the API key).
  const e = error as { name?: string; statusCode?: number; message?: string };
  console.error(`[ask] ${phase} failed: ${e.name ?? "Error"}${e.statusCode ? ` HTTP ${e.statusCode}` : ""} ${String(e.message ?? "").slice(0, 200)}`);
  return null;
}

/** Phase 2: asks the model to hand in its answer through the forced output tool. Returns the raw tool input. */
async function submitAnswer(model: LanguageModel, messages: ModelMessage[]): Promise<unknown> {
  const result = await generateText({
    model,
    instructions: SYSTEM_PROMPT,
    messages: [...messages, { role: "user", content: SUBMIT_INSTRUCTION }],
    tools: { submit_answer: tool({ description: "Kirim jawaban akhir beserta klaim dan evidenceIds-nya.", inputSchema: AnswerSchema }) },
    toolChoice: "required",
    timeout: { totalMs: SUBMIT_TIMEOUT_MS },
    maxRetries: 0,
  }).catch((e: unknown) => logFailure("submit", e));
  // Read the raw input even when it failed the schema: the citation validator decides what survives.
  return result?.steps.flatMap((s) => s.content).find((p) => p.type === "tool-call")?.input ?? null;
}

export async function askQuestion(question: string, deps: AskDeps): Promise<AskResponse> {
  const started = Date.now();
  const base = (toolsCalled: string[]) => ({ toolsCalled, durationMs: Date.now() - started });
  const refused = (toolsCalled: string[], discarded = 0, note?: string): AskResponse => ({
    status: "refused",
    answer: REFUSAL_MESSAGE,
    claims: [],
    discarded,
    presetSuggestions: REFUSAL_SUGGESTIONS,
    ...base(toolsCalled),
    ...(note ? { note } : {}),
  });
  const failed = (toolsCalled: string[]): AskResponse => ({
    status: "failed",
    answer: FAILURE_MESSAGE,
    claims: [],
    discarded: 0,
    presetSuggestions: REFUSAL_SUGGESTIONS,
    ...base(toolsCalled),
  });

  const parsedQuestion = QuestionSchema.safeParse(question);
  if (!parsedQuestion.success) return refused([], 0, "The question must be 3–500 characters long.");

  const registry = new EvidenceRegistry();
  const research = await generateText({
    model: deps.model,
    instructions: SYSTEM_PROMPT,
    prompt: parsedQuestion.data, // the only trusted instruction; tool data is marked untrusted in the system prompt
    tools: createAskTools(deps.run, registry),
    stopWhen: [isStepCount(MAX_STEPS), () => Date.now() - started > RESEARCH_SOFT_BUDGET_MS],
    timeout: { totalMs: RESEARCH_TIMEOUT_MS },
    maxRetries: 0,
  }).catch((e: unknown) => logFailure("research", e));
  if (!research) return failed([]);

  const toolsCalled = research.steps.flatMap((s) => s.toolCalls.map((c) => c.toolName));
  const toolFailed = research.steps.some((s) => s.content.some((part) => part.type === "tool-error"));
  // No tool call means no evidence: the model may not answer from its own knowledge.
  if (toolsCalled.length === 0) return refused(toolsCalled);

  let output = parseAnswerJson(research.text);
  if (!AnswerSchema.safeParse(output).success) {
    output = await submitAnswer(deps.model, [{ role: "user", content: parsedQuestion.data }, ...research.response.messages]);
  }

  const validation = validateAnswer(output ?? {}, registry);
  logValidation(validation);
  const rendered = renderAnswer(validation);
  const discarded = validation.discarded.length;
  if (rendered.refused) return toolFailed ? failed(toolsCalled) : refused(toolsCalled, discarded);

  return {
    status: discarded > 0 || validation.flagged.length > 0 ? "partial" : "ok",
    answer: rendered.answer,
    claims: rendered.claims,
    discarded,
    ...base(toolsCalled),
    ...(rendered.note ? { note: rendered.note } : {}),
  };
}
