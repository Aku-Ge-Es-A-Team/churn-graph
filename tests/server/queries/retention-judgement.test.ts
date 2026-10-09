import { describe, expect, test } from "bun:test";
import type { JevAnswers, JevJudge } from "@/server/ai/jev";
import { buildJevQuestions, JEV_MIN_CONFIDENCE, judgeRetentionCard, mergeJudgement } from "@/server/queries/retention-judgement";
import type { DecisionPrecedent, RetentionAction, RetentionCard, RiskRow, Signal } from "@/types/graph";

const precedent = (decisionId: string): DecisionPrecedent => ({ decisionId, type: "escalation", date: "2026-01-01", outcome: "Approved", value: null, accountId: null, approver: null, evidenceInteractionId: null, reason: null });
const action = (type: RetentionAction["type"], precedents: DecisionPrecedent[] = []): RetentionAction => ({ type, title: type, rationale: `${type} rationale`, signalCodes: [], weight: 1, precedents, cost: null });
const card = (actions: RetentionAction[]): RetentionCard => ({ account: "C03", level: "High", atRiskValue: 100, p: 0.4, annualValue: 250, actions });
const row = { account: "C03", name: "Test", dashboard: "Green", renewalDays: 111, annualValue: 250 } as RiskRow;
const signals = [] as Signal[];

const choice = (name: string, confidence: number) => ({ type: "choice" as const, choice: name, probabilities: { [name]: 1 }, confidence });
const base = card([action("RECOVER_FEATURE_PROMISE", [precedent("D-1"), precedent("D-2")]), action("BUG_ESCALATION_AND_COMPENSATION")]);

describe("retention judgement (JEV AI)", () => {
  test("a confident first-action choice moves that action to the top; costs and candidates are untouched", () => {
    const answers: JevAnswers = {
      best_action: choice("BUG_ESCALATION_AND_COMPENSATION", 0.9),
      urgency_BUG_ESCALATION_AND_COMPENSATION: { type: "score", score: 2.7, confidence: 0.8 },
      discount_appropriate: { type: "noul", noul: 0.12 },
      "fit_RECOVER_FEATURE_PROMISE_D-2": { type: "noul", noul: 0.9 },
      "fit_RECOVER_FEATURE_PROMISE_D-1": { type: "noul", noul: 0.2 },
    };
    const merged = mergeJudgement(base, answers);

    expect(merged.actions.map((a) => a.type)).toEqual(["BUG_ESCALATION_AND_COMPENSATION", "RECOVER_FEATURE_PROMISE"]);
    expect(merged.actions[0]?.urgency).toBe(2.7);
    expect(merged.actions[1]?.precedents.map((p) => [p.decisionId, p.fit])).toEqual([["D-2", 0.9], ["D-1", 0.2]]);
    expect(merged.judgement).toEqual({ source: "jev", confidence: 0.9, reordered: true, needsReview: false, discountSuitability: 0.12 });
    expect(merged.atRiskValue).toBe(base.atRiskValue);
  });

  test("a low-confidence choice keeps the rule order and flags the card for review", () => {
    const merged = mergeJudgement(base, { best_action: choice("BUG_ESCALATION_AND_COMPENSATION", JEV_MIN_CONFIDENCE - 0.01), discount_appropriate: { type: "noul", noul: 0.5 } });
    expect(merged.actions.map((a) => a.type)).toEqual(["RECOVER_FEATURE_PROMISE", "BUG_ESCALATION_AND_COMPENSATION"]);
    expect(merged.judgement).toMatchObject({ reordered: false, needsReview: true });
  });

  test("an answer naming an action that is not a candidate is ignored", () => {
    const merged = mergeJudgement(base, { best_action: choice("EXECUTIVE_OUTREACH", 0.99) });
    expect(merged.actions.map((a) => a.type)).toEqual(["RECOVER_FEATURE_PROMISE", "BUG_ESCALATION_AND_COMPENSATION"]);
  });

  test("a single candidate asks no first-action question and is never flagged for review", () => {
    const single = card([action("BUG_ESCALATION_AND_COMPENSATION")]);
    expect(Object.keys(buildJevQuestions(single))).not.toContain("best_action");
    expect(mergeJudgement(single, { discount_appropriate: { type: "noul", noul: 0.1 } }).judgement?.needsReview).toBe(false);
  });

  test("fallback: no judge, a failing judge, or a card without actions returns the rule-based card unchanged", async () => {
    const failing: JevJudge = async () => null;
    expect(await judgeRetentionCard(base, row, signals, null)).toBe(base);
    expect(await judgeRetentionCard(base, row, signals, failing)).toBe(base);
    const empty = card([]);
    let called = false;
    expect(await judgeRetentionCard(empty, row, signals, async () => ((called = true), null))).toBe(empty);
    expect(called).toBe(false);
  });
});
