// Helpers for tests that need Aura. Read-only tests run when NEO4J_URI is set; tests that WRITE to/delete from the shared graph
// (rebuild, derive, repeated signals) only run when AURA_MUTATE=1, so a plain `bun test` does not disturb teammates
// who are reading the same graph.
import type { Driver } from "neo4j-driver";
import { createDriver, neo4j } from "../../scripts/lib/neo4j";
import { toPlainValue } from "../../src/server/neo4j-values";

export const HAS_AURA = Boolean(process.env.NEO4J_URI?.trim() && process.env.NEO4J_USERNAME?.trim() && process.env.NEO4J_PASSWORD?.trim());
export const CAN_WRITE = HAS_AURA && process.env.AURA_MUTATE === "1";

/** Single golden constant (F-03 §9 / F-04 §9): 14 BUG-412 candidate tickets = C03 8 + C05 6. Tegar's version 7 + 4 is still unanswered (PRD §8 no. 3). */
export const CANDIDATE_GOLDEN = { total: 14, C03: 8, C05: 6 } as const;

export function openDriver(): Driver {
  return createDriver();
}

export async function queryAura<T = Record<string, unknown>>(driver: Driver, cypher: string, params: Record<string, unknown> = {}): Promise<T[]> {
  const s = driver.session({ defaultAccessMode: neo4j.session.READ });
  try {
    const r = await s.run(cypher, params);
    return r.records.map((x) => toPlainValue(x.toObject()) as T);
  } finally {
    await s.close();
  }
}
