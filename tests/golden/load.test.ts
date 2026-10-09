// Golden test for the loader + schema (F-02, T02-04).
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import type { Driver } from "neo4j-driver";
import { BUILD_DIR, LABEL, RELATION_TYPES, RUNTIME_LABELS, RUNTIME_RELATION_TYPES, SCHEMA_FILE, compareCounts, countDb, countJsonl, readJsonl, runLoad, toNeo4jProps } from "../../scripts/load";
import { ConfigError, hostFromUri, readNeo4jEnv, splitStatements } from "../../scripts/lib/neo4j";
import type { EtlEdge, EtlNode } from "../../scripts/etl/types";
import { runFolder } from "../../scripts/run-cypher";
import { runSignals } from "../../scripts/signals";
import { CAN_WRITE, HAS_AURA, openDriver, queryAura } from "../helpers/aura";

const nodes = readJsonl<EtlNode>(`${BUILD_DIR}/nodes.jsonl`);
const edges = readJsonl<EtlEdge>(`${BUILD_DIR}/edges.jsonl`);

describe("loader: pure logic (no Aura)", () => {
  test("the schema has a constraint for every label in nodes.jsonl and the full-text index teks_bebas", () => {
    const schema = readFileSync(SCHEMA_FILE, "utf8");
    const dataLabels = [...new Set(nodes.map((n) => n.label))];
    for (const l of dataLabels) {
      expect(LABEL as readonly string[]).toContain(l);
      expect(schema).toContain(`FOR (n:${l}) REQUIRE n.id IS UNIQUE`);
    }
    expect(schema).toContain("CREATE CONSTRAINT entitas_id IF NOT EXISTS FOR (n:Entitas)");
    expect(schema).toContain("CREATE FULLTEXT INDEX teks_bebas IF NOT EXISTS FOR (n:Interaksi|Tiket)");
    expect(splitStatements(schema).every((p) => p.includes("IF NOT EXISTS"))).toBe(true);
  });

  test("every relation type in edges.jsonl is in the allowlist", () => {
    for (const t of new Set(edges.map((e) => e.type))) expect(RELATION_TYPES as readonly string[]).toContain(t);
  });

  test("every node and relation in the JSONL carries source_file and source_id", () => {
    expect(nodes.filter((n) => !n.source_file || !n.source_id)).toEqual([]);
    expect(edges.filter((e) => !e.source_file || !e.source_id)).toEqual([]);
  });

  test("toNeo4jProps: date → Date, null dropped, map → JSON string, version string stays a string", () => {
    const p = toNeo4jProps({ tanggal: "2026-10-01", versi: "4.10", empty: null, versi_sejak: { "4.12": "2026-07-01" }, list: ["a", "b"], not_a_date_key: "2026-10-01" });
    expect(String((p.tanggal as { year: unknown }).year)).toBe("2026");
    expect(p.versi).toBe("4.10");
    expect("empty" in p).toBe(false);
    expect(p.versi_sejak_json).toBe('{"4.12":"2026-07-01"}');
    expect(p.list).toEqual(["a", "b"]);
    expect(p.not_a_date_key).toBe("2026-10-01"); // only date keys are converted
  });

  test("compareCounts: node-count differences per label are reported with a clear message (duplicate-ID error path)", () => {
    const source = countJsonl(nodes, edges);
    // a duplicate ID in the JSONL would be MERGEd into one node → the database has one node fewer
    const actual = { nodes: { ...source.nodes, Kontak: source.nodes.Kontak - 1 }, relations: source.relations };
    expect(compareCounts(source, source)).toEqual([]);
    expect(compareCounts(source, actual)).toEqual([`nodes Kontak: JSONL ${source.nodes.Kontak} ≠ database ${source.nodes.Kontak - 1}`]);
  });

  test("empty env → ConfigError before any operation (nothing is deleted)", () => {
    expect(() => readNeo4jEnv({})).toThrow(ConfigError);
    expect(() => readNeo4jEnv({ NEO4J_URI: "  ", NEO4J_USERNAME: "u", NEO4J_PASSWORD: "p" })).toThrow(/NEO4J_URI/);
    expect(hostFromUri("neo4j+s://abc123.databases.neo4j.io")).toBe("abc123.databases.neo4j.io");
  });
});

describe.skipIf(!HAS_AURA)("loader against Aura (read-only)", () => {
  let driver: Driver;
  beforeAll(() => {
    driver = openDriver();
  });
  afterAll(() => driver.close());

  test("node count per label and relation count per type = JSONL (source: quality-report.json)", async () => {
    const actual = await countDb(driver);
    expect(compareCounts(countJsonl(nodes, edges), actual, { labels: RUNTIME_LABELS, relations: RUNTIME_RELATION_TYPES })).toEqual([]);
    const report = JSON.parse(readFileSync(`${BUILD_DIR}/quality-report.json`, "utf8")) as { nodes_by_label: Record<string, number> };
    const withoutRuntime = Object.fromEntries(Object.entries(actual.nodes).filter(([k]) => !(RUNTIME_LABELS as readonly string[]).includes(k))); // Sinyal is written by the F-04 runner, not the loader
    expect(withoutRuntime).toEqual(report.nodes_by_label);
  });

  test("no node/relation without source_file or source_id", async () => {
    const [n] = await queryAura<{ jumlah: number }>(driver, "MATCH (n:Entitas) WHERE n.source_file IS NULL OR n.source_id IS NULL RETURN count(n) AS jumlah");
    const [r] = await queryAura<{ jumlah: number }>(driver, "MATCH ()-[e]->() WHERE e.source_file IS NULL OR e.source_id IS NULL RETURN count(e) AS jumlah");
    expect([n.jumlah, r.jumlah]).toEqual([0, 0]);
  });

  test("unique constraint per label + entitas_id active; full-text index teks_bebas ONLINE", async () => {
    const c = await queryAura<{ name: string }>(driver, "SHOW CONSTRAINTS YIELD name RETURN name");
    const names = new Set(c.map((x) => x.name));
    expect(names.has("entitas_id")).toBe(true);
    for (const l of new Set(nodes.map((n) => n.label))) expect(names.has(`${l.toLowerCase()}_id`)).toBe(true);
    const [idx] = await queryAura<{ state: string; type: string }>(driver, "SHOW INDEXES YIELD name, state, type WHERE name = 'teks_bebas' RETURN state, type");
    expect(idx).toEqual({ state: "ONLINE", type: "FULLTEXT" });
  });

  test("full-text teks_bebas returns results (error path: a nonsense word → empty)", async () => {
    const found = await queryAura<{ id: string }>(driver, "CALL db.index.fulltext.queryNodes('teks_bebas', 'KasirPro') YIELD node RETURN node.id AS id");
    expect(found.length).toBeGreaterThan(0);
    const empty = await queryAura(driver, "CALL db.index.fulltext.queryNodes('teks_bebas', 'zzqxkvw') YIELD node RETURN node.id AS id");
    expect(empty).toEqual([]);
  });

  test("dates are stored as the date type so day differences can be computed in Cypher", async () => {
    const [r] = await queryAura<{ hari: number }>(driver, "MATCH (r:Rilis {id: 'v4.12'}) RETURN duration.inDays(r.tanggal_rilis, date('2026-10-01')).days AS hari");
    expect(r.hari).toBe(94);
  });
});

describe.skipIf(!CAN_WRITE)("idempotent rebuild (WRITES to Aura; only with AURA_MUTATE=1)", () => {
  test("rebuilding twice yields identical node and relation counts", async () => {
    const quiet = () => {};
    const first = await runLoad({ rebuild: true, log: quiet });
    const second = await runLoad({ rebuild: true, log: quiet });
    expect(second).toEqual(first);
    // restore the complete graph (derived relations + signals) so the following read-only tests stay valid
    const driver = openDriver();
    try {
      await runFolder(driver, `${BUILD_DIR}/../../cypher/derive`);
      await runSignals(driver);
    } finally {
      await driver.close();
    }
  }, 180_000);
});
