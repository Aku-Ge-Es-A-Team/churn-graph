// F-09 retention actions based on precedent: pure rules + real decision log (read-only).
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import {
  ACTION_FOR_SIGNAL,
  buildRetentionCard,
  checkDiscountProposal,
  deriveDiscountPolicy,
  fetchContractTerms,
  fetchDecisions,
  selectPrecedents,
  type Decision,
} from "../../src/server/queries/precedents";
import { fetchRanking, fetchSignals } from "../../src/server/queries/risk";
import { SIGNAL_CODES, type RiskRow, type RetentionCard } from "../../src/types/graph";
import { HAS_GRAPH, openRunner } from "../helpers/runner";
import { signal } from "../helpers/signals";

const decision = (over: Partial<Decision> & Pick<Decision, "id">): Decision => ({
  type: "discount", date: "2025-01-01", outcome: "Approved", valueText: null, valuePct: null, account: null, reason: null,
  evidenceInteractionId: null, promiseStatus: null, approver: { id: "E01", name: "Approver", title: "VP Sales" }, ...over,
});

const LOG: Decision[] = [
  decision({ id: "D-1", valuePct: 12, valueText: "12%", date: "2024-02-12" }),
  decision({ id: "D-2", valuePct: 15, valueText: "15%", date: "2025-11-28", account: "C01" }),
  decision({ id: "D-3", valuePct: 20, valueText: "20%", outcome: "Rejected", date: "2025-03-04", reason: "Above the limit; per rule batas 15%; lost on price." }),
  decision({ id: "D-4", type: "escalation", valueText: "Fix", date: "2026-04-22" }),
  decision({ id: "D-5", type: "escalation", outcome: "Pending", date: "2026-07-14" }),
  decision({ id: "D-6", type: "exception", valueText: "Gratis 1 bulan", date: "2025-04-17" }),
  decision({ id: "D-7", type: "exception", valueText: "Tempo bayar 14 hari", date: "2026-03-03" }),
  decision({ id: "D-8", type: "feature_promise", promiseStatus: "Ditepati (rilis Feb 2026)", date: "2024-08-15" }),
  decision({ id: "D-9", type: "feature_promise", promiseStatus: "Belum ditepati", date: "2025-11-28" }),
];

describe("discount policy and deviation check (pure)", () => {
  const policy = deriveDiscountPolicy(LOG, 15);

  test("the limit is read from the decision log (a rejected request that states it), not from a constant", () => {
    expect(policy).toEqual({ limitPct: 15, precedentId: "D-3", currentPct: 15, headroomPct: 0 });
  });

  test("without a stated limit the highest approved discount is used", () => {
    const p = deriveDiscountPolicy(LOG.filter((d) => d.id !== "D-3"), null);
    expect(p).toEqual({ limitPct: 15, precedentId: null, currentPct: null, headroomPct: null });
  });

  test("20% deviates from the precedent and requires a reason; 15% and 10% do not", () => {
    expect(checkDiscountProposal(20, policy)).toMatchObject({ deviates: true, requiresReason: true, precedentId: "D-3" });
    expect(checkDiscountProposal(20, policy).message).toContain("D-3");
    expect(checkDiscountProposal(15, policy)).toMatchObject({ deviates: false, requiresReason: false });
    expect(checkDiscountProposal(10, policy).deviates).toBe(false);
  });

  test("error path: NaN and negative proposals never claim a deviation", () => {
    for (const bad of [Number.NaN, -5]) expect(checkDiscountProposal(bad, policy)).toMatchObject({ deviates: false, requiresReason: false });
  });
});

describe("selectPrecedents (pure)", () => {
  const policy = deriveDiscountPolicy(LOG, 15);
  const ids = (type: Parameters<typeof selectPrecedents>[0]) => selectPrecedents(type, LOG, policy).map((d) => d.id);

  test("bug escalation: approved escalations (newest first) plus the compensation; pending ones are skipped", () => {
    expect(ids("BUG_ESCALATION_AND_COMPENSATION")).toEqual(["D-4", "D-6"]);
  });

  test("feature promise: only promises that were kept", () => expect(ids("RECOVER_FEATURE_PROMISE")).toEqual(["D-8"]));
  test("payment terms: approved payment-term exceptions", () => expect(ids("PAYMENT_TERMS_REVIEW")).toEqual(["D-7"]));
  test("competitive review: the limit decision first, then the largest approved discounts", () => expect(ids("COMPETITIVE_RETENTION_REVIEW")).toEqual(["D-3", "D-2", "D-1"]));
  test("executive outreach has no precedent", () => expect(ids("EXECUTIVE_OUTREACH")).toEqual([]));

  test("every rule-engine signal code is mapped to an action", () => {
    for (const code of SIGNAL_CODES) expect(ACTION_FOR_SIGNAL[code]).toBeTruthy();
  });
});

describe("buildRetentionCard (pure)", () => {
  const row = (level: RiskRow["level"]): RiskRow => ({
    account: "X1", name: "X", dashboard: "Green", level, score: 5, diverges: false, renewalDays: 30, annualValue: 120_000_000, atRiskValue: 48_000_000, p: 0.4, topSignals: [],
  });

  test("a Safe account gets a defined empty card, not a fake one", () => {
    const card = buildRetentionCard(row("Safe"), [signal({ account: "X1", code: "RISIKO_PEMBAYARAN", weight: 2 })], LOG, null);
    expect(card.actions).toEqual([]);
  });

  test("an account with a bug signal gets escalation + compensation, costing one twelfth of the annual value", () => {
    const card = buildRetentionCard(row("High"), [signal({ account: "X1", code: "ANOMALI_USAGE_RILIS_BUG", weight: 2 })], LOG, { annualValue: 120_000_000, discountPct: 10 });
    expect(card.actions[0]).toMatchObject({ type: "BUG_ESCALATION_AND_COMPENSATION", cost: { amount: 10_000_000 } });
    expect(card.actions[0].discount).toBeUndefined();
  });

  test("actions are ordered by total weight, ties by priority; signals of the same action are summed", () => {
    const signals = [
      signal({ account: "X1", code: "TIKET_BUG_TAK_TERTAUT", weight: 1 }),
      signal({ account: "X1", code: "ANOMALI_USAGE_RILIS_BUG", weight: 2 }),
      signal({ account: "X1", code: "KOMPETITOR_DISEBUT", weight: 3 }),
    ];
    const card = buildRetentionCard(row("High"), signals, LOG, { annualValue: 120_000_000, discountPct: 15 });
    expect(card.actions.map((a) => [a.type, a.weight])).toEqual([["BUG_ESCALATION_AND_COMPENSATION", 3], ["COMPETITIVE_RETENTION_REVIEW", 3]]);
    expect(card.actions[1].discount).toMatchObject({ limitPct: 15, headroomPct: 0 });
  });

  test("a signal code without a mapping is ignored instead of crashing", () => {
    const card = buildRetentionCard(row("High"), [signal({ account: "X1", code: "UNKNOWN_CODE", weight: 3 })], LOG, null);
    expect(card.actions).toEqual([]);
  });
});

describe.skipIf(!HAS_GRAPH)("retention cards against the real decision log (read-only)", () => {
  let run: ReturnType<typeof openRunner>["run"];
  let close: () => Promise<void>;
  let rows: RiskRow[];
  let decisions: Decision[];

  beforeAll(async () => {
    const runner = openRunner();
    run = runner.run;
    close = runner.close;
    [rows, decisions] = await Promise.all([fetchRanking(run), fetchDecisions(run)]);
  });
  afterAll(() => close());

  const card = async (account: string): Promise<RetentionCard> => {
    const r = rows.find((x) => x.account === account)!;
    const [signals, terms] = await Promise.all([fetchSignals(run, account), fetchContractTerms(run, account)]);
    return buildRetentionCard(r, signals, decisions, terms);
  };

  test("the log has 30 decisions with approvers and English types/outcomes", () => {
    expect(decisions).toHaveLength(30);
    expect(new Set(decisions.map((d) => d.type))).toEqual(new Set(["discount", "exception", "feature_promise", "escalation"]));
    expect(new Set(decisions.map((d) => d.outcome))).toEqual(new Set(["Approved", "Rejected", "Pending"]));
    expect(decisions.find((d) => d.id === "D-2025-11")).toMatchObject({ valuePct: 15, account: "C01", approver: { id: "E01", title: "VP Sales" } });
  });

  test("the discount limit is 15% and comes from D-2025-02", () => {
    expect(deriveDiscountPolicy(decisions, 15)).toMatchObject({ limitPct: 15, precedentId: "D-2025-02", headroomPct: 0 });
  });

  test("C01: recover the promise (precedents kept promises, approved by Product) and a competitive review with no discount headroom", async () => {
    const c = await card("C01");
    const types = c.actions.map((a) => a.type);
    expect(types).toContain("RECOVER_FEATURE_PROMISE");
    expect(types).toContain("COMPETITIVE_RETENTION_REVIEW");
    const promise = c.actions.find((a) => a.type === "RECOVER_FEATURE_PROMISE")!;
    expect(promise.precedents.map((p) => p.decisionId).sort()).toEqual(["D-2024-05", "D-2026-01"]);
    expect(promise.precedents.every((p) => p.approver?.id === "E09")).toBe(true);
    const competitive = c.actions.find((a) => a.type === "COMPETITIVE_RETENTION_REVIEW")!;
    expect(competitive.discount).toMatchObject({ currentPct: 15, limitPct: 15, headroomPct: 0, precedentId: "D-2025-02" });
    expect(checkDiscountProposal(20, competitive.discount!).message).toContain("D-2025-02");
  });

  test("C03: bug escalation + compensation (not a discount), costing about Rp 5.67M against Rp 27.2M at risk", async () => {
    const c = await card("C03");
    expect(c.actions[0].type).toBe("BUG_ESCALATION_AND_COMPENSATION");
    expect(c.actions.some((a) => a.type === "COMPETITIVE_RETENTION_REVIEW")).toBe(false);
    expect(c.actions[0].cost?.amount).toBe(5_670_000);
    expect(c.atRiskValue).toBe(27_216_000);
    const precedentIds = c.actions[0].precedents.map((p) => p.decisionId);
    for (const id of ["D-2025-08", "D-2026-05", "D-2025-03"]) expect(precedentIds).toContain(id);
  });

  test("C04: payment-term precedents plus outreach", async () => {
    const c = await card("C04");
    const payment = c.actions.find((a) => a.type === "PAYMENT_TERMS_REVIEW")!;
    expect(payment.precedents.length).toBeGreaterThan(0);
    expect(payment.precedents.every((p) => p.type === "exception")).toBe(true);
    expect(c.actions.map((a) => a.type)).toContain("EXECUTIVE_OUTREACH");
  });

  test("error path: Safe accounts C02 and C06 get an empty card", async () => {
    for (const account of ["C02", "C06"]) expect((await card(account)).actions).toEqual([]);
  });

  test("every precedent on every card exists in the decision log with its approver (no invented precedents)", async () => {
    const known = new Map(decisions.map((d) => [d.id, d]));
    for (const r of rows.filter((x) => x.level !== "Safe")) {
      for (const action of (await card(r.account)).actions) {
        for (const p of action.precedents) {
          expect(known.has(p.decisionId)).toBe(true);
          expect(p.approver?.id).toBe(known.get(p.decisionId)!.approver?.id);
        }
      }
    }
  }, 60_000);
});
