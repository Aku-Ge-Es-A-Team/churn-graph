import { describe, expect, test } from "bun:test";
import { guardCypher } from "../../src/server/cypher-guard";

describe("guardCypher — lolos", () => {
  test("query baca sederhana dengan parameter", () => {
    const result = guardCypher("MATCH (a:Akun {id: $id}) RETURN a");
    expect(result.ok).toBe(true);
  });

  test("nama properti created_at dan settled tidak salah tolak", () => {
    const result = guardCypher(
      "MATCH (a) WHERE a.created_at > $x AND a.settled = true RETURN a.offset, a.dataset",
    );
    expect(result.ok).toBe(true);
  });

  test("kata terlarang di dalam string literal tidak memicu tolak", () => {
    const result = guardCypher(`MATCH (a) WHERE a.name = "create delete" RETURN a`);
    expect(result.ok).toBe(true);
  });

  test("procedure fulltext yang diizinkan lolos dan isi string tetap utuh", () => {
    const result = guardCypher(
      "CALL db.index.fulltext.queryNodes('teks', 'diskon') YIELD node RETURN node",
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.query).toContain("'teks'");
      expect(result.query).toContain("'diskon'");
    }
  });

  test("huruf campuran match/return tetap lolos", () => {
    const result = guardCypher("match (a) return a");
    expect(result.ok).toBe(true);
  });
});

describe("guardCypher — ditolak", () => {
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
    ["dua statement", "MATCH (a) RETURN a; MATCH (b) RETURN b"],
    ["komentar blok menyamarkan CREATE", "/* aman */ CREATE (a:Akun)"],
    ["komentar baris menyamarkan CREATE", "// aman\nCREATE (a:Akun)"],
    ["huruf besar-kecil campuran", "cReAtE (a:Akun)"],
    ["pemisah baris/tab antar kata kunci", "MATCH (a) DETACH\n\t DELETE a"],
  ])("%s ditolak", (_label: string, query: string) => {
    const result = guardCypher(query);
    expect(result.ok).toBe(false);
  });

  test("query kosong ditolak", () => {
    expect(guardCypher("").ok).toBe(false);
    expect(guardCypher("   ").ok).toBe(false);
  });
});

describe("guardCypher — LIMIT", () => {
  test("tanpa LIMIT ditambahkan default 200", () => {
    const result = guardCypher("MATCH (a) RETURN a");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.query).toMatch(/LIMIT 200$/);
  });

  test("LIMIT 5 dipertahankan", () => {
    const result = guardCypher("MATCH (a) RETURN a LIMIT 5");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.query).toMatch(/LIMIT 5$/);
  });

  test("LIMIT 100000 diturunkan ke batas maksimum 200", () => {
    const result = guardCypher("MATCH (a) RETURN a LIMIT 100000");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.query).toMatch(/LIMIT 200$/);
  });
});
