import { z } from "zod";
import { readCypher } from "@/server/neo4j";
import { ask, defaultGenerate } from "@/server/ask/ask";
import { getLlmModel } from "@/server/ai/provider";
import { getJevJudge } from "@/server/ai/jev";
import { createIntentClassifier } from "@/server/ask/intent";

// POST /api/ask  { "question": "..." }  ->  { answer, claims[], graph, refused, note?, toolsUsed[] }
// Responses: 200 · 400 invalid body · 502 LLM failure · 503 LLM not configured / graph unavailable.
// The LLM runs a bounded tool loop and can take well over the default function time.
export const maxDuration = 60;

const BodySchema = z.object({ question: z.string().trim().min(3).max(500) });

const error = (status: number, code: string, message: string, extra: Record<string, unknown> = {}) => Response.json({ error: code, message, ...extra }, { status });
const SUGGEST_PRESETS = "Try one of the preset questions instead.";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return error(400, "invalid_body", "The request body must be JSON.");
  }
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) return error(400, "invalid_question", "`question` must be text of 3 to 500 characters.");

  let model: ReturnType<typeof getLlmModel>;
  try {
    model = getLlmModel();
  } catch (e) {
    console.error("[api/ask] LLM is not configured:", e instanceof Error ? e.message : e);
    return error(503, "llm_not_configured", `The language model is not configured. ${SUGGEST_PRESETS}`);
  }

  try {
    // Trusted tools use the guarded READ session; the LIMIT ceiling stays at the default of 200.
    const judge = getJevJudge();
    const result = await ask(parsed.data.question, { run: (q, p) => readCypher(q, p), generate: defaultGenerate(model), ...(judge ? { classify: createIntentClassifier(judge) } : {}) });
    return Response.json(result);
  } catch (e) {
    // Only the error name/status go to the log and the response: provider errors can echo request headers.
    const err = e as { name?: string; statusCode?: number; message?: string };
    console.error(`[api/ask] failed: ${err.name ?? "Error"}${err.statusCode ? ` HTTP ${err.statusCode}` : ""}`);
    if (err.name === "Neo4jConfigError" || err.name === "ServiceUnavailable" || err.name === "Neo4jError") {
      return error(503, "graph_unavailable", `The graph database could not be reached. ${SUGGEST_PRESETS}`);
    }
    return error(502, "llm_unavailable", `The language model failed or timed out. ${SUGGEST_PRESETS}`);
  }
}
