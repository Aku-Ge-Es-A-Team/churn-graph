// "Ask the graph" pipeline (F-14): LLM with the six fixed tools -> claims with cited IDs -> citation validator (F-10) -> answer.
// The free-form answer of the LLM is never shown; the displayed text is rendered from validated claims only.
// The LLM call is injectable (`generate`) so the pipeline is testable without a network.
import { generateText, isStepCount, type LanguageModel } from "ai";
import type { Claim, GraphPayload } from "../../types/graph";
import { fetchInducedSubgraph } from "../queries/evidence";
import type { CypherRunner } from "../queries/runner";
import { EvidenceRegistry } from "./evidence";
import { shouldRefuseEarly, toolHint, type ClassifyFn, type IntentResult } from "./intent";
import { renderAnswer, REFUSAL_MESSAGE } from "./render-answer";
import { createAskTools } from "./tools";
import { validateAnswer } from "./validate-citations";
import { logValidation } from "./validation-log";

export const SYSTEM_PROMPT = `You are an analyst answering questions about customer churn risk from a knowledge graph. Rules:
1. Answer in English. The graph data may contain Indonesian text (for example a status such as "Belum ditepati"); translate it into English, but keep IDs, names and codes unchanged.
2. Use ONLY the provided tools. Never answer from your own knowledge. If no tool result supports an answer, say there is no evidence.
3. Write one factual statement per line. End every statement with the IDs that support it in square brackets, copied from the "citeableIds" of tool results, e.g. "The champion left on 15 August 2026. [I0290] [K017]". Never invent an ID; a statement without an ID is dropped.
4. Rupiah amounts come only from tool output and must be called an estimate.
5. When a precedent deviates from policy or a decision, state the deviation and its reason.
6. Answer EVERY part of the question: a question with several parts (what / who / whether / when / how much) gets at least one cited statement per part, and each statement names the concrete subject (feature, person, decision, date). If a part has no evidence, say so in a statement instead of skipping it. Do not answer with a side detail that addresses only one part.
7. For a question about an account's promises, approvals or decisions, call find_precedents with the account (no type filter) AND get_evidence for that account; combine both before answering. A promise's fulfilment is in "promiseStatus"; the approver is in "approver".
8. If the question cannot be answered with the tools, do not call any tool and do not answer.`;

export type AskResult = {
  answer: string;
  claims: Claim[];
  /** Evidence subgraph of the claims that passed; null when nothing passed. */
  graph: GraphPayload | null;
  refused: boolean;
  note?: string;
  toolsUsed: string[];
  /** JEV AI intent classification of the question, when JEV is configured and answered. */
  intent?: IntentResult;
};

export type GenerateFn = (args: { system: string; prompt: string; tools: ReturnType<typeof createAskTools> }) => Promise<{ text: string; toolsUsed: string[] }>;

const MAX_RESULTS_CHARS = 24_000;
const REPAIR_PROMPT = `Rewrite the draft answer as JSON only: {"claims":[{"text":"...","evidenceIds":["ID1","ID2"]}]}. Write in English, one factual statement per claim, and cover EVERY part of the question (e.g. what / who / whether) with at least one claim each. Each claim text names its concrete subject (feature, person, decision, date). evidenceIds are copied from the "citeableIds" of the tool results and must support that claim. Use only facts in the tool results. Output only the JSON object.`;

/**
 * Default generator: Vercel AI SDK with tool calling, at most 8 steps. Chat models sometimes forget the bracketed IDs, so when
 * the final reply carries no citation at all, one repair call (no tools) rewrites the draft from the collected tool results.
 */
export function defaultGenerate(model: LanguageModel): GenerateFn {
  return async ({ system, prompt, tools }) => {
    const result = await generateText({ model, system, prompt, tools, stopWhen: isStepCount(8) });
    const toolsUsed = result.steps.flatMap((s) => s.toolCalls.map((c) => c.toolName));
    // Prose where only some lines carry IDs (models often cite once at the end of a block) would silently drop the other lines.
    if (toolsUsed.length === 0 || parseModelJson(result.text) !== null || (claimsFromBracketedProse(result.text).claims.length > 0 && !hasUncitedLines(result.text))) return { text: result.text, toolsUsed };
    const results = result.steps.flatMap((s) => s.toolResults.map((r) => ({ tool: r.toolName, output: r.output })));
    const repaired = await generateText({
      model,
      system: REPAIR_PROMPT,
      // The format instruction is repeated after the data: the gateway model otherwise follows the draft's prose format instead of the system prompt.
      prompt: `Question: ${prompt}\n\nDraft answer:\n${result.text}\n\nTool results:\n${JSON.stringify(results).slice(0, MAX_RESULTS_CHARS)}\n\n${REPAIR_PROMPT}`,
    });
    return { text: repaired.text, toolsUsed };
  };
}

/** Extracts a JSON object from a model reply (tolerates code fences and surrounding prose). Returns null if there is none. */
export function parseModelJson(text: string): unknown {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}

const ID_TOKEN = /^(?=.*\d)[A-Za-z0-9][A-Za-z0-9_.:-]*$/; // every dataset ID contains a digit (I0290, FEAT-07, D-2025-11); plain words do not
/** A bracket group such as "[I0290]" or "[D-2025-11, FEAT-07]" - chat models often put several IDs in one pair of brackets. */
const BRACKET_GROUP = /\[([^\]]+)\]/g;
const idsOfGroup = (inner: string): string[] | null => {
  const tokens = inner.split(/[\s,;]+/).filter(Boolean);
  return tokens.length > 0 && tokens.every((t) => ID_TOKEN.test(t)) ? tokens : null;
};

/** True when a prose reply has a substantive line (4+ words) without any bracketed ID: that line would be dropped by the parser. */
export function hasUncitedLines(text: string): boolean {
  return text.split("\n").some((line) => {
    const withoutIds = line.replace(BRACKET_GROUP, (whole, inner: string) => (idsOfGroup(inner) ? "" : whole));
    if (withoutIds !== line) return false;
    return line.replace(/\*\*|__|[-*•#]/g, " ").split(/\s+/).filter(Boolean).length >= 4;
  });
}

/**
 * Prose fallback: chat models usually answer in lines such as "Champion keluar. [I0290] [K017]" or "... [I0290, K017]". Each line
 * with bracketed IDs becomes one claim; lines without IDs are dropped. The IDs are only candidates - the validator checks them against the registry.
 */
export function claimsFromBracketedProse(text: string): { claims: Claim[] } {
  const claims: Claim[] = [];
  for (const line of text.split("\n")) {
    const found: string[] = [];
    const stripped = line.replace(BRACKET_GROUP, (whole, inner: string) => {
      const ids = idsOfGroup(inner);
      if (!ids) return whole;
      found.push(...ids);
      return "";
    });
    const evidenceIds = [...new Set(found)];
    if (evidenceIds.length === 0) continue;
    const statement = stripped.replace(/\*\*|__/g, "").replace(/^\s*(?:[-*•]|\d+[.)])\s*/, "").replace(/\s+/g, " ").replace(/\s+([.,;:])/g, "$1").trim();
    if (statement) claims.push({ text: statement, evidenceIds });
  }
  return { claims };
}

const refused = (toolsUsed: string[], note?: string): AskResult => ({ answer: REFUSAL_MESSAGE, claims: [], graph: null, refused: true, toolsUsed, ...(note ? { note } : {}) });

export async function ask(question: string, deps: { run: CypherRunner; generate: GenerateFn; classify?: ClassifyFn }): Promise<AskResult> {
  // JEV AI intent routing (optional): refuse unrelated questions at once, otherwise steer the tool choice. null = behave as before.
  const routed = deps.classify ? await deps.classify(question) : null;
  if (shouldRefuseEarly(routed)) return { ...refused([]), intent: routed! };

  const registry = new EvidenceRegistry();
  const tools = createAskTools({ run: deps.run, registry });
  const { text, toolsUsed } = await deps.generate({ system: SYSTEM_PROMPT + toolHint(routed), prompt: question, tools });

  // A question that triggered no tool is outside what the tools can answer: polite refusal, never a model-knowledge answer.
  if (toolsUsed.length === 0) return refused(toolsUsed);

  // Structured JSON when the model supplied it, otherwise the bracketed-ID prose. validateAnswer never throws and discards claims one by one.
  const validation = validateAnswer(parseModelJson(text) ?? claimsFromBracketedProse(text), registry);
  logValidation(validation);
  const rendered = renderAnswer(validation);
  if (rendered.refused) return refused(toolsUsed, rendered.note);

  // Subgraph of the cited IDs that exist as nodes (relationship IDs are ignored by the induced query).
  const ids = [...new Set(rendered.claims.flatMap((c) => c.evidenceIds))];
  const { nodes, edges } = await fetchInducedSubgraph(deps.run, ids);
  const graph: GraphPayload = { nodes, edges, highlight: nodes.map((n) => n.id), meta: { account: "ask", nodeCount: nodes.length, edgeCount: edges.length } };
  return { answer: rendered.answer, claims: rendered.claims, graph, refused: false, toolsUsed, ...(routed ? { intent: routed } : {}), ...(rendered.note ? { note: rendered.note } : {}) };
}
