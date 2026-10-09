import { describe, expect, test } from "bun:test";
import {
  LEVEL_STYLES,
  filterFocus,
  formatCompactIdr,
  impliedP,
  isDivergent,
  legendFromRows,
  renewalLabel,
  selectTopSignals,
  signalLabel,
} from "../../src/lib/ranking";
import { FOCUS_ACCOUNT_IDS, LEVELS, type RiskRow } from "../../src/types/graph";
import { signal } from "../helpers/signals";

const row = (account: string, level: RiskRow["level"], p: number): RiskRow => ({
  account, name: account, dashboard: "Green", level, score: 1, diverges: false, renewalDays: 10, annualValue: 100, atRiskValue: 100 * p, p, topSignals: [],
});

describe("selectTopSignals", () => {
  test("top three by weight, stable order, input untouched", () => {
    const input = [signal({ account: "C", code: "B", weight: 2 }), signal({ account: "C", code: "A", weight: 2 }), signal({ account: "C", code: "Z", weight: 5 }), signal({ account: "C", code: "Y", weight: 1 })];
    expect(selectTopSignals(input).map((s) => s.code)).toEqual(["Z", "A", "B"]);
    expect(input.map((s) => s.code)).toEqual(["B", "A", "Z", "Y"]);
  });

  test("empty list and non-finite weights are handled", () => {
    expect(selectTopSignals([])).toEqual([]);
    expect(selectTopSignals([signal({ account: "C", code: "A", weight: Number.NaN })])).toEqual([]);
  });
});

describe("isDivergent", () => {
  test("C01 (Green + Critical) diverges; C06 (Green + Safe) does not; case-insensitive", () => {
    expect(isDivergent("Green", "Critical")).toBe(true);
    expect(isDivergent("green", "High")).toBe(true);
    expect(isDivergent("Green", "Safe")).toBe(false);
    expect(isDivergent("Yellow", "Critical")).toBe(false);
  });
});

describe("renewalLabel", () => {
  test.each([
    [35, "in 35 days"],
    [1, "in 1 day"],
    [0, "today"],
    [-3, "3 days ago"],
    [null, "—"],
    [Number.NaN, "—"],
  ])("%p → %s", (days, label) => {
    expect(renewalLabel(days as number | null)).toBe(label);
  });
});

describe("formatCompactIdr", () => {
  test("89,964,000 → Rp 90.0M; thousands and billions; zero/negative/NaN → Rp 0", () => {
    expect(formatCompactIdr(89_964_000)).toBe("Rp 90.0M");
    expect(formatCompactIdr(5_670_000)).toBe("Rp 5.7M");
    expect(formatCompactIdr(2_500_000_000)).toBe("Rp 2.5B");
    expect(formatCompactIdr(12_345)).toBe("Rp 12K");
    for (const v of [0, -1, Number.NaN]) expect(formatCompactIdr(v)).toBe("Rp 0");
  });
});

describe("impliedP", () => {
  test("derives p from at-risk / annual; a zero annual value gives null (no bogus percentage)", () => {
    expect(impliedP(89_964_000, 149_940_000)).toBeCloseTo(0.6, 5);
    expect(impliedP(0, 0)).toBeNull();
  });
});

describe("legendFromRows and filterFocus", () => {
  const rows = [row("C01", "Critical", 0.6), row("C02", "Safe", 0.05), row("C06", "Safe", 0.05), row("C07", "Watch", 0.2)];

  test("one entry per level that occurs, p taken from the data, in level order", () => {
    expect(legendFromRows(rows)).toEqual([
      { level: "Critical", p: 0.6, count: 1 },
      { level: "Watch", p: 0.2, count: 1 },
      { level: "Safe", p: 0.05, count: 2 },
    ]);
    expect(legendFromRows([])).toEqual([]);
  });

  test("focus keeps only C01–C06; data without any focus account → empty list", () => {
    expect(filterFocus(rows, FOCUS_ACCOUNT_IDS).map((r) => r.account)).toEqual(["C01", "C02", "C06"]);
    expect(filterFocus([row("C07", "Safe", 0.05)], FOCUS_ACCOUNT_IDS)).toEqual([]);
  });
});

describe("labels and styles", () => {
  test("known signal codes get a label; unknown codes are shown as-is", () => {
    expect(signalLabel("CHAMPION_KELUAR")).toBe("Champion left");
    expect(signalLabel("SOMETHING_NEW")).toBe("SOMETHING_NEW");
  });

  test("every level has a style", () => {
    for (const level of LEVELS) expect(LEVEL_STYLES[level].badge.length).toBeGreaterThan(0);
  });
});
