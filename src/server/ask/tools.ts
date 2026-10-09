// The six fixed tools of "Ask the graph" (F-14). The LLM can reach the database only through these functions;
// there is deliberately no `run_cypher` tool (F-28, Could). Every tool registers the nodes and relationships its query
// returned in the EvidenceRegistry, which is what the citation validator (F-10) trusts later.
import { tool } from "ai";
import { z } from "zod";
import type { GraphPayload } from "../../types/graph";
import { findConnection, searchText } from "../queries/connection";
import { fetchAccountEvidence, fetchInducedSubgraph } from "../queries/evidence";
import { fetchDecisions } from "../queries/precedents";
import { fetchRanking, fetchSignals } from "../queries/risk";
import type { CypherRunner } from "../queries/runner";
import { EvidenceRegistry, evidenceFromGraphPayload } from "./evidence";

export const TOOL_NAMES = ["get_ranking", "get_account_signals", "get_evidence", "find_precedents", "search_text", "find_connection"] as const;

export type ToolContext = { run: CypherRunner; registry: EvidenceRegistry };

const MAX_STRING = 240;
const MAX_PROPS = 12;
const MAX_NODES = 40;
const MAX_EDGES = 60;

const clip = (v: unknown): unknown => (typeof v === "string" && v.length > MAX_STRING ? `${v.slice(0, MAX_STRING)}…` : v);

/** Keeps tool output small: at most 12 properties, long strings cut (token efficiency). */
export function compactProps(props: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(props)
      .filter(([k]) => k !== "source_file" && k !== "source_id")
      .slice(0, MAX_PROPS)
      .map(([k, v]) => [k, clip(v)]),
  );
}

const asPayload = (nodes: GraphPayload["nodes"], edges: GraphPayload["edges"]): GraphPayload => ({
  nodes,
  edges,
  highlight: [],
  meta: { account: "ask", nodeCount: nodes.length, edgeCount: edges.length },
});

/**
 * Loads the nodes (and the relationships between them) from the graph and registers them as citeable evidence.
 * `extraProps` adds computed values (score, weight) to a node's properties so the number check can find them.
 * Returns the IDs that can now be cited.
 */
export async function registerNodes(ctx: ToolContext, ids: string[], extraProps: Record<string, Record<string, unknown>> = {}): Promise<string[]> {
  const { nodes, edges } = await fetchInducedSubgraph(ctx.run, ids);
  const withExtras = nodes.map((n) => (extraProps[n.id] ? { ...n, props: { ...n.props, ...extraProps[n.id] } } : n));
  ctx.registry.add(evidenceFromGraphPayload(asPayload(withExtras, edges)));
  return [...nodes.map((n) => n.id), ...edges.map((e) => e.id)];
}

export function createAskTools(ctx: ToolContext) {
  return {
    get_ranking: tool({
      description: "Churn-risk ranking of customer accounts (score, level, renewal, value at risk in IDR - an estimate). Highest risk first.",
      inputSchema: z.object({
        focusOnly: z.boolean().optional().describe("Only the focus accounts C01-C06"),
        limit: z.number().int().min(1).max(20).optional().describe("Number of accounts, default 8"),
      }),
      execute: async ({ focusOnly, limit }) => {
        const rows = (await fetchRanking(ctx.run, { focus: focusOnly })).slice(0, limit ?? 8);
        const extras = Object.fromEntries(
          rows.map((r) => [r.account, { score: r.score, level: r.level, dashboard: r.dashboard, atRiskValue: r.atRiskValue, annualValue: r.annualValue, renewalDays: r.renewalDays }]),
        );
        const citeableIds = await registerNodes(ctx, rows.map((r) => r.account), extras);
        return { data: rows, note: "atRiskValue is an ESTIMATE (annual value x churn probability of the level).", citeableIds };
      },
    }),

    get_account_signals: tool({
      description: "Risk summary of one account (score, level, dashboard colour, renewal, estimated value at risk) plus its inconsistency signals with weight, since-date, facts and evidence IDs. Works for any account, with or without signals.",
      inputSchema: z.object({ account: z.string().min(1).max(40).describe("Account ID, e.g. C01 or C12") }),
      execute: async ({ account }) => {
        const [signals, ranking] = await Promise.all([fetchSignals(ctx.run, account), fetchRanking(ctx.run)]);
        const row = ranking.find((r) => r.account === account) ?? null;
        if (!row && signals.length === 0) return { data: { status: "account_not_found" }, citeableIds: [] as string[] };
        const extras = row
          ? { [account]: { score: row.score, level: row.level, dashboard: row.dashboard, atRiskValue: row.atRiskValue, annualValue: row.annualValue, renewalDays: row.renewalDays } }
          : {};
        const citeableIds = await registerNodes(ctx, [account, ...signals.flatMap((s) => s.evidenceIds)], extras);
        return { data: { summary: row, signals }, note: "atRiskValue is an ESTIMATE.", citeableIds };
      },
    }),

    get_evidence: tool({
      description: "Evidence subgraph of an account (nodes and relationships with their source files), optionally for one signal code.",
      inputSchema: z.object({
        account: z.string().min(1).max(40),
        signal: z.string().min(1).max(60).optional().describe("Signal code such as CHAMPION_KELUAR"),
      }),
      execute: async ({ account, signal }) => {
        const result = await fetchAccountEvidence(ctx.run, account, signal);
        if (result.status !== "ok") return { data: { status: result.status }, citeableIds: [] as string[] };
        const { payload } = result;
        ctx.registry.add(evidenceFromGraphPayload(payload));
        return {
          data: {
            nodes: payload.nodes.slice(0, MAX_NODES).map((n) => ({ id: n.id, label: n.label, source_file: n.source_file, props: compactProps(n.props) })),
            edges: payload.edges.slice(0, MAX_EDGES).map((e) => ({ id: e.id, type: e.type, from: e.source, to: e.target, derived: e.derived, confidence: e.confidence })),
            truncated: payload.nodes.length > MAX_NODES || payload.edges.length > MAX_EDGES,
          },
          citeableIds: [...payload.nodes.slice(0, MAX_NODES).map((n) => n.id), ...payload.edges.slice(0, MAX_EDGES).map((e) => e.id)],
        };
      },
    }),

    find_precedents: tool({
      description:
        "Past decisions from the decision log (discounts, exceptions, feature promises, escalations) with approver, value, reason, and for promises the promised feature and its status (promiseStatus, e.g. 'Belum ditepati'). " +
        "A feature promise can be attached to a decision of ANY type (e.g. a discount made in exchange for a feature), so type 'feature_promise' returns every decision that promised a feature. For a question about one account, pass account and leave type empty to see everything.",
      inputSchema: z.object({
        type: z.enum(["discount", "exception", "feature_promise", "escalation"]).optional(),
        account: z.string().min(1).max(40).optional().describe("Only decisions about this account"),
        limit: z.number().int().min(1).max(15).optional().describe("Default 8"),
      }),
      execute: async ({ type, account, limit }) => {
        const decisions = (await fetchDecisions(ctx.run))
          .filter((d) => (!type || d.type === type || (type === "feature_promise" && d.promisedFeature != null)) && (!account || d.account === account))
          .slice(-(limit ?? 8));
        const citeableIds = decisions.length ? await registerNodes(ctx, decisions.flatMap((d) => [d.id, d.promisedFeature, d.approver?.id, d.evidenceInteractionId].filter((id): id is string => !!id))) : [];
        return { data: decisions.map((d) => ({ ...d, reason: clip(d.reason) })), citeableIds };
      },
    }),

    search_text: tool({
      description: "Full-text search in interaction texts and tickets (e.g. a competitor name, a bug ID, a topic). Returns the best matches.",
      inputSchema: z.object({ query: z.string().min(2).max(120), limit: z.number().int().min(1).max(10).optional() }),
      execute: async ({ query, limit }) => {
        const hits = await searchText(ctx.run, query, limit ?? 5);
        const citeableIds = hits.length ? await registerNodes(ctx, hits.map((h) => h.id)) : [];
        return { data: hits.map((h) => ({ id: h.id, label: h.label, score: Number(h.score.toFixed(2)), props: compactProps(h.props) })), citeableIds };
      },
    }),

    find_connection: tool({
      description: "Shortest connection (at most 4 hops) between two entities in the graph, by their IDs.",
      inputSchema: z.object({ from: z.string().min(1).max(40), to: z.string().min(1).max(40) }),
      execute: async ({ from, to }) => {
        const connection = await findConnection(ctx.run, from, to);
        const citeableIds = connection.found ? await registerNodes(ctx, connection.nodeIds) : [];
        return { data: connection, citeableIds };
      },
    }),
  };
}
