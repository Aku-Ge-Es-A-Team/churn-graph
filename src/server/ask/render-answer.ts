import type { Claim } from "../../types/graph";
import type { ValidationResult } from "./validate-citations";

export const REFUSAL_MESSAGE =
  "Sorry, I can't answer this question with evidence that can be verified from the data. " +
  "Please try one of the preset questions.";
export const VERIFY_MARKER = "[needs verification]";

export type RenderedAnswer = { answer: string; claims: Claim[]; refused: boolean; note?: string };

// The free-form `answer` from the LLM is deliberately ignored: the LLM could slip in sentences that are
// not in `claims`, which would reach the UI without evidence. The display text is assembled only from
// claims that passed the validator, so every sentence the user sees has verified evidenceIds.
// Order: passed claims first (original order), then flagged claims (original order) with a marker.
export function renderAnswer(result: ValidationResult): RenderedAnswer {
  const flagged = result.flagged.map((d) => d.claim);
  if (result.passed.length === 0 && flagged.length === 0) {
    return { answer: REFUSAL_MESSAGE, claims: [], refused: true };
  }

  const lines = [...result.passed.map((c) => c.text.trim()), ...flagged.map((c) => `${VERIFY_MARKER} ${c.text.trim()}`)];

  const notes: string[] = [];
  if (flagged.length) notes.push(`${flagged.length} claim(s) need verification.`);
  if (result.discarded.length) notes.push(`${result.discarded.length} claim(s) were discarded because the evidence does not support them.`);

  return {
    answer: lines.join("\n"),
    claims: [...result.passed, ...flagged],
    refused: false,
    ...(notes.length ? { note: notes.join(" ") } : {}),
  };
}
