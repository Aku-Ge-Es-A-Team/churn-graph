import { ClaimSchema, type Claim } from "../../types/graph";
import type { EvidenceItem, EvidenceRegistry } from "./evidence";

export type DiscardReason =
  | "invalid_format"
  | "no_evidence"
  | "unknown_evidence"
  | "quote_without_source_text"
  | "quote_mismatch";
export type FlagReason = "quote_too_short" | "number_not_found";

export type FlaggedClaim = { claim: Claim; reasons: FlagReason[] };
// `claim` is null when the LLM element was not even shaped like a Claim.
export type DiscardedClaim = { claim: Claim | null; reasons: DiscardReason[]; offendingIds?: string[] };

export type ValidationResult = {
  passed: Claim[];
  flagged: FlaggedClaim[];
  discarded: DiscardedClaim[];
  valid: boolean;
};

const MIN_QUOTE_LENGTH = 8;
const NUMBER_TOKEN = /\d+(?:[.,]\d+)*/g;
// Identifiers such as C10, I0290, D-2025-11, BUG-412 or v4.12: their digits are not quantities, so they are skipped.
// A rupiah amount written without a space ("Rp129.444.000") is a quantity and is still checked.
const ID_WORD = /\b(?!Rp\d)[A-Za-z]+(?:-[A-Za-z]+)*-?\d[\w.-]*/gi;

export function normalizeText(s: string): string {
  return s
    .replace(/[‘’‚‛′]/g, "'")
    .replace(/[“”„‟″]/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

// HEURISTIC, may give false positives/negatives. Each number token is read both ways
// (Indonesian "1.500.000,5" and international "1,500,000.5") and compared by value, so "15%" equals "15 %".
// Units are not understood: "252 jt" is not "252.000.000".
function numberValues(text: string): Set<number> {
  const out = new Set<number>();
  for (const [token] of text.matchAll(NUMBER_TOKEN)) {
    const asIndonesian = Number(token.replace(/\./g, "").replace(",", "."));
    const asInternational = Number(token.replace(/,/g, ""));
    if (!Number.isNaN(asIndonesian)) out.add(asIndonesian);
    if (!Number.isNaN(asInternational)) out.add(asInternational);
  }
  return out;
}

// Conservative: EVERY number in the claim must be found in the evidence it cites.
function numbersMissing(claimText: string, sources: EvidenceItem[]): boolean {
  const haystack = sources.map((s) => `${s.id} ${s.text ?? ""} ${JSON.stringify(s.props ?? {})}`).join(" ");
  const available = numberValues(haystack);
  for (const [token] of claimText.replace(ID_WORD, " ").matchAll(NUMBER_TOKEN)) {
    if (![...numberValues(token)].some((v) => available.has(v))) return true;
  }
  return false;
}

function checkClaim(
  claim: Claim,
  registry: EvidenceRegistry,
  minQuoteLength: number,
): { discarded: DiscardedClaim } | { flagged: FlagReason[] } {
  if (claim.text.trim() === "") return { discarded: { claim, reasons: ["invalid_format"] } };

  // 1. No evidence.
  if (claim.evidenceIds.length === 0) return { discarded: { claim, reasons: ["no_evidence"] } };

  // 2. A single ID outside the registry is enough to discard the claim.
  const unknown = claim.evidenceIds.filter((id) => !registry.has(id));
  if (unknown.length) return { discarded: { claim, reasons: ["unknown_evidence"], offendingIds: unknown } };
  const sources = claim.evidenceIds.map((id) => registry.get(id)!);

  const flags: FlagReason[] = [];

  // 3. The quote must be a substring of the text of the evidence THIS claim cites (case-sensitive).
  if (claim.quote !== undefined) {
    const withText = sources.filter((s) => s.text && s.text.trim() !== "");
    if (withText.length === 0) return { discarded: { claim, reasons: ["quote_without_source_text"] } };
    const quote = normalizeText(claim.quote);
    if (!withText.some((s) => normalizeText(s.text!).includes(quote))) {
      return { discarded: { claim, reasons: ["quote_mismatch"] } };
    }
    if (quote.length < minQuoteLength) flags.push("quote_too_short");
  }

  // 4. Flag only.
  if (numbersMissing(claim.text, sources)) flags.push("number_not_found");

  return { flagged: flags };
}

// `input` is LLM output: whatever its shape, this function never throws.
// When in doubt the claim is discarded; no path lets a claim through without evidence in the registry.
export function validateAnswer(input: unknown, registry: EvidenceRegistry, opts?: { minQuoteLength?: number }): ValidationResult {
  const minQuoteLength = opts?.minQuoteLength ?? MIN_QUOTE_LENGTH;
  const result: ValidationResult = { passed: [], flagged: [], discarded: [], valid: false };

  const rawClaims = (input as { claims?: unknown } | null | undefined)?.claims;
  if (typeof input !== "object" || !Array.isArray(rawClaims)) return result;

  for (const raw of rawClaims) {
    const parsed = ClaimSchema.safeParse(raw);
    if (!parsed.success) {
      result.discarded.push({ claim: null, reasons: ["invalid_format"] });
      continue;
    }
    const outcome = checkClaim(parsed.data, registry, minQuoteLength);
    if ("discarded" in outcome) result.discarded.push(outcome.discarded);
    else if (outcome.flagged.length) result.flagged.push({ claim: parsed.data, reasons: outcome.flagged });
    else result.passed.push(parsed.data);
  }

  result.valid = result.passed.length > 0;
  return result;
}
