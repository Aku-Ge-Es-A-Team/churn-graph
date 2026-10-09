// JEV AI judgement layer for the retention card (F-09). The rules still decide WHICH actions are candidates, their cost,
// the precedents and the 15% deviation check. JEV only judges: which candidate to do first, how urgent each is, whether a
// discount fits, and how comparable each precedent is. Any failure leaves the rule-based card untouched.
import type { RetentionAction, RetentionCard, RiskRow, Signal } from "../../types/graph";
import type { JevAnswer, JevAnswers, JevJudge, JevQuestion } from "../ai/jev";

/** Below this confidence the "first action" choice is not trusted and the rule order is kept (flagged for review). */
export const JEV_MIN_CONFIDENCE = 0.6;
const MAX_URGENCY = 3;

const URGENCY_LEVELS = [
  "Can wait until after the renewal",
  "Should be done before the renewal",
  "Should be done within the next two weeks",
  "Needs immediate attention",
];

const noul = (a: JevAnswer | undefined) => (a?.type === "noul" ? a.noul : null);
const score = (a: JevAnswer | undefined) => (a?.type === "score" ? a.score : null);
const round = (n: number) => Math.round(n * 100) / 100;

const urgencyKey = (type: string) => `urgency_${type}`;
const fitKey = (type: string, decisionId: string) => `fit_${type}_${decisionId}`;

/** The state JEV sees: facts from the graph and rules only. No scores or levels computed by an LLM. */
export function buildJevState(card: RetentionCard, row: RiskRow, signals: Signal[]) {
  return {
    account: card.account,
    name: row.name,
    dashboard_status: row.dashboard,
    risk_level: card.level,
    days_to_renewal: row.renewalDays,
    annual_contract_value_idr: card.annualValue,
    signals: signals.map((s) => ({ code: s.code, weight: s.weight, since: s.since, facts: s.facts, evidence_ids: s.evidenceIds })),
    candidate_actions: card.actions.map((a) => ({ type: a.type, title: a.title, rationale: a.rationale, triggered_by: a.signalCodes })),
  };
}

export function buildJevQuestions(card: RetentionCard): Record<string, JevQuestion> {
  const questions: Record<string, JevQuestion> = {
    discount_appropriate: {
      type: "noul",
      instructions: "Is offering a retention discount an appropriate response to this account's situation?",
      criteria: { true: "The risk is about price or budget, so a discount addresses the cause", false: "The cause is not price (for example a product bug or a broken promise)" },
    },
  };
  if (card.actions.length >= 2) {
    questions.best_action = {
      type: "choice",
      instructions: "Which candidate action should Customer Success take FIRST for this account? Choose only among the candidate actions.",
      criteria: Object.fromEntries(card.actions.map((a) => [a.type, a.rationale])),
    };
  }
  for (const a of card.actions) {
    questions[urgencyKey(a.type)] = { type: "score", instructions: `How urgent is the action "${a.title}" for this account?`, criteria: URGENCY_LEVELS };
    for (const p of a.precedents) {
      questions[fitKey(a.type, p.decisionId)] = {
        type: "noul",
        instructions: {
          precedent: { id: p.decisionId, type: p.type, date: p.date, outcome: p.outcome, value: p.value, reason: p.reason, account: p.accountId },
          question: `Is \`precedent\` a comparable past decision for the action "${a.title}" on this account?`,
        },
      };
    }
  }
  return questions;
}

/** Pure: merges JEV answers into the card. The candidate set, costs and discount policy are never modified. */
export function mergeJudgement(card: RetentionCard, answers: JevAnswers): RetentionCard {
  const best = answers.best_action?.type === "choice" ? answers.best_action : null;
  const trusted = best !== null && best.confidence >= JEV_MIN_CONFIDENCE && card.actions.some((a) => a.type === best.choice);

  let actions: RetentionAction[] = card.actions.map((a) => {
    const urgency = score(answers[urgencyKey(a.type)]);
    const fits = new Map(a.precedents.map((p) => [p.decisionId, noul(answers[fitKey(a.type, p.decisionId)])]));
    const precedents = a.precedents
      .map((p) => ({ ...p, ...(fits.get(p.decisionId) != null ? { fit: round(fits.get(p.decisionId)!) } : {}) }))
      .sort((x, y) => (y.fit ?? -1) - (x.fit ?? -1)); // stable: precedents without a fit keep the rule order
    return { ...a, precedents, ...(urgency !== null ? { urgency: round(Math.min(Math.max(urgency, 0), MAX_URGENCY)) } : {}) };
  });

  let reordered = false;
  if (trusted && actions[0]?.type !== best.choice) {
    actions = [...actions.filter((a) => a.type === best.choice), ...actions.filter((a) => a.type !== best.choice)];
    reordered = true;
  }
  const suitability = noul(answers.discount_appropriate);
  return {
    ...card,
    actions,
    judgement: {
      source: "jev",
      confidence: best ? round(best.confidence) : null,
      reordered,
      needsReview: card.actions.length >= 2 && !trusted,
      discountSuitability: suitability === null ? null : round(suitability),
    },
  };
}

/** Asks JEV about the card. Returns the card unchanged when there is nothing to judge, no judge, or JEV fails. */
export async function judgeRetentionCard(card: RetentionCard, row: RiskRow, signals: Signal[], judge: JevJudge | null): Promise<RetentionCard> {
  if (!judge || card.actions.length === 0) return card;
  const answers = await judge(buildJevState(card, row, signals), buildJevQuestions(card));
  return answers ? mergeJudgement(card, answers) : card;
}
