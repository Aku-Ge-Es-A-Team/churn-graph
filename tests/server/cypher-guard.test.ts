import { describe, expect, test } from "bun:test";
import { guardCypher } from "../../src/server/cypher-guard";

describe("guardCypher — accepted", () => {
  test("simple read query with a parameter", () => {
    expect(guardCypher("MATCH (a:Akun {id: $id}) RETURN a").ok).toBe(true);
  });

  test("property names such as created_at and settled are not rejected by mistake", () => {
    const result = guardCypher("MATCH (a) WHERE a.created_at > $x AND a.settled = true RETURN a.offset, a.dataset");
    expect(result.ok).toBe(true);
  });

  test("denied words inside a string literal do not trigger a rejection", () => {
    expect(guardCypher(`MATCH (a) WHERE a.name = "create delete" RETURN a`).ok).toBe(true);
  });

  test("the allowed full-text procedure passes and string contents stay intact", () => {
    const result = guardCypher("CALL db.index.fulltext.queryNodes('teks', 'diskon') YIELD node RETURN node");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.query).toContain("'teks'");
      expect(result.query).toContain("'diskon'");
    }
  });

  test("lower-case keywords are fine", () => {
    expect(guardCypher("match (a) return a").ok).toBe(true);
  });

  test("STARTS WITH is not mistaken for START", () => {
    expect(guardCypher("MATCH (a) WHERE a.id STARTS WITH 'C' RETURN a").ok).toBe(true);
  });
});

describe("guardCypher — rejected", () => {
  test.each([
    ["CREATE", "CREATE (a:Akun {id: 1})"],
    ["MERGE", "MERGE (a:Akun {id: 1}) RETURN a"],
    ["MATCH ... SET", "MATCH (a) SET a.x = 1 RETURN a"],
    ["MATCH ... DETACH DELETE", "MATCH (a) DETACH DELETE a"],
    ["REMOVE", "MATCH (a) REMOVE a.x RETURN a"],
    ["DROP", "DROP INDEX akun_id"],
    ["FOREACH", "FOREACH (x IN [1,2] | CREATE (a:Akun))"],
    ["LOAD CSV", "LOAD CSV FROM 'file:///x.csv' AS row RETURN row"],
    ["CALL apoc", "CALL apoc.cypher.doIt('x', {}) YIELD value RETURN value"],
    ["CALL dbms", "CALL dbms.components()"],
    ["two statements", "MATCH (a) RETURN a; MATCH (b) RETURN b"],
    ["block comment hiding CREATE", "/* harmless */ CREATE (a:Akun)"],
    ["line comment hiding CREATE", "// harmless\nCREATE (a:Akun)"],
    ["mixed case", "cReAtE (a:Akun)"],
    ["newline/tab between keywords", "MATCH (a) DETACH\n\t DELETE a"],
  ])("%s is rejected", (_label: string, query: string) => {
    expect(guardCypher(query).ok).toBe(false);
  });

  test("an empty query is rejected", () => {
    expect(guardCypher("").ok).toBe(false);
    expect(guardCypher("   ").ok).toBe(false);
  });

  test("the rejection carries a readable reason", () => {
    const result = guardCypher("MATCH (a) DETACH DELETE a");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/DELETE|DETACH/);
  });
});

describe("guardCypher — LIMIT", () => {
  test("a query without LIMIT gets the default of 200", () => {
    const result = guardCypher("MATCH (a) RETURN a");
    expect(result.ok && result.query).toMatch(/LIMIT 200$/);
  });

  test("LIMIT 5 is kept", () => {
    const result = guardCypher("MATCH (a) RETURN a LIMIT 5");
    expect(result.ok && result.query).toMatch(/LIMIT 5$/);
  });

  test("LIMIT 100000 is lowered to the maximum", () => {
    const result = guardCypher("MATCH (a) RETURN a LIMIT 100000");
    expect(result.ok && result.query).toMatch(/LIMIT 200$/);
  });

  test("the ceiling is configurable for trusted internal queries", () => {
    const result = guardCypher("MATCH (a) RETURN a", { maxLimit: 5000 });
    expect(result.ok && result.query).toMatch(/LIMIT 5000$/);
  });

  test("a LIMIT inside a string is not mistaken for the real one", () => {
    const result = guardCypher(`MATCH (a) WHERE a.name = 'x LIMIT 5' RETURN a`);
    expect(result.ok && result.query).toMatch(/LIMIT 200$/);
  });
});
