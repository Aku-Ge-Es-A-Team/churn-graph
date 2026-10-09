// Read-only query runner for tests that need the real graph in Aura. Skipped (not failed) when NEO4J_* is not configured.
import type { Driver } from "neo4j-driver";
import { createDriver, neo4j } from "../../scripts/lib/neo4j";
import { toPlainValue } from "../../src/server/neo4j-values";
import type { CypherRunner } from "../../src/server/queries/runner";

export const HAS_GRAPH = Boolean(process.env.NEO4J_URI?.trim() && process.env.NEO4J_USERNAME?.trim() && process.env.NEO4J_PASSWORD?.trim());

export function openRunner(): { run: CypherRunner; close: () => Promise<void>; driver: Driver } {
  const driver = createDriver();
  const run: CypherRunner = async (query, params = {}) => {
    const session = driver.session({ defaultAccessMode: neo4j.session.READ });
    try {
      const result = await session.run(query, params);
      return result.records.map((r) => toPlainValue(r.toObject()) as Record<string, unknown>);
    } finally {
      await session.close();
    }
  };
  return { run, close: () => driver.close(), driver };
}
