// "Source A vs Source B" comparison (F-06): groups the records that touch a selected node by their primary source file.
// Pure function over a GraphPayload; the graph viewer slot (F-12) is not required.
import type { GraphEdge, GraphNode, GraphPayload } from "@/types/graph";

export type SourceRecord = {
  kind: "relationship";
  id: string;
  title: string;
  detail: string;
  sourceFile: string;
  sourceId: string | null;
  /** First date-like property, or null when there is none. */
  date: string | null;
};

export type SourceGroup = { sourceFile: string; records: SourceRecord[] };

export type SourceComparison = {
  sourceA: SourceGroup;
  sourceB: SourceGroup;
  other: SourceGroup[];
};

// Display order of primary sources (ASSUMPTION): CRM claims first, then supporting systems. Unknown files follow, in order of appearance.
const SOURCE_ORDER = [
  "crm_accounts.csv",
  "crm_contacts.csv",
  "contact_employment_history.csv",
  "crm_deals.csv",
  "interactions.jsonl",
  "interactions.json",
  "support_tickets.csv",
  "contracts_billing.csv",
  "decision_log.csv",
  "product_usage_daily.csv",
  "outlets.csv",
  "bugs.csv",
  "releases.csv",
  "features.csv",
  "employees.csv",
];

// Date-like property names as stored in the graph (dataset vocabulary).
const DATE_KEYS = ["tanggal", "mulai", "selesai", "dibuat", "sejak", "diselesaikan", "tanggal_rilis", "tanggal_renewal"];

export function firstDate(props: Record<string, unknown>): string | null {
  for (const key of DATE_KEYS) {
    const v = props[key];
    if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 10);
  }
  return null;
}

function summarize(props: Record<string, unknown>): string {
  return Object.entries(props)
    .filter(([, v]) => v !== null && v !== undefined && typeof v !== "object")
    .slice(0, 4)
    .map(([k, v]) => `${k}: ${String(v)}`)
    .join(" · ");
}

function toRecord(edge: GraphEdge, nodeId: string): SourceRecord {
  const other = edge.source === nodeId ? edge.target : edge.source;
  const arrow = edge.source === nodeId ? `${edge.type} → ${other}` : `${other} → ${edge.type}`;
  return {
    kind: "relationship",
    id: edge.id,
    title: arrow,
    detail: summarize(edge.props),
    sourceFile: edge.source_file || "—",
    sourceId: edge.source_id || null,
    date: firstDate(edge.props),
  };
}

/**
 * Records = relationships that touch the node, excluding derived ones (derived relationships are not a source).
 * Returns null when fewer than two different source files are involved ("only one source").
 */
export function compareSources(payload: GraphPayload, nodeId: string): SourceComparison | null {
  const records = payload.edges.filter((e) => !e.derived && (e.source === nodeId || e.target === nodeId)).map((e) => toRecord(e, nodeId));

  const groups = new Map<string, SourceRecord[]>();
  for (const r of records) groups.set(r.sourceFile, [...(groups.get(r.sourceFile) ?? []), r]);
  if (groups.size < 2) return null;

  const rank = (file: string) => {
    const i = SOURCE_ORDER.indexOf(file);
    return i === -1 ? SOURCE_ORDER.length : i;
  };
  const ordered = [...groups.entries()]
    .map(([sourceFile, recs], appearance) => ({ sourceFile, records: recs, appearance }))
    .sort((a, b) => rank(a.sourceFile) - rank(b.sourceFile) || a.appearance - b.appearance)
    .map(({ sourceFile, records: recs }) => ({ sourceFile, records: recs }));

  return { sourceA: ordered[0], sourceB: ordered[1], other: ordered.slice(2) };
}

export function nodeProperties(node: GraphNode): [string, string][] {
  return Object.entries(node.props)
    .filter(([, v]) => v !== null && v !== undefined)
    .map(([k, v]) => [k, typeof v === "object" ? JSON.stringify(v) : String(v)]);
}
