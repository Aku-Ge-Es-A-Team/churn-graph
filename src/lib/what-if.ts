// F-29 (Could): what-if simulation. Turn signals off and recompute score, level and value at risk in the browser with
// the SAME F-05 scoring functions the server uses (no second formula).
import { accountScore, atRiskValue, divergesFromDashboard, levelFor } from "@/server/scoring/score";
import type { DashboardColor, Level, Signal } from "@/types/graph";

export const signalKey = (s: Pick<Signal, "code" | "since">) => `${s.code}|${s.since}`;

export type WhatIfResult = { score: number; level: Level; atRisk: number; p: number; diverges: boolean };

export function simulate(
  signals: Signal[],
  enabled: ReadonlySet<string>,
  account: { renewalDays: number | null; annualValue: number; dashboard: DashboardColor },
): WhatIfResult {
  const kept = signals.filter((s) => enabled.has(signalKey(s)));
  const score = accountScore(kept, account.renewalDays);
  const level = levelFor(score);
  const { p, amount } = atRiskValue(account.annualValue, level);
  return { score, level, atRisk: amount, p, diverges: divergesFromDashboard(account.dashboard, level) };
}
