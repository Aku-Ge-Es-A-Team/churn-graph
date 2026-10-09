// Graph loader (F-02): data/build/*.jsonl → Neo4j AuraDB.
//   bun scripts/load.ts             load (MERGE, idempotent; deletes nothing)
//   bun scripts/load.ts --rebuild   delete ALL nodes, then reload (destructive; only for team-owned instances)
// Credentials come from env (NEO4J_URI, NEO4J_USERNAME, NEO4J_PASSWORD). Labels and relation types come from the allowlists
// below, never from input; data values always go through Cypher parameters.
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Driver } from "neo4j-driver";
import type { EtlEdge, EtlNode } from "./etl/types";
import { ConfigError, createDriver, hostFromUri, neo4j, splitStatements } from "./lib/neo4j";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const BUILD_DIR = join(ROOT, "data/build");
export const SCHEMA_FILE = join(ROOT, "cypher/schema.cypher");
const BATCH = 500;

/** Label allowlist (must match the constraints in cypher/schema.cypher). */
export const LABEL = [
  "Akun", "Anomali", "Bug", "Deal", "Fitur", "Interaksi", "Karyawan", "Keputusan", "Kompetitor",
  "Kontak", "Kontrak", "Organisasi", "Outlet", "Rilis", "Sinyal", "Tiket", "UsageBulan",
] as const;

/** Allowlist of relation types loaded from JSONL (PADA/BUKTI are written by the signal runner, KANDIDAT_... by `derive`). */
export const RELATION_TYPES = [
  "BEKERJA_DI", "PERNAH_BEKERJA_DI", "CHAMPION_DARI", "DIPEGANG_OLEH", "MEMILIKI", "MEMBUKA_TIKET", "DISEBABKAN_OLEH",
  "TERDAPAT_DI", "TERKAIT", "MENCATAT", "TERLIBAT_DI", "TENTANG", "MENYETUJUI", "DIDASARKAN_PADA", "MENJANJIKAN", "MENYEBUT",
  "MENJALANKAN_VERSI", "MENGALAMI", "BERTEPATAN_DENGAN", "MEMBALAS",
] as const;

const DATE_KEYS = new Set(["tanggal", "dibuat", "diselesaikan", "selesai", "mulai", "stage_sejak", "tanggal_rilis", "tanggal_renewal", "sejak"]);
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Written AFTER the load (cypher/derive and scripts/signals.ts), so they are not compared against the JSONL. */
export const RUNTIME_LABELS = ["Sinyal"] as const;
export const RUNTIME_RELATION_TYPES = ["KANDIDAT_DISEBABKAN_OLEH", "PADA", "BUKTI"] as const;

export type Counts = { nodes: Record<string, number>; relations: Record<string, number> };

export function readJsonl<T>(path: string): T[] {
  return readFileSync(path, "utf8")
    .split(/\r?\n/)
    .filter((l) => l.trim() !== "")
    .map((l) => JSON.parse(l) as T);
}

function toNeo4jValue(key: string, v: unknown): unknown {
  if (typeof v === "string") {
    const m = key !== "" && DATE_KEYS.has(key) ? ISO_DATE.exec(v) : null;
    return m ? new neo4j.types.Date(Number(m[1]), Number(m[2]), Number(m[3])) : v;
  }
  if (typeof v === "number") return Number.isInteger(v) ? neo4j.int(v) : v;
  if (Array.isArray(v)) return v.map((x) => toNeo4jValue("", x));
  return v;
}

/**
 * Properties → a shape Neo4j can store: date → Date, integer → Integer, null dropped,
 * object (map) → JSON string in the property `<name>_json` (Neo4j properties cannot be maps).
 */
export function toNeo4jProps(props: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(props)) {
    if (v === null || v === undefined) continue;
    if (typeof v === "object" && !Array.isArray(v)) result[`${k}_json`] = JSON.stringify(v);
    else result[k] = toNeo4jValue(k, v);
  }
  return result;
}

export function countJsonl(nodes: readonly EtlNode[], edges: readonly EtlEdge[]): Counts {
  const nodeCounts: Record<string, number> = {};
  const relationCounts: Record<string, number> = {};
  for (const n of nodes) nodeCounts[n.label] = (nodeCounts[n.label] ?? 0) + 1;
  for (const e of edges) relationCounts[e.type] = (relationCounts[e.type] ?? 0) + 1;
  return { nodes: nodeCounts, relations: relationCounts };
}

/** Compare the expected counts (JSONL) with the database result; returns the list of differences (empty = match). */
export function compareCounts(expected: Counts, actual: Counts, ignore: { labels?: readonly string[]; relations?: readonly string[] } = {}): string[] {
  const differences: string[] = [];
  const skip = { nodes: new Set<string>(ignore.labels ?? []), relations: new Set<string>(ignore.relations ?? []) };
  for (const [kind, e, a] of [["nodes", expected.nodes, actual.nodes], ["relations", expected.relations, actual.relations]] as const) {
    for (const k of new Set([...Object.keys(e), ...Object.keys(a)])) {
      if (skip[kind].has(k)) continue;
      if ((e[k] ?? 0) !== (a[k] ?? 0)) differences.push(`${kind} ${k}: JSONL ${e[k] ?? 0} ≠ database ${a[k] ?? 0}`);
    }
  }
  return differences;
}

function assertAllowlist(nodes: readonly EtlNode[], edges: readonly EtlEdge[]): void {
  const allowedLabels = new Set<string>(LABEL);
  const allowedTypes = new Set<string>(RELATION_TYPES);
  const unknownLabels = [...new Set(nodes.map((n) => n.label))].filter((l) => !allowedLabels.has(l));
  const unknownTypes = [...new Set(edges.map((e) => e.type))].filter((t) => !allowedTypes.has(t));
  if (unknownLabels.length > 0) throw new Error(`Labels outside the allowlist: ${unknownLabels.join(", ")} (add them to LABEL and cypher/schema.cypher)`);
  if (unknownTypes.length > 0) throw new Error(`Relation types outside the allowlist: ${unknownTypes.join(", ")}`);
}

const writeSession = (driver: Driver) => driver.session({ defaultAccessMode: neo4j.session.WRITE });

export async function loadSchema(driver: Driver, file = SCHEMA_FILE): Promise<number> {
  const statements = splitStatements(readFileSync(file, "utf8"));
  const s = writeSession(driver);
  try {
    for (const p of statements) await s.run(p);
  } finally {
    await s.close();
  }
  return statements.length;
}

export async function countDb(driver: Driver): Promise<Counts> {
  const s = driver.session({ defaultAccessMode: neo4j.session.READ });
  try {
    const n = await s.run("MATCH (n:Entitas) UNWIND [l IN labels(n) WHERE l <> 'Entitas'] AS label RETURN label, count(*) AS jumlah");
    const r = await s.run("MATCH ()-[e]->() RETURN type(e) AS tipe, count(*) AS jumlah");
    return {
      nodes: Object.fromEntries(n.records.map((x) => [x.get("label") as string, x.get("jumlah") as number])),
      relations: Object.fromEntries(r.records.map((x) => [x.get("tipe") as string, x.get("jumlah") as number])),
    };
  } finally {
    await s.close();
  }
}

export async function deleteAll(driver: Driver): Promise<number> {
  const s = writeSession(driver);
  let total = 0;
  try {
    for (;;) {
      const r = await s.run("MATCH (n) WITH n LIMIT 2000 DETACH DELETE n RETURN count(*) AS dihapus");
      const n = r.records[0].get("dihapus") as number;
      if (n === 0) break;
      total += n;
    }
  } finally {
    await s.close();
  }
  return total;
}

export async function loadGraph(driver: Driver, nodes: readonly EtlNode[], edges: readonly EtlEdge[]): Promise<void> {
  assertAllowlist(nodes, edges);
  const s = writeSession(driver);
  try {
    const byLabel = new Map<string, EtlNode[]>();
    for (const n of nodes) byLabel.set(n.label, [...(byLabel.get(n.label) ?? []), n]);
    for (const [label, list] of byLabel) {
      const cypher = `UNWIND $rows AS r
MERGE (n:Entitas:\`${label}\` {id: r.id})
SET n += r.props
SET n.sumber = r.sumber, n.source_file = r.source_file, n.source_id = r.source_id`;
      for (let i = 0; i < list.length; i += BATCH) {
        const rows = list.slice(i, i + BATCH).map((n) => ({ id: n.id, sumber: n.sumber, source_file: n.source_file, source_id: n.source_id, props: toNeo4jProps(n.props) }));
        await s.executeWrite((tx) => tx.run(cypher, { rows }));
      }
    }

    const byType = new Map<string, EtlEdge[]>();
    for (const e of edges) byType.set(e.type, [...(byType.get(e.type) ?? []), e]);
    for (const [type, list] of byType) {
      const cypher = `UNWIND $rows AS r
MATCH (a:Entitas {id: r.from})
MATCH (b:Entitas {id: r.to})
MERGE (a)-[e:\`${type}\` {key: r.key}]->(b)
SET e += r.props
SET e.derived = r.derived, e.source_file = r.source_file, e.source_id = r.source_id`;
      for (let i = 0; i < list.length; i += BATCH) {
        const rows = list.slice(i, i + BATCH).map((e) => ({ key: e.key, from: e.from, to: e.to, derived: e.derived, source_file: e.source_file, source_id: e.source_id, props: toNeo4jProps(e.props) }));
        await s.executeWrite((tx) => tx.run(cypher, { rows }));
      }
    }
  } finally {
    await s.close();
  }
}

export async function runLoad(options: { rebuild?: boolean; buildDir?: string; log?: (s: string) => void } = {}) {
  const log = options.log ?? ((s: string) => console.log(s));
  const dir = options.buildDir ?? BUILD_DIR;
  const nodes = readJsonl<EtlNode>(join(dir, "nodes.jsonl"));
  const edges = readJsonl<EtlEdge>(join(dir, "edges.jsonl"));
  const driver = createDriver(); // throws ConfigError when env is empty -- before any operation
  try {
    await driver.verifyConnectivity();
    const uri = process.env.NEO4J_URI!;
    const before = await countDb(driver);
    const nodesBefore = Object.values(before.nodes).reduce((a, b) => a + b, 0);
    log(`Aura: ${hostFromUri(uri)} | current nodes: ${nodesBefore}`);
    if (options.rebuild) {
      log(`REBUILD: deleting ALL nodes in ${hostFromUri(uri)} (${nodesBefore} labeled nodes), then reloading from ${dir}`);
      const deleted = await deleteAll(driver);
      log(`  deleted: ${deleted} nodes`);
    }
    const schemaStatements = await loadSchema(driver);
    log(`schema: ${schemaStatements} statements executed (constraints + full-text index)`);
    await loadGraph(driver, nodes, edges);
    const actual = await countDb(driver);
    const differences = compareCounts(countJsonl(nodes, edges), actual, { labels: RUNTIME_LABELS, relations: RUNTIME_RELATION_TYPES });
    log(`nodes    : ${Object.entries(actual.nodes).sort().map(([k, v]) => `${k}=${v}`).join(" ")}`);
    log(`relations: ${Object.entries(actual.relations).sort().map(([k, v]) => `${k}=${v}`).join(" ")}`);
    if (differences.length > 0) throw new Error(`Database counts do not match the JSONL:\n  ${differences.join("\n  ")}`);
    log("database counts = JSONL (match)");
    return actual;
  } finally {
    await driver.close();
  }
}

if (import.meta.main) {
  runLoad({ rebuild: process.argv.includes("--rebuild") }).catch((e) => {
    console.error(e instanceof ConfigError ? `LOAD ABORTED: ${e.message}` : `LOAD FAILED: ${e instanceof Error ? e.message : e}`);
    process.exit(1);
  });
}
