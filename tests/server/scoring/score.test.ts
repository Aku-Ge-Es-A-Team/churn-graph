import { describe, expect, test } from "bun:test";
import { DEFAULT_CONFIG } from "../../../src/server/scoring/config";
import {
  accountScore,
  atRiskValue,
  daysToRenewal,
  divergesFromDashboard,
  levelFor,
  renewalFactor,
  topSignals,
} from "../../../src/server/scoring/score";
import { AS_OF, signal } from "../../helpers/signals";

describe("daysToRenewal", () => {
  test("C04 renews on 2026-11-05 → 35 days from the snapshot", () => {
    expect(daysToRenewal("2026-11-05", AS_OF)).toBe(35);
  });

  test("a past renewal gives negative days; the same day gives 0", () => {
    expect(daysToRenewal("2026-09-25", AS_OF)).toBe(-6);
    expect(daysToRenewal("2026-10-01", AS_OF)).toBe(0);
  });

  test("invalid or missing dates → null (no NaN)", () => {
    expect(daysToRenewal(null, AS_OF)).toBeNull();
    expect(daysToRenewal("", AS_OF)).toBeNull();
    expect(daysToRenewal("2026-02-30", AS_OF)).toBeNull();
    expect(daysToRenewal("01/11/2026", AS_OF)).toBeNull();
    expect(daysToRenewal("2026-11-05", new Date("nope"))).toBeNull();
  });
});

describe("renewalFactor", () => {
  test.each([
    [-10, 1.5],
    [0, 1.5],
    [60, 1.5],
    [61, 1.25],
    [120, 1.25],
    [121, 1.0],
    [400, 1.0],
  ])("%i days → factor %f", (days, expected) => {
    expect(renewalFactor(days)).toBe(expected);
  });

  test("no renewal date → neutral factor", () => {
    expect(renewalFactor(null)).toBe(1.0);
  });
});

describe("accountScore and levelFor", () => {
  test("no signals → score 0 and level Safe", () => {
    expect(accountScore([], 35)).toBe(0);
    expect(levelFor(0)).toBe("Safe");
  });

  test("score = Σ weight × renewal factor", () => {
    const signals = [signal({ account: "C01", code: "A", weight: 3 }), signal({ account: "C01", code: "B", weight: 5 })];
    expect(accountScore(signals, 75)).toBe(8 * 1.25);
  });

  test("a non-finite weight is ignored instead of poisoning the score", () => {
    const signals = [signal({ account: "C01", code: "A", weight: Number.NaN }), signal({ account: "C01", code: "B", weight: 2 })];
    expect(accountScore(signals, null)).toBe(2);
  });

  test.each([
    [10, "Critical"],
    [8, "Critical"],
    [7.99, "High"],
    [4.5, "High"],
    [4.49, "Watch"],
    [2, "Watch"],
    [1.99, "Safe"],
  ])("score %f → %s", (score, level) => {
    expect(levelFor(score)).toBe(level as ReturnType<typeof levelFor>);
  });

  test("thresholds are configurable", () => {
    const cfg = { ...DEFAULT_CONFIG, levelThresholds: { Critical: 100, High: 50, Watch: 10 } };
    expect(levelFor(10, cfg)).toBe("Watch");
  });
});

describe("divergesFromDashboard", () => {
  test.each([
    ["Green", "Critical", true],
    ["Green", "High", true],
    ["Green", "Watch", false],
    ["Green", "Safe", false],
    ["Yellow", "Critical", false],
    ["Red", "Critical", false],
  ] as const)("%s dashboard with level %s → %s", (dashboard, level, expected) => {
    expect(divergesFromDashboard(dashboard, level)).toBe(expected);
  });
});

describe("atRiskValue", () => {
  test.each([
    ["Critical", 0.6, 89_964_000],
    ["High", 0.4, 59_976_000],
    ["Watch", 0.2, 29_988_000],
    ["Safe", 0.05, 7_497_000],
  ] as const)("%s → p %f", (level, p, amount) => {
    expect(atRiskValue(149_940_000, level)).toEqual({ p, amount });
  });

  test("a zero, negative or NaN annual value gives 0 and never NaN", () => {
    for (const v of [0, -5, Number.NaN, Number.POSITIVE_INFINITY]) expect(atRiskValue(v, "High").amount).toBe(0);
  });
});

describe("topSignals", () => {
  const s = (code: string, weight: number, since: string) => signal({ account: "C01", code, weight, since });

  test("weight descending, then earlier since, then code; does not mutate the input", () => {
    const input = [s("B", 2, "2026-08-01"), s("A", 2, "2026-08-01"), s("C", 3, "2026-09-01"), s("D", 2, "2026-07-01")];
    const copy = [...input];
    expect(topSignals(input, 3).map((x) => x.code)).toEqual(["C", "D", "A"]);
    expect(input).toEqual(copy);
  });

  test("empty input → empty list", () => {
    expect(topSignals([])).toEqual([]);
  });
});
