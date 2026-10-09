// Pure presentation helpers for the ranking board (F-11). No React, no server access.
import { LEVELS, type Level, type RiskRow, type Signal } from "@/types/graph";

/** Human labels for the persisted signal codes. Unknown codes are shown as-is. */
const SIGNAL_LABELS: Record<string, string> = {
  CHAMPION_KELUAR: "Champion left",
  JANJI_DILANGGAR: "Feature promise broken",
  KOMPETITOR_DISEBUT: "Competitor mentioned",
  OUTREACH_TAK_BERBALAS: "Outreach unanswered",
  RISIKO_PEMBAYARAN: "Payment risk",
  TIKET_BUG_TAK_TERTAUT: "Bug tickets not linked",
  ANOMALI_USAGE_RILIS_BUG: "Usage drop after release (bug)",
  TIKET_TAK_DIREPRODUKSI: "Tickets closed as not reproducible",
};

export function signalLabel(code: string): string {
  return SIGNAL_LABELS[code] ?? code;
}

/** Top signals for display: weight descending, earlier `since` first, then code; never mutates the input. */
export function selectTopSignals(signals: Signal[], n = 3): Signal[] {
  return signals
    .filter((s) => Number.isFinite(s.weight))
    .sort((a, b) => b.weight - a.weight || (a.since < b.since ? -1 : a.since > b.since ? 1 : 0) || (a.code < b.code ? -1 : 1))
    .slice(0, n);
}

/** Divergence per PRD F-05: dashboard Green (case-insensitive) while the level is High or Critical. */
export function isDivergent(dashboard: string, level: Level): boolean {
  return dashboard.trim().toLowerCase() === "green" && (level === "Critical" || level === "High");
}

/** "in 75 days" / "today" / "3 days ago" / "—" when the date is unknown. */
export function renewalLabel(days: number | null): string {
  if (days === null || !Number.isFinite(days)) return "—";
  if (days === 0) return "today";
  const abs = Math.abs(days);
  const unit = abs === 1 ? "day" : "days";
  return days > 0 ? `in ${abs} ${unit}` : `${abs} ${unit} ago`;
}

/** Compact rupiah: 89_964_000 → "Rp 90.0M". */
export function formatCompactIdr(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "Rp 0";
  if (value >= 1e9) return `Rp ${(value / 1e9).toFixed(1)}B`;
  if (value >= 1e6) return `Rp ${(value / 1e6).toFixed(1)}M`;
  if (value >= 1e3) return `Rp ${Math.round(value / 1e3)}K`;
  return `Rp ${Math.round(value)}`;
}

export function formatFullIdr(value: number): string {
  return `Rp ${Math.round(Number.isFinite(value) ? value : 0).toLocaleString("en-US")}`;
}

/** p derived from the data (atRisk / annual); null when the annual value is zero, so no bogus percentage is shown. */
export function impliedP(atRiskValue: number, annualValue: number): number | null {
  return annualValue > 0 && Number.isFinite(atRiskValue) ? atRiskValue / annualValue : null;
}

/** One entry per level that occurs in the rows, with its p taken from the data. */
export function legendFromRows(rows: RiskRow[]): { level: Level; p: number; count: number }[] {
  return LEVELS.flatMap((level) => {
    const ofLevel = rows.filter((r) => r.level === level);
    return ofLevel.length ? [{ level, p: ofLevel[0].p, count: ofLevel.length }] : [];
  });
}

export function filterFocus(rows: RiskRow[], focusIds: readonly string[]): RiskRow[] {
  const set = new Set(focusIds);
  return rows.filter((r) => set.has(r.account));
}

/** Tailwind classes per level. Colour is never the only cue: the level text is always rendered too. */
export const LEVEL_STYLES: Record<Level, { badge: string; row: string }> = {
  Critical: { badge: "bg-red-600 text-white", row: "bg-red-50 dark:bg-red-950/40" },
  High: { badge: "bg-orange-500 text-white", row: "bg-orange-50 dark:bg-orange-950/40" },
  Watch: { badge: "bg-amber-400 text-black", row: "bg-amber-50 dark:bg-amber-950/30" },
  Safe: { badge: "bg-emerald-600 text-white", row: "" },
};
