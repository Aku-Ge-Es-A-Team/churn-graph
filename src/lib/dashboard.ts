// Dashboard aggregates over the F-05 RiskRow[] (same rows as the ranking), so every number matches the table.
import { addDays } from "@/lib/timeline";
import { LEVELS, type Level, type RiskRow } from "@/types/graph";

/** Level colours in the brand palette, for charts (badges use LEVEL_STYLES). */
export const LEVEL_HEX: Record<Level, string> = {
  Critical: "#b8352a",
  High: "#b9652b",
  Watch: "#d4a03f",
  Safe: "#c9bfb1",
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export type RenewalMonth = { key: string; label: string } & Record<Level, number>;

/** Accounts renewing in each of the next `months` calendar months (starting with the snapshot month), per level. */
export function renewalsByMonth(rows: RiskRow[], snapshot: Date, months = 12): RenewalMonth[] {
  const out: RenewalMonth[] = [];
  for (let i = 0; i < months; i++) {
    const d = new Date(Date.UTC(snapshot.getUTCFullYear(), snapshot.getUTCMonth() + i, 1));
    const key = d.toISOString().slice(0, 7);
    out.push({ key, label: `${MONTHS[d.getUTCMonth()]} ${String(d.getUTCFullYear()).slice(2)}`, Critical: 0, High: 0, Watch: 0, Safe: 0 });
  }
  const byKey = new Map(out.map((m) => [m.key, m]));
  for (const r of rows) {
    if (r.renewalDays === null || r.renewalDays < 0) continue;
    const month = byKey.get(addDays(snapshot, r.renewalDays).slice(0, 7));
    if (month) month[r.level] += 1;
  }
  return out;
}

/** Revenue at risk (estimate) of accounts above Safe that renew within `days` days. */
export function atRiskRenewingWithin(rows: RiskRow[], days: number): { value: number; accounts: number } {
  const hit = rows.filter((r) => r.level !== "Safe" && r.renewalDays !== null && r.renewalDays >= 0 && r.renewalDays <= days);
  return { value: hit.reduce((s, r) => s + (Number.isFinite(r.atRiskValue) ? r.atRiskValue : 0), 0), accounts: hit.length };
}

export type CommonSignal = { code: string; accounts: number; share: number };

/** How many of the accounts above Safe carry each signal (from their top signals), most common first. */
export function commonSignals(rows: RiskRow[], limit = 5): CommonSignal[] {
  const flagged = rows.filter((r) => r.level !== "Safe");
  if (flagged.length === 0) return [];
  const counts = new Map<string, number>();
  for (const r of flagged) for (const code of new Set(r.topSignals.map((s) => s.code))) counts.set(code, (counts.get(code) ?? 0) + 1);
  return [...counts]
    .map(([code, accounts]) => ({ code, accounts, share: accounts / flagged.length }))
    .sort((a, b) => b.accounts - a.accounts || a.code.localeCompare(b.code))
    .slice(0, limit);
}

/** Levels in display order for stacked charts: most severe on top of the stack. */
export const STACK_ORDER: Level[] = [...LEVELS].reverse();
