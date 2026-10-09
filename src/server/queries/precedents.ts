// Retention actions based on precedent (F-09): rule table (signal code → action → precedent decisions),
// precedent selection from the decision log, discount-limit deviation check, and cost vs at-risk value.
// The decision log lives in the graph as `:Keputusan` nodes (dataset vocabulary); values are translated to
// English here, at the boundary.
import {
  SIGNAL_CODES,
  type ActionType,
  type DecisionPrecedent,
  type DeviationCheck,
  type DiscountPolicy,
  type RetentionAction,
  type RetentionCard,
  type RiskRow,
  type Signal,
} from "../../types/graph";
import type { CypherRunner } from "./runner";

export type DecisionType = "discount" | "exception" | "feature_promise" | "escalation" | "other";
export type DecisionOutcome = "Approved" | "Rejected" | "Pending" | "Other";

export type Decision = {
  id: string;
  type: DecisionType;
  date: string;
  outcome: DecisionOutcome;
  valueText: string | null;
  valuePct: number | null;
  account: string | null;
  reason: string | null;
  evidenceInteractionId: string | null;
  /** Dataset text such as "Ditepati (rilis Feb 2026)" / "Belum ditepati" for feature promises. */
  promiseStatus: string | null;
  approver: { id: string; name: string; title: string } | null;
};

export type ContractTerms = { annualValue: number; discountPct: number | null };

const TYPE_FROM_DATA: Record<string, DecisionType> = { diskon: "discount", pengecualian: "exception", janji_fitur: "feature_promise", eskalasi: "escalation" };
const OUTCOME_FROM_DATA: Record<string, DecisionOutcome> = { Disetujui: "Approved", Ditolak: "Rejected", Menunggu: "Pending" };

const text = (v: unknown): string | null => (typeof v === "string" && v.trim() !== "" ? v : null);

export async function fetchDecisions(run: CypherRunner): Promise<Decision[]> {
  const rows = await run(
    `MATCH (d:Keputusan)
     OPTIONAL MATCH (e:Karyawan)-[:MENYETUJUI]->(d)
     OPTIONAL MATCH (d)-[j:MENJANJIKAN]->(:Fitur)
     RETURN d.id AS id, d.tipe AS type, d.tanggal AS date, d.keputusan AS outcome, d.nilai_teks AS valueText,
            d.nilai_persen AS valuePct, d.account_id AS account, d.alasan AS reason,
            d.bukti_interaction_id AS evidenceInteractionId, j.status_janji AS promiseStatus,
            e.id AS approverId, e.nama AS approverName, e.jabatan AS approverTitle
     ORDER BY date, id`,
  );
  return rows.map((r) => ({
    id: String(r.id),
    type: TYPE_FROM_DATA[String(r.type)] ?? "other",
    date: String(r.date ?? ""),
    outcome: OUTCOME_FROM_DATA[String(r.outcome)] ?? "Other",
    valueText: text(r.valueText),
    valuePct: typeof r.valuePct === "number" ? r.valuePct : null,
    account: text(r.account),
    reason: text(r.reason),
    evidenceInteractionId: text(r.evidenceInteractionId),
    promiseStatus: text(r.promiseStatus),
    approver: r.approverId ? { id: String(r.approverId), name: String(r.approverName ?? ""), title: String(r.approverTitle ?? "") } : null,
  }));
}

export async function fetchContractTerms(run: CypherRunner, account: string): Promise<ContractTerms | null> {
  const rows = await run(
    `MATCH (:Akun {id: $account})-[:MEMILIKI]->(k:Kontrak)
     RETURN k.nilai_tahunan AS annualValue, k.diskon_pct AS discountPct`,
    { account },
  );
  const r = rows[0];
  if (!r) return null;
  return { annualValue: typeof r.annualValue === "number" ? r.annualValue : 0, discountPct: typeof r.discountPct === "number" ? r.discountPct : null };
}

const byNewest = (a: Decision, b: Decision) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.id < b.id ? 1 : -1);

export function toPrecedent(d: Decision): DecisionPrecedent {
  return {
    decisionId: d.id,
    type: d.type,
    date: d.date,
    outcome: d.outcome,
    value: d.valueText,
    accountId: d.account,
    approver: d.approver,
    evidenceInteractionId: d.evidenceInteractionId,
    reason: d.reason,
  };
}

// --- Discount limit and deviation check ---

/**
 * The discount limit comes from the decision log, not from a constant: a rejected discount whose reason states
 * the limit ("Di atas batas 15%" — dataset wording) defines it; otherwise the highest approved discount is used.
 */
export function deriveDiscountPolicy(decisions: Decision[], currentPct: number | null): DiscountPolicy {
  const discounts = decisions.filter((d) => d.type === "discount");
  const stated = discounts
    .filter((d) => d.outcome === "Rejected" && d.reason)
    .map((d) => ({ d, match: /batas\s+(\d+(?:[.,]\d+)?)\s*%/i.exec(d.reason!) }))
    .filter((x): x is { d: Decision; match: RegExpExecArray } => x.match !== null)
    .sort((a, b) => (a.d.date < b.d.date ? -1 : 1))[0];
  const maxApproved = Math.max(0, ...discounts.filter((d) => d.outcome === "Approved").map((d) => d.valuePct ?? 0));
  const limitPct = stated ? Number(stated.match[1].replace(",", ".")) : maxApproved;
  return {
    limitPct,
    precedentId: stated?.d.id ?? null,
    currentPct,
    headroomPct: currentPct === null ? null : Math.max(0, limitPct - currentPct),
  };
}

/** A discount proposal above the limit deviates from precedent and needs a written justification. */
export function checkDiscountProposal(percent: number, policy: DiscountPolicy): DeviationCheck {
  if (!Number.isFinite(percent) || percent < 0) {
    return { deviates: false, requiresReason: false, message: "Enter a valid discount percentage.", precedentId: policy.precedentId };
  }
  if (percent > policy.limitPct) {
    const ref = policy.precedentId ? ` from precedent ${policy.precedentId}` : "";
    return {
      deviates: true,
      requiresReason: true,
      message: `Deviates${ref}: discounts above ${policy.limitPct}% have been rejected before. A written justification is required.`,
      precedentId: policy.precedentId,
    };
  }
  return { deviates: false, requiresReason: false, message: `Within the ${policy.limitPct}% precedent limit.`, precedentId: policy.precedentId };
}

// --- Rule table: signal code → action ---

/** Tie-break order when two actions have the same total weight. */
export const ACTION_PRIORITY: ActionType[] = [
  "BUG_ESCALATION_AND_COMPENSATION",
  "RECOVER_FEATURE_PROMISE",
  "PAYMENT_TERMS_REVIEW",
  "COMPETITIVE_RETENTION_REVIEW",
  "EXECUTIVE_OUTREACH",
];

/** Signal code (persisted vocabulary) → action type. Every code of the rule engine is mapped. */
export const ACTION_FOR_SIGNAL: Record<(typeof SIGNAL_CODES)[number], ActionType> = {
  CHAMPION_KELUAR: "EXECUTIVE_OUTREACH",
  JANJI_DILANGGAR: "RECOVER_FEATURE_PROMISE",
  KOMPETITOR_DISEBUT: "COMPETITIVE_RETENTION_REVIEW",
  OUTREACH_TAK_BERBALAS: "EXECUTIVE_OUTREACH",
  RISIKO_PEMBAYARAN: "PAYMENT_TERMS_REVIEW",
  TIKET_BUG_TAK_TERTAUT: "BUG_ESCALATION_AND_COMPENSATION",
  ANOMALI_USAGE_RILIS_BUG: "BUG_ESCALATION_AND_COMPENSATION",
  TIKET_TAK_DIREPRODUKSI: "BUG_ESCALATION_AND_COMPENSATION",
};

const isCompensation = (d: Decision) => d.type === "exception" && /gratis\s+\d+\s+bulan/i.test(d.valueText ?? ""); // dataset wording: "Gratis 1 bulan"
const isPaymentTerms = (d: Decision) => d.type === "exception" && /tempo bayar/i.test(d.valueText ?? ""); // dataset wording: "Tempo bayar 14 hari"

/** Precedent decisions per action type, newest first. Pure. */
export function selectPrecedents(type: ActionType, decisions: Decision[], policy: DiscountPolicy): Decision[] {
  const approved = decisions.filter((d) => d.outcome === "Approved");
  switch (type) {
    case "BUG_ESCALATION_AND_COMPENSATION":
      return [...approved.filter((d) => d.type === "escalation").sort(byNewest).slice(0, 3), ...approved.filter(isCompensation).sort(byNewest).slice(0, 1)];
    case "RECOVER_FEATURE_PROMISE":
      return approved.filter((d) => d.type === "feature_promise" && /^ditepati/i.test(d.promiseStatus ?? "")).sort(byNewest).slice(0, 3);
    case "COMPETITIVE_RETENTION_REVIEW": {
      const limit = decisions.find((d) => d.id === policy.precedentId);
      const top = approved.filter((d) => d.type === "discount").sort((a, b) => (b.valuePct ?? 0) - (a.valuePct ?? 0) || byNewest(a, b)).slice(0, 2);
      return limit ? [limit, ...top] : top;
    }
    case "PAYMENT_TERMS_REVIEW":
      return approved.filter(isPaymentTerms).sort(byNewest).slice(0, 3);
    case "EXECUTIVE_OUTREACH":
      return [];
  }
}

function actionCost(type: ActionType, annualValue: number): RetentionAction["cost"] {
  if (type === "BUG_ESCALATION_AND_COMPENSATION") return { amount: Math.round(annualValue / 12), basis: "1 free month = annual contract value / 12" };
  if (type === "COMPETITIVE_RETENTION_REVIEW") return { amount: Math.round(annualValue / 100), basis: "each extra 1 percentage point of discount = 1% of annual contract value" };
  return null;
}

const COPY: Record<ActionType, { title: string; rationale: string }> = {
  BUG_ESCALATION_AND_COMPENSATION: {
    title: "Escalate the open bug to Product and offer a compensation",
    rationale: "Usage dropped on a release that still has an open bug, and related tickets were never linked to it. This is a product problem, not churn: do not answer it with a retention discount.",
  },
  RECOVER_FEATURE_PROMISE: {
    title: "Recover the broken feature promise with a firm date",
    rationale: "A feature was promised in exchange for a concession and has not been delivered. Past promises were recovered once Product committed to a date.",
  },
  COMPETITIVE_RETENTION_REVIEW: {
    title: "Review the competitive threat before offering any extra discount",
    rationale: "A competitor was mentioned in a non-template conversation. Check the remaining discount headroom first: anything above the precedent limit needs a written justification.",
  },
  PAYMENT_TERMS_REVIEW: {
    title: "Review payment terms with Customer Success",
    rationale: "Repeated late payments in the last 12 months. Similar accounts were granted payment-term exceptions instead of price cuts.",
  },
  EXECUTIVE_OUTREACH: {
    title: "Re-establish contact at executive level",
    rationale: "The champion left or account-manager emails are going unanswered. The decision log has no matching precedent for this action.",
  },
};

/** Pure: assembles the card. Safe accounts get an empty action list (no fake card). */
export function buildRetentionCard(row: RiskRow, signals: Signal[], decisions: Decision[], terms: ContractTerms | null): RetentionCard {
  const base = { account: row.account, level: row.level, atRiskValue: row.atRiskValue, p: row.p, annualValue: terms?.annualValue ?? row.annualValue };
  if (row.level === "Safe") return { ...base, actions: [] };

  const policy = deriveDiscountPolicy(decisions, terms?.discountPct ?? null);
  const grouped = new Map<ActionType, Signal[]>();
  for (const s of signals) {
    const type = (ACTION_FOR_SIGNAL as Record<string, ActionType | undefined>)[s.code];
    if (type) grouped.set(type, [...(grouped.get(type) ?? []), s]);
  }

  const actions: RetentionAction[] = [...grouped.entries()]
    .map(([type, group]): RetentionAction => ({
      type,
      title: COPY[type].title,
      rationale: COPY[type].rationale,
      signalCodes: [...new Set(group.map((s) => s.code))].sort(),
      weight: group.reduce((sum, s) => sum + s.weight, 0),
      precedents: selectPrecedents(type, decisions, policy).map(toPrecedent),
      cost: actionCost(type, base.annualValue),
      ...(type === "COMPETITIVE_RETENTION_REVIEW" ? { discount: policy } : {}),
    }))
    .sort((a, b) => b.weight - a.weight || ACTION_PRIORITY.indexOf(a.type) - ACTION_PRIORITY.indexOf(b.type));

  return { ...base, actions };
}

export async function fetchRetentionCard(run: CypherRunner, row: RiskRow, signals: Signal[]): Promise<RetentionCard> {
  if (row.level === "Safe") return buildRetentionCard(row, signals, [], null);
  const [decisions, terms] = await Promise.all([fetchDecisions(run), fetchContractTerms(run, row.account)]);
  return buildRetentionCard(row, signals, decisions, terms);
}
