// Golden test for the ranking (F-05 T05-05): reads the real graph (Aura) through the same query functions the app uses.
// Prerequisite: `bun run rebuild` has been run (graph + derived relationships + signals).
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { fetchRanking, fetchSignals } from "../../src/server/queries/risk";
import { FOCUS_ACCOUNT_IDS, type RiskRow } from "../../src/types/graph";
import { HAS_GRAPH, openRunner } from "../helpers/runner";

describe.skipIf(!HAS_GRAPH)("ranking against the real graph (read-only)", () => {
  let rows: RiskRow[];
  let byAccount: Map<string, RiskRow>;
  let close: () => Promise<void>;
  let run: ReturnType<typeof openRunner>["run"];

  beforeAll(async () => {
    const runner = openRunner();
    close = runner.close;
    run = runner.run;
    rows = await fetchRanking(run);
    byAccount = new Map(rows.map((r) => [r.account, r]));
  });
  afterAll(() => close());

  test("40 customer accounts, no prospects", () => {
    expect(rows).toHaveLength(40);
    expect(rows.some((r) => /^P\d+$/.test(r.account))).toBe(false);
  });

  test("C01 is ranked first with level Critical", () => {
    expect(rows[0].account).toBe("C01");
    expect(rows[0].level).toBe("Critical");
  });

  test("golden levels: C03 and C04 High, C05 Watch, C02 and C06 Safe", () => {
    expect(byAccount.get("C03")?.level).toBe("High");
    expect(byAccount.get("C04")?.level).toBe("High");
    expect(byAccount.get("C05")?.level).toBe("Watch");
    expect(byAccount.get("C02")?.level).toBe("Safe");
    expect(byAccount.get("C06")?.level).toBe("Safe");
  });

  test("order of the focus accounts: C01, C04, C03, C05, then the Safe ones", () => {
    const focus = rows.filter((r) => (FOCUS_ACCOUNT_IDS as readonly string[]).includes(r.account)).map((r) => r.account);
    expect(focus.slice(0, 4)).toEqual(["C01", "C04", "C03", "C05"]);
  });

  test("C01 diverges (dashboard Green, level Critical); Safe accounts and C03 (Yellow) do not", () => {
    expect(byAccount.get("C01")).toMatchObject({ dashboard: "Green", diverges: true });
    expect(byAccount.get("C04")?.diverges).toBe(true);
    expect(byAccount.get("C03")?.diverges).toBe(false);
    expect(byAccount.get("C06")?.diverges).toBe(false);
  });

  test("renewal days are computed against the snapshot date: C04 renews in 35 days", () => {
    expect(byAccount.get("C04")?.renewalDays).toBe(35);
    expect(byAccount.get("C01")?.renewalDays).toBe(75);
  });

  test("at-risk estimates follow annualValue × p: C01 ≈ Rp 90.0M, C03 ≈ Rp 27.2M", () => {
    expect(byAccount.get("C01")).toMatchObject({ annualValue: 149_940_000, p: 0.6, atRiskValue: 89_964_000 });
    expect(byAccount.get("C03")).toMatchObject({ annualValue: 68_040_000, p: 0.4, atRiskValue: 27_216_000 });
  });

  test("accounts outside C01–C06 are Safe, so the rules are not too loose", () => {
    const noisy = rows.filter((r) => !(FOCUS_ACCOUNT_IDS as readonly string[]).includes(r.account) && r.level !== "Safe");
    expect(noisy.map((r) => r.account)).toEqual([]);
  });

  test("the ranking is sorted by score, never NaN", () => {
    for (let i = 1; i < rows.length; i++) expect(rows[i - 1].score).toBeGreaterThanOrEqual(rows[i].score);
    for (const r of rows) expect(Number.isNaN(r.score) || Number.isNaN(r.atRiskValue)).toBe(false);
  });

  test("top signals are at most three per account and come from the rule engine", async () => {
    for (const r of rows) expect(r.topSignals.length).toBeLessThanOrEqual(3);
    const all = await fetchSignals(run);
    expect(all.length).toBeGreaterThan(0);
    expect(new Set(all.map((s) => s.account))).toEqual(new Set(["C01", "C03", "C04", "C05"]));
  });

  test("error path: a failing query surfaces as a rejection the page can handle", async () => {
    const failing = async () => {
      throw new Error("graph unavailable");
    };
    await expect(fetchRanking(failing)).rejects.toThrow("graph unavailable");
  });
});
