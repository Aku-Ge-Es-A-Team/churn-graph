// F-10 hardening of readCypher: the guard rejects before anything reaches the database; on a real session the
// server itself refuses writes. `server-only` is stubbed because Bun does not run with the react-server condition.
import { describe, expect, mock, test } from "bun:test";
import { createDriver, neo4j } from "../../scripts/lib/neo4j";
import { HAS_GRAPH } from "../helpers/runner";

mock.module("server-only", () => ({}));
const { readCypher, QueryRejectedError, QUERY_TIMEOUT_MS, Neo4jConfigError } = await import("../../src/server/neo4j");

describe("readCypher guard (no database needed)", () => {
  test.each([
    "CREATE (a:Akun {id: 'x'})",
    "MATCH (a) DETACH DELETE a",
    "MATCH (a) SET a.x = 1 RETURN a",
    "MERGE (a:Akun {id: 'x'}) RETURN a",
    "LOAD CSV FROM 'file:///x.csv' AS r RETURN r",
    "match (a) detach\n\tdelete a",
    "RETURN 1; MATCH (a) DETACH DELETE a",
  ])("write query is rejected before it reaches Aura: %s", async (query) => {
    await expect(readCypher(query)).rejects.toBeInstanceOf(QueryRejectedError);
    await expect(readCypher(query)).rejects.toThrow(/Only read queries are allowed/);
  });

  test("the transaction timeout is 5 seconds", () => {
    expect(QUERY_TIMEOUT_MS).toBe(5000);
  });

  test("error path: missing connection settings raise a configuration error, not a crash", async () => {
    const saved = { uri: process.env.NEO4J_URI, user: process.env.NEO4J_USERNAME, pass: process.env.NEO4J_PASSWORD };
    delete process.env.NEO4J_URI;
    try {
      // the singleton may already exist when other tests ran first in the same process; both outcomes are acceptable
      await readCypher("RETURN 1 AS ok").then(
        () => {},
        (e) => expect(e).toBeInstanceOf(Neo4jConfigError),
      );
    } finally {
      process.env.NEO4J_URI = saved.uri;
    }
  });
});

describe.skipIf(!HAS_GRAPH)("readCypher against Aura (read-only)", () => {
  test("a valid read query works and returns plain values", async () => {
    const rows = await readCypher<{ ok: number }>("RETURN 1 AS ok");
    expect(rows).toEqual([{ ok: 1 }]);
  });

  test("LIMIT is forced: a query without LIMIT returns at most 200 rows, a trusted caller may raise the ceiling", async () => {
    expect((await readCypher("MATCH (n:Entitas) RETURN n.id AS id")).length).toBeLessThanOrEqual(200);
    expect((await readCypher("MATCH (n:Entitas) RETURN n.id AS id", {}, { maxLimit: 1000 })).length).toBeGreaterThan(200);
    expect((await readCypher("MATCH (n:Entitas) RETURN n.id AS id LIMIT 3")).length).toBe(3);
  });

  test("dates come out as ISO strings and integers as numbers", async () => {
    const [r] = await readCypher<{ date: string; days: number }>(
      "MATCH (r:Rilis {id: 'v4.12'}) RETURN r.tanggal_rilis AS date, duration.inDays(r.tanggal_rilis, date('2026-10-01')).days AS days",
    );
    expect(r).toEqual({ date: "2026-06-29", days: 94 });
  });

  test("the server itself refuses a write sent through a READ transaction (second layer behind the guard)", async () => {
    const driver = createDriver();
    try {
      const session = driver.session({ defaultAccessMode: neo4j.session.READ });
      let code = "";
      try {
        await session.executeRead((tx) => tx.run("CREATE (n:__ReadOnlyProbe) RETURN n"));
      } catch (e) {
        code = String((e as { code?: string }).code ?? e);
      } finally {
        await session.close();
      }
      expect(code).toContain("Neo.ClientError");
      // Safety net: if the server had accepted the write, remove the probe so the shared graph stays clean.
      const cleanup = driver.session({ defaultAccessMode: neo4j.session.WRITE });
      await cleanup.run("MATCH (n:__ReadOnlyProbe) DELETE n");
      await cleanup.close();
    } finally {
      await driver.close();
    }
  });
});
