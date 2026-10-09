import { describe, expect, test } from "bun:test";
import { summarizeRisk, summarySentence } from "../../src/lib/risk-summary";
import type { Level, RiskRow } from "../../src/types/graph";

const P: Record<Level, number> = { Critical: 0.6, High: 0.4, Watch: 0.2, Safe: 0.05 };
const row = (account: string, level: Level, annualValue: number): RiskRow => ({
  account,
  name: account,
  dashboard: "Green",
  level,
  score: 0,
  diverges: false,
  renewalDays: 30,
  annualValue,
  atRiskValue: annualValue * P[level],
  p: P[level],
  topSignals: [],
});

describe("summarizeRisk", () => {
  const rows = [
    row("C01", "Critical", 149_940_000),
    row("C03", "High", 68_040_000),
    row("C04", "High", 33_600_000),
    row("C05", "Watch", 95_760_000),
    row("C06", "Safe", 113_400_000),
  ];

  test("counts accounts per level in level order, including empty levels", () => {
    expect(summarizeRisk(rows).byLevel).toEqual([
      { level: "Critical", count: 1 },
      { level: "High", count: 2 },
      { level: "Watch", count: 1 },
      { level: "Safe", count: 1 },
    ]);
  });

  test("sums the at-risk estimate and annual value of the accounts above Safe only", () => {
    const s = summarizeRisk(rows);
    expect(s.needAttention).toBe(4);
    expect(s.atRiskTotal).toBeCloseTo(149_940_000 * 0.6 + 68_040_000 * 0.4 + 33_600_000 * 0.4 + 95_760_000 * 0.2);
    expect(s.annualValueNeedingAttention).toBe(149_940_000 + 68_040_000 + 33_600_000 + 95_760_000);
    expect(s.annualValueTotal).toBe(s.annualValueNeedingAttention + 113_400_000);
  });

  test("ignores non-finite values instead of producing NaN", () => {
    expect(summarizeRisk([{ ...row("X", "High", 10), atRiskValue: Number.NaN }]).atRiskTotal).toBe(0);
  });

  test("sentence names the non-empty levels", () => {
    expect(summarySentence(summarizeRisk(rows))).toBe("4 of 5 accounts need attention: 1 Critical, 2 High, 1 Watch.");
    expect(summarySentence(summarizeRisk([row("C02", "Safe", 1)]))).toBe("All 1 accounts are Safe.");
    expect(summarySentence(summarizeRisk([]))).toBe("No accounts to summarise yet.");
    expect(summarySentence(summarizeRisk([row("C01", "Critical", 1)]))).toBe("1 of 1 accounts needs attention: 1 Critical.");
  });
});
