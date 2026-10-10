import { describe, expect, test } from "bun:test";
import { atRiskRenewingWithin, commonSignals, renewalsByMonth } from "@/lib/dashboard";
import type { RiskRow } from "@/types/graph";

const row = (account: string, level: RiskRow["level"], renewalDays: number | null, atRiskValue: number, codes: string[] = []): RiskRow => ({
  account,
  name: account,
  dashboard: "Green",
  level,
  score: 0,
  diverges: false,
  renewalDays,
  annualValue: atRiskValue * 2,
  atRiskValue,
  p: 0.5,
  topSignals: codes.map((code) => ({ account, code, weight: 1, since: "2026-01-01", evidenceIds: [], facts: {} })),
});

const snapshot = new Date("2026-10-01T00:00:00Z");
const rows = [
  row("C01", "Critical", 75, 90, ["A", "B"]),
  row("C04", "High", 35, 13, ["B"]),
  row("C03", "High", 111, 27, ["C"]),
  row("C10", "Safe", 5, 1),
  row("C11", "Safe", null, 1),
];

describe("renewalsByMonth", () => {
  test("12 months from the snapshot month, counted per level", () => {
    const months = renewalsByMonth(rows, snapshot);
    expect(months).toHaveLength(12);
    expect(months[0]).toMatchObject({ key: "2026-10", label: "Oct 26", Safe: 1 });
    expect(months[1]).toMatchObject({ key: "2026-11", High: 1 }); // 35 days → Nov 5
    expect(months[2]).toMatchObject({ key: "2026-12", Critical: 1 }); // 75 days → Dec 15
    expect(months[3]).toMatchObject({ key: "2027-01", High: 1 }); // 111 days → Jan 20
  });
});

describe("atRiskRenewingWithin", () => {
  test("only accounts above Safe inside the window", () => {
    expect(atRiskRenewingWithin(rows, 90)).toEqual({ value: 103, accounts: 2 });
  });
});

describe("commonSignals", () => {
  test("share of flagged accounts per signal, most common first", () => {
    const top = commonSignals(rows);
    expect(top[0]).toEqual({ code: "B", accounts: 2, share: 2 / 3 });
    expect(top.map((s) => s.code)).toEqual(["B", "A", "C"]);
  });
});
