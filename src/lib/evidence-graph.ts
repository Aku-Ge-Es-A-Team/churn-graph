// F-12 evidence graph viewer: pure helpers that turn a GraphPayload into React Flow nodes/edges and lay them out
// with ELK (layered, left to right). No React or Next.js imports, so the logic is testable with `bun test`.
import type { GraphEdge, GraphNode, GraphPayload } from "@/types/graph";

/** PRD F-12: the viewer draws at most 80 nodes; bigger payloads get a warning instead of a hairball. */
export const MAX_GRAPH_NODES = 80;
export const NODE_WIDTH = 200;
export const NODE_HEIGHT = 58;

export const SOURCE_CATEGORIES = ["crm", "interactions", "usage", "tickets", "contracts", "decisions", "product", "other"] as const;
export type SourceCategory = (typeof SOURCE_CATEGORIES)[number];

/** Display name and colour per source category (legend + node border). Colour is never the only cue: the legend names it. */
export const SOURCE_STYLES: Record<SourceCategory, { label: string; color: string }> = {
  crm: { label: "CRM", color: "#2563eb" },
  interactions: { label: "Email & meetings", color: "#9333ea" },
  usage: { label: "Product usage", color: "#0891b2" },
  tickets: { label: "Support tickets", color: "#be185d" },
  contracts: { label: "Contracts & billing", color: "#0d9488" },
  decisions: { label: "Decision log", color: "#c2410c" },
  product: { label: "Bugs, releases & features", color: "#4d7c0f" },
  other: { label: "Other / derived", color: "#78716c" },
};

const FILE_CATEGORY: Record<string, SourceCategory> = {
  "crm_accounts.csv": "crm",
  "crm_contacts.csv": "crm",
  "contact_employment_history.csv": "crm",
  "crm_deals.csv": "crm",
  "employees.csv": "crm",
  "interactions.json": "interactions",
  "interactions.jsonl": "interactions",
  "product_usage_daily.csv": "usage",
  "outlets.csv": "usage",
  "support_tickets.csv": "tickets",
  "contracts_billing.csv": "contracts",
  "decision_log.csv": "decisions",
  "bugs.csv": "product",
  "releases.csv": "product",
  "features.csv": "product",
};

/** Source category of a `source_file`; unknown files fall back to `other` (neutral colour, never an error). */
export function sourceCategory(sourceFile: string | null | undefined): SourceCategory {
  if (!sourceFile) return "other";
  const file = sourceFile.split(/[\\/]/).pop() ?? sourceFile;
  return FILE_CATEGORY[file] ?? "other";
}

const DATE_KEYS = ["tanggal", "since", "sejak", "mulai", "selesai", "date"] as const;

/** First date-like property of a node or relationship, for labels. */
export function firstDate(props: Record<string, unknown>): string | null {
  for (const key of DATE_KEYS) {
    const v = props[key];
    if (typeof v === "string" && v.trim()) return v.slice(0, 10);
  }
  return null;
}

/** Short human label for a node: name, title or subject when present, else its ID. */
export function nodeTitle(node: GraphNode): string {
  for (const key of ["nama", "name", "judul", "subjek", "title"]) {
    const v = node.props[key];
    if (typeof v === "string" && v.trim()) return v;
  }
  return node.id;
}

export type EvidenceNodeData = {
  id: string;
  label: string;
  title: string;
  category: SourceCategory;
  highlighted: boolean;
  sourceFile: string;
  sourceId: string;
};

export type EvidenceEdgeData = {
  type: string;
  derived: boolean;
  label: string;
  sourceFile: string;
};

export type FlowNode = { id: string; type: "evidence"; position: { x: number; y: number }; data: EvidenceNodeData };
export type FlowEdge = { id: string; source: string; target: string; data: EvidenceEdgeData };

export type FlowGraph = {
  nodes: FlowNode[];
  edges: FlowEdge[];
  /** Edge IDs dropped because an endpoint is missing from the payload. */
  droppedEdges: string[];
  tooLarge: boolean;
  categories: SourceCategory[];
};

function edgeLabel(edge: GraphEdge): string {
  const parts = [edge.type];
  const date = firstDate(edge.props);
  if (date) parts.push(date);
  if (edge.derived && typeof edge.confidence === "number") parts.push(`conf ${edge.confidence.toFixed(2)}`);
  return parts.join(" · ");
}

/** Converts a payload into React Flow elements (positions are filled in by `layoutFlowGraph`). */
export function toFlowGraph(payload: GraphPayload, highlight: ReadonlySet<string> = new Set(payload.highlight)): FlowGraph {
  const ids = new Set(payload.nodes.map((n) => n.id));
  const nodes: FlowNode[] = payload.nodes.map((n) => ({
    id: n.id,
    type: "evidence",
    position: { x: 0, y: 0 },
    data: {
      id: n.id,
      label: n.label,
      title: nodeTitle(n),
      category: sourceCategory(n.source_file),
      highlighted: highlight.has(n.id),
      sourceFile: n.source_file,
      sourceId: n.source_id,
    },
  }));
  const droppedEdges: string[] = [];
  const edges: FlowEdge[] = [];
  for (const e of payload.edges) {
    if (!ids.has(e.source) || !ids.has(e.target)) {
      droppedEdges.push(e.id);
      continue;
    }
    edges.push({ id: e.id, source: e.source, target: e.target, data: { type: e.type, derived: e.derived, label: edgeLabel(e), sourceFile: e.source_file } });
  }
  const categories = SOURCE_CATEGORIES.filter((c) => nodes.some((n) => n.data.category === c));
  return { nodes, edges, droppedEdges, tooLarge: nodes.length > MAX_GRAPH_NODES, categories };
}

type ElkLike = {
  layout(graph: {
    id: string;
    layoutOptions: Record<string, string>;
    children: { id: string; width: number; height: number }[];
    edges: { id: string; sources: string[]; targets: string[] }[];
  }): Promise<{ children?: { id: string; x?: number; y?: number }[] }>;
};

/** Lays the graph out left to right with ELK `layered`. Returns new nodes with positions; edges are unchanged. */
export async function layoutFlowGraph(graph: FlowGraph, elk: ElkLike): Promise<FlowNode[]> {
  if (graph.nodes.length === 0) return [];
  const result = await elk.layout({
    id: "evidence",
    layoutOptions: {
      "elk.algorithm": "layered",
      "elk.direction": "RIGHT",
      "elk.layered.spacing.nodeNodeBetweenLayers": "90",
      "elk.spacing.nodeNode": "28",
      "elk.layered.nodePlacement.strategy": "BRANDES_KOEPF",
    },
    children: graph.nodes.map((n) => ({ id: n.id, width: NODE_WIDTH, height: NODE_HEIGHT })),
    edges: graph.edges.map((e) => ({ id: e.id, sources: [e.source], targets: [e.target] })),
  });
  const pos = new Map((result.children ?? []).map((c) => [c.id, { x: c.x ?? 0, y: c.y ?? 0 }]));
  return graph.nodes.map((n) => ({ ...n, position: pos.get(n.id) ?? n.position }));
}
