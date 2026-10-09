import { LEVELS, P_BY_LEVEL, type DashboardColor, type Level, type Signal } from "../../types/graph";
import { DEFAULT_CONFIG, MAX_TOP_SIGNALS, type RenewalTable, type ScoringConfig } from "./config";

const MS_PER_DAY = 86_400_000;
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Calendar days (UTC) from `asOf` to the renewal date. Invalid input → null. */
export function daysToRenewal(renewalDate: string | null, asOf: Date): number | null {
  const m = renewalDate ? ISO_DATE.exec(renewalDate) : null;
  if (!m || Number.isNaN(asOf.getTime())) return null;
  const [year, month, day] = [Number(m[1]), Number(m[2]) - 1, Number(m[3])];
  const target = new Date(Date.UTC(year, month, day));
  // Reject dates that `Date` rolls over, e.g. 2026-02-30.
  if (target.getUTCMonth() !== month || target.getUTCDate() !== day) return null;
  const reference = Date.UTC(asOf.getUTCFullYear(), asOf.getUTCMonth(), asOf.getUTCDate());
  return Math.round((target.getTime() - reference) / MS_PER_DAY);
}

export function renewalFactor(days: number | null, table: RenewalTable = DEFAULT_CONFIG.renewalFactors): number {
  if (days === null) return table.missingDate;
  return table.tiers.find((t) => days <= t.maxDays)?.factor ?? table.beyond;
}

export const isValidWeight = (s: Signal) => Number.isFinite(s.weight);

/** Score = Σ weight × renewal factor. Signals with a non-finite weight are ignored (see ignoredSignals in rank.ts). */
export function accountScore(signals: Signal[], renewalDays: number | null, cfg: ScoringConfig = DEFAULT_CONFIG): number {
  const total = signals.filter(isValidWeight).reduce((sum, s) => sum + s.weight, 0);
  return total * renewalFactor(renewalDays, cfg.renewalFactors);
}

export function levelFor(score: number, cfg: ScoringConfig = DEFAULT_CONFIG): Level {
  const t = cfg.levelThresholds;
  if (score >= t.Critical) return "Critical";
  if (score >= t.High) return "High";
  if (score >= t.Watch) return "Watch";
  return "Safe";
}

/** Dashboard says Green although the findings are High or worse. */
export function divergesFromDashboard(dashboard: DashboardColor, level: Level): boolean {
  return dashboard === "Green" && LEVELS.indexOf(level) <= LEVELS.indexOf("High");
}

export const safeAmount = (v: number) => (Number.isFinite(v) && v > 0 ? v : 0);

/** ESTIMATE (assumption A15): p is returned too so the UI can show it. */
export function atRiskValue(annualValue: number, level: Level): { p: number; amount: number } {
  const p = P_BY_LEVEL[level];
  return { p, amount: Math.round(safeAmount(annualValue) * p) };
}

export const compare = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

/** Weight descending, then earlier `since`, then code alphabetically. Does not mutate the input. */
export function topSignals(signals: Signal[], n = MAX_TOP_SIGNALS): Signal[] {
  return signals
    .filter(isValidWeight)
    .sort((a, b) => b.weight - a.weight || compare(a.since, b.since) || compare(a.code, b.code))
    .slice(0, n);
}
