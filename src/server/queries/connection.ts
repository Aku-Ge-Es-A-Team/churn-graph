// Read queries behind the Q&A tools `search_text` and `find_connection` (F-14). Both go through the guarded runner.
// Graph vocabulary in the Cypher (Entitas, index teks_bebas) is stored as-is in Aura.
import type { CypherRunner } from "./runner";

export type TextHit = { id: string; label: string; score: number; props: Record<string, unknown> };

export const MAX_TEXT_HITS = 10;
export const MAX_HOPS = 4;

// Lucene special characters are replaced by spaces so a question never becomes a query syntax error.
const LUCENE_SPECIAL = /[+\-&|!(){}[\]^"~*?:\\/]/g;

export function sanitizeSearchText(text: string): string {
  return text.replace(LUCENE_SPECIAL, " ").replace(/\s+/g, " ").trim();
}

/** Full-text search over interactions and tickets (index `teks_bebas`). An empty query returns nothing. */
export async function searchText(run: CypherRunner, text: string, limit = 5): Promise<TextHit[]> {
  const query = sanitizeSearchText(text);
  if (!query) return [];
  const size = Math.max(1, Math.min(MAX_TEXT_HITS, Math.trunc(limit)));
  const rows = await run(
    `CALL db.index.fulltext.queryNodes('teks_bebas', $query) YIELD node, score
     RETURN node.id AS id, labels(node) AS labels, properties(node) AS props, score
     ORDER BY score DESC LIMIT ${size}`,
    { query },
  );
  return rows.map((r) => ({
    id: String(r.id),
    label: ((r.labels as string[]) ?? []).find((l) => l !== "Entitas") ?? "Entitas",
    score: Number(r.score),
    props: (r.props ?? {}) as Record<string, unknown>,
  }));
}

export type Connection = { found: boolean; hops: number; nodeIds: string[]; relationshipTypes: string[] };

/** Shortest path (at most 4 hops, any direction) between two entities, or `found: false`. */
export async function findConnection(run: CypherRunner, from: string, to: string): Promise<Connection> {
  const none: Connection = { found: false, hops: 0, nodeIds: [], relationshipTypes: [] };
  if (from === to) return none;
  const rows = await run(
    `MATCH (a:Entitas {id: $from}), (b:Entitas {id: $to})
     MATCH p = shortestPath((a)-[*..${MAX_HOPS}]-(b))
     RETURN [n IN nodes(p) | n.id] AS nodeIds, [r IN relationships(p) | type(r)] AS relationshipTypes
     LIMIT 1`,
    { from, to },
  );
  const row = rows[0];
  if (!row) return none;
  const nodeIds = (row.nodeIds as unknown[]).map(String);
  return { found: true, hops: nodeIds.length - 1, nodeIds, relationshipTypes: (row.relationshipTypes as unknown[]).map(String) };
}
