// F-24 (Could): one-sentence summary of the ranking — accounts per level and total revenue at risk.
// Pure function over the RiskRow[] produced by F-05, so every number matches the ranking board.
import { LEVELS, type Level, type RiskRow } from "@/types/graph";

export type RiskSummary = {
  accounts: number;
  byLevel: { level: Level; count: number }[];
  /** Accounts above Safe (Critical, High, Watch). */
  needAttention: number;
  /** Σ atRiskValue of the accounts above Safe. An ESTIMATE (annual value × p). */
  atRiskTotal: number;
  /** Σ annual value of the accounts above Safe. */
  annualValueNeedingAttention: number;
  /** Σ annual value of all accounts. */
  annualValueTotal: number;
};

const finite = (v: number) => (Number.isFinite(v) ? v : 0);

export function summarizeRisk(rows: RiskRow[]): RiskSummary {
  const flagged = rows.filter((r) => r.level !== "Safe");
  return {
    accounts: rows.length,
    byLevel: LEVELS.map((level) => ({ level, count: rows.filter((r) => r.level === level).length })),
    needAttention: flagged.length,
    atRiskTotal: flagged.reduce((sum, r) => sum + finite(r.atRiskValue), 0),
    annualValueNeedingAttention: flagged.reduce((sum, r) => sum + finite(r.annualValue), 0),
    annualValueTotal: rows.reduce((sum, r) => sum + finite(r.annualValue), 0),
  };
}

/** "4 of 40 accounts need attention: 1 Critical, 2 High, 1 Watch." Levels with zero accounts are left out. */
export function summarySentence(summary: RiskSummary): string {
  if (summary.accounts === 0) return "No accounts to summarise yet.";
  if (summary.needAttention === 0) return `All ${summary.accounts} accounts are Safe.`;
  const parts = summary.byLevel.filter((l) => l.level !== "Safe" && l.count > 0).map((l) => `${l.count} ${l.level}`);
  const verb = summary.needAttention === 1 ? "needs" : "need";
  return `${summary.needAttention} of ${summary.accounts} accounts ${verb} attention: ${parts.join(", ")}.`;
}
