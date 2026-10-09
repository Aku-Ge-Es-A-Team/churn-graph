// F-07: explanation for accounts without material findings, generic for every account.
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { buildExplanation, fetchAccountExplanation } from "../../src/server/queries/explanation";
import { fetchRanking, fetchSignals } from "../../src/server/queries/risk";
import { SIGNAL_CODES, type RiskRow, type Signal } from "../../src/types/graph";
import { HAS_GRAPH, openRunner } from "../helpers/runner";
import { signal } from "../helpers/signals";

const row = (account: string, level: RiskRow["level"]): RiskRow => ({
  account, name: `Account ${account}`, dashboard: "Green", level, score: 0, diverges: false, renewalDays: 30, annualValue: 100, atRiskValue: 5, p: 0.05, topSignals: [],
});

describe("buildExplanation (pure)", () => {
  test("Safe account with no signals: consistent, all eight rules checked and clear", () => {
    const e = buildExplanation(row("X1", "Safe"), [], []);
    expect(e.status).toBe("consistent");
    expect(e.rules.map((r) => r.code)).toEqual([...SIGNAL_CODES]);
    expect(e.rules.every((r) => r.status === "clear" && r.weight === null)).toBe(true);
    expect(e.featureRequestTickets).toEqual({ count: 0, ticketIds: [], titles: [] });
  });

  test("an account with findings is at_risk and shows the triggered rules with their weight", () => {
    const signals: Signal[] = [signal({ account: "X1", code: "CHAMPION_KELUAR", weight: 3 }), signal({ account: "X1", code: "CHAMPION_KELUAR", weight: 1, since: "2026-09-01" })];
    const e = buildExplanation(row("X1", "High"), signals, []);
    expect(e.status).toBe("at_risk");
    expect(e.rules.find((r) => r.code === "CHAMPION_KELUAR")).toEqual({ code: "CHAMPION_KELUAR", status: "triggered", weight: 4 });
  });

  test("Z1 tickets are listed with their IDs", () => {
    const e = buildExplanation(row("X1", "Safe"), [], [{ id: "T1", title: "Add export" }, { id: "T2", title: "Dark mode" }]);
    expect(e.featureRequestTickets.ticketIds).toEqual(["T1", "T2"]);
    expect(e.featureRequestTickets.count).toBe(2);
  });
});

describe.skipIf(!HAS_GRAPH)("explanation against the real graph (read-only)", () => {
  let run: ReturnType<typeof openRunner>["run"];
  let close: () => Promise<void>;
  let rows: RiskRow[];

  beforeAll(async () => {
    const runner = openRunner();
    run = runner.run;
    close = runner.close;
    rows = await fetchRanking(run);
  });
  afterAll(() => close());

  const explain = async (account: string) => {
    const r = rows.find((x) => x.account === account)!;
    return fetchAccountExplanation(run, r, await fetchSignals(run, account));
  };

  test("C02 is consistent and its 9 feature-request tickets are explained (Z1)", async () => {
    const e = await explain("C02");
    expect(e.status).toBe("consistent");
    expect(e.featureRequestTickets.count).toBe(9);
    expect(e.featureRequestTickets.ticketIds).toHaveLength(9);
    expect(e.featureRequestTickets.ticketIds.every((id) => /^T\d+$/.test(id))).toBe(true);
    expect(e.rules.every((r) => r.status === "clear")).toBe(true);
  });

  test("C06 is consistent with no feature-request tickets", async () => {
    const e = await explain("C06");
    expect(e.status).toBe("consistent");
    expect(e.rules).toHaveLength(8);
  });

  test("C01 is at risk with three triggered rules", async () => {
    const e = await explain("C01");
    expect(e.status).toBe("at_risk");
    expect(e.rules.filter((r) => r.status === "triggered").map((r) => r.code).sort()).toEqual(["CHAMPION_KELUAR", "JANJI_DILANGGAR", "KOMPETITOR_DISEBUT"]);
  });

  test("a sweep over all 40 accounts produces an explanation without errors", async () => {
    expect(rows).toHaveLength(40);
    for (const r of rows) {
      const e = await explain(r.account);
      expect(e.account).toBe(r.account);
      expect(["consistent", "at_risk"]).toContain(e.status);
      expect(e.status === "consistent").toBe(r.level === "Safe");
    }
  }, 120_000);

  test("error path: an unknown account has no ranking row, so the page can answer not-found", () => {
    expect(rows.find((r) => r.account === "ZZZ")).toBeUndefined();
  });
});
