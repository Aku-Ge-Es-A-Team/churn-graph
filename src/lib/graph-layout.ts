// Evidence graph viewer (F-12): pure adapter from GraphPayload to React Flow nodes/edges, plus the ELK layout.
// No React, no server access. The viewer only ever draws the evidence subgraph, never the whole graph.
import type { Edge, Node } from "@xyflow/react";
import type { ELK as ElkInstance } from "elkjs/lib/elk-api";
import type { GraphEdge, GraphNode, GraphPayload } from "@/types/graph";
import { firstDate } from "./source-comparison";

/** v1 limit (F-12): a larger payload is refused with a warning instead of drawing a hairball. */
export const MAX_NODES = 80;
export const NODE_WIDTH = 190;
export const NODE_HEIGHT = 64;

export type SourceGroup = { key: string; label: string; color: string };

/** Display groups of the dataset files (ASSUMPTION: the 7 "sources" of F-12). Colour is never the only cue: the label is shown too. */
export const SOURCE_GROUPS: SourceGroup[] = [
  { key: "crm", label: "CRM", color: "#2563eb" },
  { key: "employment", label: "Employment history", color: "#9333ea" },
  { key: "interactions", label: "Interactions", color: "#0d9488" },
  { key: "support", label: "Support & bugs", color: "#dc2626" },
  { key: "contracts", label: "Contracts & billing", color: "#ca8a04" },
  { key: "decisions", label: "Decision log", color: "#ea580c" },
  { key: "product", label: "Product & usage", color: "#4b5563" },
];
/** Any file outside the map: neutral colour, never an error. */
export const NEUTRAL_GROUP: SourceGroup = { key: "other", label: "Other source", color: "#94a3b8" };

const FILE_TO_GROUP: Record<string, string> = {
  "crm_accounts.csv": "crm",
  "crm_contacts.csv": "crm",
  "crm_deals.csv": "crm",
  "contact_employment_history.csv": "employment",
  "interactions.jsonl": "interactions",
  "interactions.json": "interactions",
  "support_tickets.csv": "support",
  "bugs.csv": "support",
  "contracts_billing.csv": "contracts",
  "decision_log.csv": "decisions",
  "decision_log.xlsx": "decisions",
  "product_usage_daily.csv": "product",
  "outlets.csv": "product",
  "releases.csv": "product",
  "features.csv": "product",
  "employees.csv": "product",
};

export function sourceGroup(sourceFile: string): SourceGroup {
  const key = FILE_TO_GROUP[sourceFile];
  return SOURCE_GROUPS.find((g) => g.key === key) ?? NEUTRAL_GROUP;
}

export type EvidenceNodeData = { node: GraphNode; group: SourceGroup; highlighted: boolean } & Record<string, unknown>;
export type EvidenceFlowNode = Node<EvidenceNodeData, "evidence">;
export type EvidenceFlowEdge = Edge<{ edge: GraphEdge } & Record<string, unknown>>;

/** "TYPE · 2026-08-15", plus "· derived 0.8" for derived relationships. */
export function edgeLabel(edge: GraphEdge): string {
  const parts = [edge.type];
  const date = firstDate(edge.props);
  if (date) parts.push(date);
  if (edge.derived) parts.push(edge.confidence === undefined ? "derived" : `derived ${edge.confidence}`);
  return parts.join(" · ");
}

export type FlowGraph = {
  nodes: EvidenceFlowNode[];
  edges: EvidenceFlowEdge[];
  /** IDs of relationships dropped because an endpoint is not in the payload. */
  droppedEdges: string[];
  /** The payload exceeds MAX_NODES; nothing is returned to draw. */
  tooLarge: boolean;
};

export function toFlowGraph(payload: GraphPayload): FlowGraph {
  if (payload.nodes.length > MAX_NODES) return { nodes: [], edges: [], droppedEdges: [], tooLarge: true };

  const highlight = new Set(payload.highlight);
  const ids = new Set(payload.nodes.map((n) => n.id));
  const nodes: EvidenceFlowNode[] = payload.nodes.map((node) => ({
    id: node.id,
    type: "evidence",
    position: { x: 0, y: 0 },
    data: { node, group: sourceGroup(node.source_file), highlighted: highlight.has(node.id) },
  }));

  const edges: EvidenceFlowEdge[] = [];
  const droppedEdges: string[] = [];
  for (const edge of payload.edges) {
    if (!ids.has(edge.source) || !ids.has(edge.target)) {
      droppedEdges.push(edge.id);
      continue;
    }
    edges.push({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      label: edgeLabel(edge),
      // Derived relationships are dashed AND say "derived" in the label, so the cue does not rely on colour.
      style: edge.derived ? { strokeDasharray: "6 4" } : undefined,
      data: { edge },
    });
  }
  return { nodes, edges, droppedEdges, tooLarge: false };
}

let elkPromise: Promise<ElkInstance> | null = null;

/**
 * Lazy ELK instance. Bun (the test runner) defines `self`, which makes elkjs' bundled worker script believe it runs
 * inside a Web Worker and skip its exports; outside the browser `self` is hidden while ELK is constructed.
 */
function getElk(): Promise<ElkInstance> {
  elkPromise ??= (async () => {
    const scope = globalThis as { self?: unknown };
    const saved = scope.self;
    const hide = typeof window === "undefined";
    if (hide) scope.self = undefined;
    try {
      const { default: ELK } = await import("elkjs/lib/elk.bundled.js");
      return new ELK();
    } finally {
      if (hide) scope.self = saved;
    }
  })();
  return elkPromise;
}

/** ELK `layered`, left to right. Returns the nodes with positions; the input is not mutated. */
export async function layoutNodes(nodes: EvidenceFlowNode[], edges: EvidenceFlowEdge[]): Promise<EvidenceFlowNode[]> {
  if (nodes.length === 0) return [];
  const laidOut = await (await getElk()).layout({
    id: "root",
    layoutOptions: {
      "elk.algorithm": "layered",
      "elk.direction": "RIGHT",
      "elk.spacing.nodeNode": "28",
      "elk.layered.spacing.nodeNodeBetweenLayers": "110",
    },
    children: nodes.map((n) => ({ id: n.id, width: NODE_WIDTH, height: NODE_HEIGHT })),
    edges: edges.map((e) => ({ id: e.id, sources: [e.source], targets: [e.target] })),
  });
  const position = new Map((laidOut.children ?? []).map((c) => [c.id, { x: c.x ?? 0, y: c.y ?? 0 }]));
  return nodes.map((n) => ({ ...n, position: position.get(n.id) ?? n.position }));
}
