// Evidence API (F-08): induced subgraph over the evidence IDs of an account's signals.
// Graph vocabulary in the Cypher (Sinyal, Akun, BUKTI, PADA) is stored as-is in Aura; the result is the
// English GraphPayload contract.
import type { GraphEdge, GraphNode, GraphPayload } from "../../types/graph";
import type { CypherRunner } from "./runner";

const INTERNAL_NODE_PROPS = new Set(["id", "sumber", "source_file", "source_id"]);
const INTERNAL_EDGE_PROPS = new Set(["key", "derived", "rule", "confidence", "source_file", "source_id"]);

function omit(props: Record<string, unknown>, keys: ReadonlySet<string>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(props).filter(([k]) => !keys.has(k)));
}

/** All relationships between the given node IDs (induced subgraph), nodes de-duplicated by id. */
export async function fetchInducedSubgraph(run: CypherRunner, ids: string[]): Promise<{ nodes: GraphNode[]; edges: GraphEdge[] }> {
  const unique = [...new Set(ids)];
  if (unique.length === 0) return { nodes: [], edges: [] };

  const [nodeRows, edgeRows] = await Promise.all([
    run(`MATCH (n:Entitas) WHERE n.id IN $ids RETURN n.id AS id, labels(n) AS labels, properties(n) AS props ORDER BY id`, { ids: unique }),
    run(
      `MATCH (x:Entitas)-[r]->(y:Entitas)
       WHERE x.id IN $ids AND y.id IN $ids
       RETURN r.key AS id, x.id AS source, y.id AS target, type(r) AS type, properties(r) AS props
       ORDER BY id`,
      { ids: unique },
    ),
  ]);

  const nodes = new Map<string, GraphNode>();
  for (const r of nodeRows) {
    const id = String(r.id);
    if (nodes.has(id)) continue;
    const props = (r.props ?? {}) as Record<string, unknown>;
    nodes.set(id, {
      id,
      label: ((r.labels as string[]) ?? []).find((l) => l !== "Entitas") ?? "Entitas",
      props: omit(props, INTERNAL_NODE_PROPS),
      source_file: String(props.source_file ?? "(unknown)"),
      source_id: String(props.source_id ?? id),
    });
  }

  const edges = new Map<string, GraphEdge>();
  for (const r of edgeRows) {
    const id = String(r.id);
    if (edges.has(id)) continue;
    const props = (r.props ?? {}) as Record<string, unknown>;
    edges.set(id, {
      id,
      source: String(r.source),
      target: String(r.target),
      type: String(r.type),
      props: omit(props, INTERNAL_EDGE_PROPS),
      source_file: String(props.source_file ?? "(unknown)"),
      source_id: String(props.source_id ?? id),
      derived: props.derived === true,
      ...(typeof props.rule === "string" ? { rule: props.rule } : {}),
      ...(typeof props.confidence === "number" ? { confidence: props.confidence } : {}),
    });
  }
  return { nodes: [...nodes.values()], edges: [...edges.values()] };
}

export type EvidenceResult =
  | { status: "ok"; payload: GraphPayload }
  | { status: "account_not_found" }
  | { status: "signal_not_found" };

/**
 * Evidence subgraph of an account. With `code` only that signal's evidence is used, otherwise the union of all
 * signals of the account. An existing account without signals yields an empty payload (status ok).
 */
export async function fetchAccountEvidence(run: CypherRunner, account: string, code?: string): Promise<EvidenceResult> {
  const exists = await run(`MATCH (a:Akun {id: $account}) RETURN a.id AS id`, { account });
  if (exists.length === 0) return { status: "account_not_found" };

  const rows = await run(
    `MATCH (s:Sinyal)-[:PADA]->(:Akun {id: $account})
     WHERE $code IS NULL OR s.kode = $code
     OPTIONAL MATCH (s)-[:BUKTI]->(x:Entitas)
     RETURN DISTINCT x.id AS id
     ORDER BY id`,
    { account, code: code ?? null },
  );
  const ids = rows.map((r) => r.id).filter((id): id is string => typeof id === "string");
  if (code && rows.length === 0) return { status: "signal_not_found" };

  const { nodes, edges } = await fetchInducedSubgraph(run, ids);
  return {
    status: "ok",
    payload: {
      nodes,
      edges,
      highlight: ids,
      meta: { account, ...(code ? { signal: code } : {}), nodeCount: nodes.length, edgeCount: edges.length },
    },
  };
}
