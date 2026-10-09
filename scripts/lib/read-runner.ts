// Read-only Cypher runner for the manual validation scripts: same guard, READ session and 5 s timeout as readCypher.
import type { Driver } from "neo4j-driver";
import { guardCypher } from "../../src/server/cypher-guard";
import { toPlainValue } from "../../src/server/neo4j-values";
import { neo4j } from "./neo4j";

export function createReadRunner(driver: Driver) {
  return async (query: string, params: Record<string, unknown> = {}) => {
    const guarded = guardCypher(query, { maxLimit: 200 });
    if (!guarded.ok) throw new Error(guarded.reason);
    const session = driver.session({ defaultAccessMode: neo4j.session.READ });
    try {
      const result = await session.executeRead((tx) => tx.run(guarded.query, params), { timeout: 5000 });
      return result.records.map((r) => toPlainValue(r.toObject()) as Record<string, unknown>);
    } finally {
      await session.close();
    }
  };
}
