import { z } from "zod";

// Shared data contract between the server (graph queries, scoring) and the UI.
// Naming convention: identifiers and UI content are English. The graph vocabulary stored in Neo4j
// (labels such as `Akun`, relationship types such as `BEKERJA_DI`, signal codes such as `CHAMPION_KELUAR`)
// and the dataset column names follow the product documents and are intentionally NOT translated; the
// server queries translate them at the boundary (see docs/glossary.md).

// --- Graph payload (evidence subgraph) ---

export const GraphNodeSchema = z.object({
  id: z.string(),
  label: z.string(), // intentionally not a closed enum; the graph schema is owned by the data pipeline
  props: z.record(z.string(), z.unknown()),
  source_file: z.string().min(1),
  source_id: z.string().min(1),
});
export type GraphNode = z.infer<typeof GraphNodeSchema>;

export const GraphEdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  type: z.string(),
  props: z.record(z.string(), z.unknown()),
  source_file: z.string().min(1),
  source_id: z.string().min(1),
  derived: z.boolean(),
  rule: z.string().optional(),
  confidence: z.number().min(0).max(1).optional(),
});
export type GraphEdge = z.infer<typeof GraphEdgeSchema>;

export const GraphPayloadSchema = z.object({
  nodes: z.array(GraphNodeSchema),
  edges: z.array(GraphEdgeSchema),
  /** IDs of the nodes that belong to the selected evidence (highlighted in the UI). */
  highlight: z.array(z.string()),
  meta: z.object({
    account: z.string(),
    signal: z.string().optional(),
    nodeCount: z.number(),
    edgeCount: z.number(),
  }),
});
export type GraphPayload = z.infer<typeof GraphPayloadSchema>;

export function validateGraphPayload(payload: GraphPayload): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  const nodeIds = new Set<string>();
  for (const node of payload.nodes) {
    if (nodeIds.has(node.id)) errors.push(`duplicate node: ${node.id}`);
    nodeIds.add(node.id);
  }
  for (const edge of payload.edges) {
    if (!nodeIds.has(edge.source)) errors.push(`edge ${edge.id} points to a missing source: ${edge.source}`);
    if (!nodeIds.has(edge.target)) errors.push(`edge ${edge.id} points to a missing target: ${edge.target}`);
    if (!edge.source_file) errors.push(`edge ${edge.id} has no source_file`);
  }
  return { ok: errors.length === 0, errors };
}

// --- Signals (output of the rule engine, graph nodes `:Sinyal`) ---

/** Signal codes written by the rule engine (cypher/signals). Persisted values; see docs/glossary.md. */
export const SIGNAL_CODES = [
  "CHAMPION_KELUAR",
  "JANJI_DILANGGAR",
  "KOMPETITOR_DISEBUT",
  "OUTREACH_TAK_BERBALAS",
  "RISIKO_PEMBAYARAN",
  "TIKET_BUG_TAK_TERTAUT",
  "ANOMALI_USAGE_RILIS_BUG",
  "TIKET_TAK_DIREPRODUKSI",
] as const;
export type SignalCode = (typeof SIGNAL_CODES)[number];

export const SignalSchema = z.object({
  account: z.string(),
  code: z.string(),
  weight: z.number(),
  evidenceIds: z.array(z.string()).min(1),
  facts: z.record(z.string(), z.unknown()),
  since: z.iso.date(),
});
export type Signal = z.infer<typeof SignalSchema>;

/** Accounts of the "focus" filter (PRD: C01–C06). */
export const FOCUS_ACCOUNT_IDS = ["C01", "C02", "C03", "C04", "C05", "C06"] as const;

// --- Level and dashboard colour ---

export const LEVELS = ["Critical", "High", "Watch", "Safe"] as const;
export type Level = (typeof LEVELS)[number];

/** ASSUMPTION A15: churn probability per level used for the at-risk estimate. Not a model output. */
export const P_BY_LEVEL: Record<Level, number> = {
  Critical: 0.6,
  High: 0.4,
  Watch: 0.2,
  Safe: 0.05,
};

export const DASHBOARD_COLORS = ["Green", "Yellow", "Red"] as const;
export type DashboardColor = (typeof DASHBOARD_COLORS)[number];

// --- RiskRow (one row of the ranking board) ---

export const RiskRowSchema = z.object({
  account: z.string(),
  name: z.string(),
  dashboard: z.enum(DASHBOARD_COLORS),
  level: z.enum(LEVELS),
  score: z.number(),
  /** Dashboard says Green while the findings say High or Critical. */
  diverges: z.boolean(),
  renewalDays: z.number().nullable(),
  annualValue: z.number(),
  /** annualValue × p(level), in IDR. Always an ESTIMATE. */
  atRiskValue: z.number(),
  p: z.number(),
  topSignals: z.array(SignalSchema).max(3),
});
export type RiskRow = z.infer<typeof RiskRowSchema>;

// --- Account explanation (F-07) ---

export type RuleStatus = "triggered" | "clear";
export type AccountExplanation = {
  account: string;
  name: string;
  level: Level;
  /** "consistent" = level Safe (no material finding); otherwise "at_risk". */
  status: "consistent" | "at_risk";
  rules: { code: string; status: RuleStatus; weight: number | null }[];
  /** Z1: tickets of category "feature request" are never counted as negative signals. */
  featureRequestTickets: { count: number; ticketIds: string[]; titles: { id: string; title: string }[] };
};

// --- Retention action card (F-09). Promoted from the module-local type (proposal T08-06). ---

export type DecisionPrecedent = {
  decisionId: string;
  type: string;
  date: string;
  outcome: string;
  value: string | null;
  accountId: string | null;
  approver: { id: string; name: string; title: string } | null;
  evidenceInteractionId: string | null;
  reason: string | null;
};

export type DiscountPolicy = {
  /** Highest discount percentage ever approved or stated as the limit in the decision log. */
  limitPct: number;
  /** The decision that states the limit (e.g. a rejected request "above the 15% limit"). */
  precedentId: string | null;
  currentPct: number | null;
  headroomPct: number | null;
};

export type ActionType =
  | "BUG_ESCALATION_AND_COMPENSATION"
  | "RECOVER_FEATURE_PROMISE"
  | "COMPETITIVE_RETENTION_REVIEW"
  | "PAYMENT_TERMS_REVIEW"
  | "EXECUTIVE_OUTREACH";

export type RetentionAction = {
  type: ActionType;
  title: string;
  rationale: string;
  signalCodes: string[];
  weight: number;
  precedents: DecisionPrecedent[];
  /** Estimated cost in IDR (null when the action has no monetary cost). */
  cost: { amount: number; basis: string } | null;
  discount?: DiscountPolicy;
};

export type RetentionCard = {
  account: string;
  level: Level;
  atRiskValue: number;
  p: number;
  annualValue: number;
  /** Empty when there is nothing to recommend (e.g. level Safe). */
  actions: RetentionAction[];
};

export type DeviationCheck = {
  deviates: boolean;
  requiresReason: boolean;
  message: string;
  precedentId: string | null;
};

// --- Claims and answers of the Q&A feature (basis of the citation validator) ---

export const ClaimSchema = z.object({
  text: z.string(),
  evidenceIds: z.array(z.string()),
  quote: z.string().optional(),
});
export type Claim = z.infer<typeof ClaimSchema>;

export const AskResponseSchema = z.object({
  answer: z.string(),
  claims: z.array(ClaimSchema),
});
export type AskResponse = z.infer<typeof AskResponseSchema>;
