// JEV AI (TypeSafe "System One") client: typed yes/no, choice and score questions about a `state`.
// JEV judges and classifies; it does not generate text. Every failure (no key, timeout, HTTP error, malformed or incomplete
// reply) resolves to `null` so callers fall back to their rule-based behaviour. The key is read from the environment only.
import { z } from "zod";
import { jevEnv } from "../env";

export const JEV_ENDPOINT = "https://api.typesafe.ai/v1/systemone";
const DEFAULT_TIMEOUT_MS = 4_000;

export type JevQuestion =
  | { type: "noul"; instructions: unknown; criteria?: { true?: string; false?: string } }
  | { type: "choice"; instructions: unknown; criteria: Record<string, string | null> }
  | { type: "score"; instructions: unknown; criteria: string[] };

const AnswerSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("noul"), noul: z.number().min(0).max(1) }),
  z.object({ type: z.literal("choice"), choice: z.string(), probabilities: z.record(z.string(), z.number()), confidence: z.number().min(0).max(1) }),
  z.object({ type: z.literal("score"), score: z.number(), confidence: z.number().min(0).max(1) }),
]);
const ResponseSchema = z.object({ answers: z.record(z.string(), AnswerSchema) });

export type JevAnswer = z.infer<typeof AnswerSchema>;
export type JevAnswers = Record<string, JevAnswer>;
/** One evaluation call. Resolves to null on any failure. */
export type JevJudge = (state: unknown, questions: Record<string, JevQuestion>) => Promise<JevAnswers | null>;

type JevOptions = { apiKey: string; model: string; fetchImpl?: typeof fetch; timeoutMs?: number };

export function createJevJudge({ apiKey, model, fetchImpl = fetch, timeoutMs = DEFAULT_TIMEOUT_MS }: JevOptions): JevJudge {
  return async (state, questions) => {
    try {
      const response = await fetchImpl(JEV_ENDPOINT, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ state, model, questions }),
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (!response.ok) {
        console.error(`[jev] request failed: HTTP ${response.status}`); // status only: never the key or the body
        return null;
      }
      const parsed = ResponseSchema.safeParse(await response.json());
      if (!parsed.success) return null;
      // Every requested question must come back with the matching answer type; a partial reply is treated as a failure.
      for (const [id, question] of Object.entries(questions)) {
        if (parsed.data.answers[id]?.type !== question.type) return null;
      }
      return parsed.data.answers;
    } catch (e) {
      console.error(`[jev] request failed: ${e instanceof Error ? e.name : "Error"}`);
      return null;
    }
  };
}

/** Judge configured from TYPESAFE_API_KEY / TYPESAFE_MODEL; null when JEV is not configured. */
export function getJevJudge(): JevJudge | null {
  const env = jevEnv();
  return env ? createJevJudge(env) : null;
}
