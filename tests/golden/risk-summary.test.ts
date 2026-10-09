// F-24 against the real graph (read-only): the summary is built from the same rows as the ranking board (F-05).
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { summarizeRisk, summarySentence } from "../../src/lib/risk-summary";
import { fetchRanking } from "../../src/server/queries/risk";
import type { RiskRow } from "../../src/types/graph";
import { HAS_GRAPH, openRunner } from "../helpers/runner";

describe.skipIf(!HAS_GRAPH)("risk summary on the real ranking (read-only)", () => {
  let close: () => Promise<void>;
  let rows: RiskRow[] = [];

  beforeAll(async () => {
    const runner = openRunner();
    close = runner.close;
    rows = await fetchRanking(runner.run);
  }, 60_000);
  afterAll(() => close());

  test("counts add up to the 40 accounts and the total matches the ranking rows", () => {
    const s = summarizeRisk(rows);
    console.log(summarySentence(s), `| at risk ${Math.round(s.atRiskTotal)} of ${s.annualValueNeedingAttention} | total ARR ${s.annualValueTotal}`);
    expect(s.accounts).toBe(40);
    expect(s.byLevel.reduce((n, l) => n + l.count, 0)).toBe(40);
    const expected = rows.filter((r) => r.level !== "Safe").reduce((sum, r) => sum + r.atRiskValue, 0);
    expect(s.atRiskTotal).toBeCloseTo(expected);
  });
});
