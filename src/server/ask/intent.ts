// Intent routing for "Ask the graph" (F-14) with JEV AI: a single classification before the tool loop.
// - out_of_scope with enough confidence: refuse immediately (no 17-21 s tool loop for "nasi goreng" questions).
// - any other intent: a tool hint is appended to the system prompt. The tools, the loop and the citation validator are unchanged.
// Any JEV failure returns null and the pipeline behaves exactly as before.
import type { JevJudge } from "../ai/jev";

export const INTENT_DESCRIPTIONS = {
  account_status: "Status, risk level or reasons for the risk of one specific customer account",
  promise_approval: "Promises, decisions, discounts, escalations or approvals made to or for a customer, and whether they were kept",
  bug_release: "Product bugs, support tickets, software releases or a drop in product usage linked to them",
  evidence_connection: "How two entities (people, accounts, features, competitors) are connected, or who mentioned or said something",
  ranking: "Which accounts are most at risk, or a comparison across accounts",
  out_of_scope: "Anything unrelated to customer accounts, churn risk, support, contracts or the customer data (general knowledge, cooking, jokes, coding help)",
} as const;
export type Intent = keyof typeof INTENT_DESCRIPTIONS;

/** Refuse early only when JEV is this sure the question is unrelated to the customer data. */
export const OUT_OF_SCOPE_MIN_CONFIDENCE = 0.7;
/** Below this confidence the tool hint is not added (a wrong hint is worse than none). */
export const HINT_MIN_CONFIDENCE = 0.6;

const TOOL_HINTS: Record<Exclude<Intent, "out_of_scope">, string> = {
  account_status: "Prefer get_account_signals and get_evidence for the account.",
  promise_approval: "Prefer find_precedents (no type filter) together with get_evidence for the account.",
  bug_release: "Prefer search_text for the ticket or release, and get_evidence for the affected accounts.",
  evidence_connection: "Prefer find_connection, then get_evidence for the entities found.",
  ranking: "Prefer get_ranking.",
};

export type IntentResult = { intent: Intent; confidence: number };
export type ClassifyFn = (question: string) => Promise<IntentResult | null>;

export function createIntentClassifier(judge: JevJudge): ClassifyFn {
  return async (question) => {
    const answers = await judge(question, {
      intent: { type: "choice", instructions: "What is this question about? Pick the single best category.", criteria: INTENT_DESCRIPTIONS },
    });
    const answer = answers?.intent;
    if (answer?.type !== "choice" || !(answer.choice in INTENT_DESCRIPTIONS)) return null;
    return { intent: answer.choice as Intent, confidence: answer.confidence };
  };
}

/** True when the question should be refused without running the tool loop. */
export const shouldRefuseEarly = (r: IntentResult | null): boolean => r?.intent === "out_of_scope" && r.confidence >= OUT_OF_SCOPE_MIN_CONFIDENCE;

/** Extra system-prompt line for a confidently classified, in-scope question; empty otherwise. */
export function toolHint(r: IntentResult | null): string {
  if (!r || r.intent === "out_of_scope" || r.confidence < HINT_MIN_CONFIDENCE) return "";
  return `\n\nTOOL HINT (question type: ${r.intent}): ${TOOL_HINTS[r.intent]}`;
}
