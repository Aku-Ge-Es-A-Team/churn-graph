import type { ValidationResult } from "./validate-citations";

// Counts and reason codes only: the user's question text and the evidence text are never logged.
export type ValidationLogEntry = {
  time: string;
  passed: number;
  flagged: number;
  discarded: number;
  reasons: string[];
};

// In-memory per instance: grows without bound and is lost on restart; enough for the demo/drill.
const entries: ValidationLogEntry[] = [];

export function logValidation(result: ValidationResult): ValidationLogEntry {
  const entry: ValidationLogEntry = {
    time: new Date().toISOString(),
    passed: result.passed.length,
    flagged: result.flagged.length,
    discarded: result.discarded.length,
    reasons: [...result.flagged, ...result.discarded].flatMap((k) => k.reasons),
  };
  entries.push(entry);
  console.info(JSON.stringify({ event: "citation_validation", ...entry }));
  return entry;
}

export function getValidationStats() {
  const perReason: Record<string, number> = {};
  let passedClaims = 0;
  for (const e of entries) {
    passedClaims += e.passed;
    for (const r of e.reasons) perReason[r] = (perReason[r] ?? 0) + 1;
  }
  return { validations: entries.length, passedClaims, perReason };
}

export function resetValidationLog(): void {
  entries.length = 0;
}
