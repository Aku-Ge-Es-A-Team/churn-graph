import { askQuestion, FAILURE_MESSAGE, QuestionSchema } from "@/server/ask/ask";
import { REFUSAL_SUGGESTIONS } from "@/server/ask/presets";
import { getLlmModel } from "@/server/ai/provider";
import { readCypher } from "@/server/neo4j";
import type { CypherRunner } from "@/server/queries/runner";

// POST /api/ask { question } → AskResponse (F-14).
// 200 for every business outcome (ok / partial / refused / failed) · 400 invalid input · 500 unexpected crash only.
// The PRD field name `pertanyaan` is accepted as an alias.
export const maxDuration = 60;

// Trusted tool queries: READ session, write clauses denied and 5 s timeout still apply; only the LIMIT ceiling is raised.
const run: CypherRunner = (query, params) => readCypher(query, params, { maxLimit: 5000 });

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid_body", message: 'The body must be JSON: { "question": string }.' }, { status: 400 });
  }
  const raw = (body as { question?: unknown; pertanyaan?: unknown } | null) ?? {};
  const question = QuestionSchema.safeParse(raw.question ?? raw.pertanyaan);
  if (!question.success) {
    return Response.json({ error: "invalid_question", message: "`question` must be a string of 3–500 characters." }, { status: 400 });
  }

  let model;
  try {
    model = getLlmModel();
  } catch (e) {
    // Incomplete LLM env is an operational failure, reported like any other LLM outage (variable names only, no values).
    console.error("[api/ask]", e instanceof Error ? e.message : e);
    return Response.json({ status: "failed", answer: FAILURE_MESSAGE, claims: [], discarded: 0, presetSuggestions: REFUSAL_SUGGESTIONS, toolsCalled: [], durationMs: 0 });
  }

  try {
    return Response.json(await askQuestion(question.data, { model, run }));
  } catch (e) {
    console.error("[api/ask] unexpected error:", e instanceof Error ? e.message : e);
    return Response.json({ error: "internal_error", message: "Unexpected error." }, { status: 500 });
  }
}
