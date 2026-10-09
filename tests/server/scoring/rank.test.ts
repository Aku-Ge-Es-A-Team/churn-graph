import { describe, expect, test } from "bun:test";
import { buildRiskRows, ignoredSignals } from "../../../src/server/scoring/rank";
import { AS_OF, account, signal } from "../../helpers/signals";

describe("buildRiskRows", () => {
  const accounts = [
    account({ account: "C01", dashboard: "Green", annualValue: 149_940_000, renewalDate: "2026-12-15" }),
    account({ account: "C02", dashboard: "Yellow", annualValue: 99_750_000, renewalDate: "2027-03-01" }),
    account({ account: "C04", dashboard: "Green", annualValue: 33_600_000, renewalDate: "2026-11-05" }),
  ];
  const signals = [
    signal({ account: "C01", code: "A", weight: 3 }),
    signal({ account: "C01", code: "B", weight: 3 }),
    signal({ account: "C01", code: "C", weight: 2 }),
    signal({ account: "C04", code: "D", weight: 2 }),
    signal({ account: "C04", code: "E", weight: 2 }),
  ];

  test("ranks by score and builds every field of the row", () => {
    const rows = buildRiskRows(accounts, signals, AS_OF);
    expect(rows.map((r) => r.account)).toEqual(["C01", "C04", "C02"]);
    const c01 = rows[0];
    expect(c01).toMatchObject({ level: "Critical", score: 10, diverges: true, renewalDays: 75, p: 0.6, atRiskValue: 89_964_000, annualValue: 149_940_000 });
    expect(c01.topSignals.map((s) => s.code)).toEqual(["A", "B", "C"]);
    expect(rows[1]).toMatchObject({ account: "C04", level: "High", score: 6, diverges: true, renewalDays: 35 });
  });

  test("an account without signals is Safe with score 0, never NaN", () => {
    const c02 = buildRiskRows(accounts, signals, AS_OF).find((r) => r.account === "C02")!;
    expect(c02).toMatchObject({ level: "Safe", score: 0, diverges: false, topSignals: [] });
    expect(Number.isNaN(c02.atRiskValue)).toBe(false);
  });

  test("a missing renewal date does not break the ranking", () => {
    const rows = buildRiskRows([account({ account: "X1", renewalDate: null })], [signal({ account: "X1", code: "A", weight: 5 })], AS_OF);
    expect(rows[0]).toMatchObject({ renewalDays: null, score: 5, level: "High" });
  });

  test("tie-break: nearest renewal first, then larger annual value, then account id", () => {
    const tied = [
      account({ account: "B", annualValue: 100, renewalDate: "2027-05-01" }),
      account({ account: "A", annualValue: 100, renewalDate: "2027-05-01" }),
      account({ account: "C", annualValue: 900, renewalDate: "2027-05-01" }),
      account({ account: "D", annualValue: 100, renewalDate: "2027-04-01" }),
    ];
    const all = tied.map((a) => signal({ account: a.account, code: "X", weight: 3 }));
    expect(buildRiskRows(tied, all, AS_OF).map((r) => r.account)).toEqual(["D", "C", "A", "B"]);
  });

  test("does not mutate its input", () => {
    const accountsCopy = structuredClone(accounts);
    const signalsCopy = structuredClone(signals);
    buildRiskRows(accounts, signals, AS_OF);
    expect(accounts).toEqual(accountsCopy);
    expect(signals).toEqual(signalsCopy);
  });
});

describe("ignoredSignals", () => {
  test("reports signals of unknown accounts and signals with an invalid weight", () => {
    const accounts = [account({ account: "C01" })];
    const all = [
      signal({ account: "C01", code: "A", weight: 3 }),
      signal({ account: "C01", code: "B", weight: Number.NaN }),
      signal({ account: "P01", code: "A", weight: 3 }),
    ];
    const ignored = ignoredSignals(accounts, all);
    expect(ignored.unknownAccount.map((s) => s.account)).toEqual(["P01"]);
    expect(ignored.invalidWeight.map((s) => s.code)).toEqual(["B"]);
  });
});
