// F-19 static inconsistency timeline: when each signal first appeared, in days before (or after) the renewal date.
// Pure functions; dates are compared as calendar days in UTC so time zones never shift a day.
import type { Signal } from "@/types/graph";

export type TimelineItem = {
  code: string;
  since: string;
  weight: number;
  facts: Record<string, unknown>;
  /** Calendar days from `since` to the renewal date; negative when the signal appeared after renewal. Null without a renewal date. */
  daysBeforeRenewal: number | null;
};

const DAY_MS = 86_400_000;

function utcDay(iso: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return null;
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

/** ISO date (YYYY-MM-DD) that lies `days` after `reference`. */
export function addDays(reference: Date, days: number): string {
  return new Date(Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth(), reference.getUTCDate()) + days * DAY_MS)
    .toISOString()
    .slice(0, 10);
}

/** One item per signal code with its earliest `since`, sorted oldest first (ties: higher weight, then code). */
export function buildTimeline(signals: Signal[], renewalDate: string | null): TimelineItem[] {
  const earliest = new Map<string, Signal>();
  for (const s of signals) {
    const current = earliest.get(s.code);
    if (!current || s.since < current.since) earliest.set(s.code, s);
  }
  const renewal = renewalDate ? utcDay(renewalDate) : null;
  return [...earliest.values()]
    .sort((a, b) => (a.since !== b.since ? (a.since < b.since ? -1 : 1) : b.weight - a.weight || (a.code < b.code ? -1 : 1)))
    .map((s) => {
      const since = utcDay(s.since);
      return {
        code: s.code,
        since: s.since,
        weight: s.weight,
        facts: s.facts,
        daysBeforeRenewal: renewal !== null && since !== null ? Math.round((renewal - since) / DAY_MS) : null,
      };
    });
}

/** "148 days before renewal" / "3 days after renewal" / "On the renewal date". */
export function renewalOffsetLabel(days: number | null): string | null {
  if (days === null) return null;
  if (days === 0) return "On the renewal date";
  const n = Math.abs(days);
  return days > 0 ? `${n} day${n === 1 ? "" : "s"} before renewal` : `${n} day${n === 1 ? "" : "s"} after renewal`;
}

/** Short readable summary of a signal's facts: `key: value` pairs, nested values stringified. */
export function factsSummary(facts: Record<string, unknown>, max = 3): string[] {
  return Object.entries(facts)
    .filter(([, v]) => v !== null && v !== undefined && v !== "")
    .slice(0, max)
    .map(([k, v]) => `${k.replaceAll("_", " ")}: ${Array.isArray(v) ? v.join(", ") : typeof v === "object" ? JSON.stringify(v) : String(v)}`);
}
