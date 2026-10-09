// Golden test for v1 derived relations (F-03, T03-05).
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { join } from "node:path";
import type { Driver } from "neo4j-driver";
import { ANOMALY_THRESHOLD_PCT, deriveRelations } from "../../scripts/etl/derive";
import { runEtl } from "../../scripts/etl/index";
import type { EtlEdge, EtlNode } from "../../scripts/etl/types";
import { runFolder } from "../../scripts/run-cypher";
import { CAN_WRITE, CANDIDATE_GOLDEN, HAS_AURA, openDriver, queryAura } from "../helpers/aura";

const ROOT = join(import.meta.dir, "../..");

let result: ReturnType<typeof runEtl>;
let edge: Map<string, EtlEdge>;
let node: Map<string, EtlNode>;

beforeAll(() => {
  result = runEtl({ write: false });
  edge = new Map(result.edges.map((e) => [e.key, e]));
  node = new Map(result.nodes.map((n) => [n.id, n]));
});

const derivedEdges = () => result.edges.filter((e) => e.derived);

describe("derived relations from the ETL", () => {
  test("all derived relations/nodes carry derived=true, rule, confidence", () => {
    for (const e of derivedEdges()) {
      expect(e.derived).toBe(true);
      expect(typeof e.props.rule).toBe("string");
      expect(e.props.confidence).toBeGreaterThan(0);
      expect(e.props.confidence).toBeLessThanOrEqual(1);
    }
    for (const n of result.nodes.filter((x) => x.label === "Anomali")) {
      expect(n.props).toMatchObject({ derived: true, rule: "usage_turun_vs_baseline" });
      expect(n.props.confidence).toBeGreaterThan(0);
    }
    const types = new Set(derivedEdges().map((e) => e.type));
    expect([...types].sort()).toEqual(["BERTEPATAN_DENGAN", "MEMBALAS", "MENGALAMI", "MENJALANKAN_VERSI", "MENYEBUT"]);
  });

  test("6 offline C03 outlets have an anomaly of −34% to −36% that coincides with v4.12", () => {
    for (let i = 1; i <= 6; i++) {
      const id = `ANM-C03-O0${i}`;
      const a = node.get(id)!;
      expect(a.props.delta_pct as number).toBeLessThanOrEqual(-34);
      expect(a.props.delta_pct as number).toBeGreaterThanOrEqual(-36.5);
      expect(edge.has(`MENGALAMI:C03-O0${i}->${id}`)).toBe(true);
      expect(edge.get(`BERTEPATAN_DENGAN:${id}->v4.12`)?.props.sejak).toMatch(/^2026-07-0[1-5]$/);
    }
    expect(ANOMALY_THRESHOLD_PCT).toBe(25);
  });

  test("error path: only C03/C05 outlets have anomalies; offline control outlets in other accounts do not", () => {
    const anomalyAccounts = new Set(result.nodes.filter((n) => n.label === "Anomali").map((n) => n.props.account_id));
    expect([...anomalyAccounts].sort()).toEqual(["C03", "C05"]);
    expect(node.has("ANM-C01-O30")).toBe(false); // offline control in C01 (Brief §4)
    expect(node.has("ANM-C06-O30")).toBe(false);
    expect(result.report.derived_relations.counts.Anomali).toBe(11);
  });

  test("the threshold is a parameter: 40% removes all anomalies, 25% yields 11", () => {
    expect(deriveRelations(result.data, result.base, { thresholdPct: 25 }).nodes).toHaveLength(11);
    expect(deriveRelations(result.data, result.base, { thresholdPct: 40 }).nodes).toHaveLength(0);
  });

  test("the version comes from usage, not the ticket column: T0531/T0600/T0636 are not on v4.12", () => {
    for (const [ticket, outlet] of [["T0531", "C15-O20"], ["T0600", "C06-O30"], ["T0636", "C34-O11"]] as const) {
      expect(node.get(ticket)?.props.versi_aplikasi).toBe("4.12"); // claim on the ticket
      expect(edge.has(`MENJALANKAN_VERSI:${outlet}->v4.12`)).toBe(false); // usage never shows 4.12
      expect(edge.has(`MENJALANKAN_VERSI:${outlet}->v4.11`)).toBe(true);
    }
  });

  test("MEMBALAS = number of filled membalas_id; MENYEBUT only from non-template interactions", () => {
    const withReplyTo = result.nodes.filter((n) => n.label === "Interaksi" && n.props.membalas_id).length;
    expect(derivedEdges().filter((e) => e.type === "MEMBALAS")).toHaveLength(withReplyTo);
    const mentions = derivedEdges().filter((e) => e.type === "MENYEBUT");
    expect(mentions.map((e) => e.from).sort()).toEqual(["I0296", "I0331", "I0348"]);
    for (const e of mentions) expect(node.get(e.from)?.props.template).toBe(false);
  });

  test("organization 'PT Teknologi Kasir Prima' is only checked, not merged with KasirPro", () => {
    expect(node.has("KOMP-kasirpro")).toBe(true);
    expect(node.get("KOMP-kasirpro")?.label).toBe("Kompetitor");
    expect(result.report.derived_relations.organizations_similar_to_competitors.map((o) => o.organization)).toContain("PT Teknologi Kasir Prima");
    expect(result.nodes.filter((n) => n.label === "Organisasi" && String(n.props.nama).includes("Kasir Prima"))).toHaveLength(1);
  });
});

describe.skipIf(!HAS_AURA)("KANDIDAT_DISEBABKAN_OLEH in Aura (read-only)", () => {
  let driver: Driver;
  beforeAll(() => {
    driver = openDriver();
  });
  afterAll(() => driver.close());

  test(`candidate count = ${CANDIDATE_GOLDEN.total} (C03 ${CANDIDATE_GOLDEN.C03} + C05 ${CANDIDATE_GOLDEN.C05}) with derived/rule/confidence`, async () => {
    const rows = await queryAura<{ akun: string; n: number; tanpaProp: number }>(
      driver,
      `MATCH (t:Tiket)-[r:KANDIDAT_DISEBABKAN_OLEH]->(:Bug)
       RETURN t.account_id AS akun, count(r) AS n,
              sum(CASE WHEN r.derived <> true OR r.rule IS NULL OR r.confidence IS NULL THEN 1 ELSE 0 END) AS tanpaProp ORDER BY akun`,
    );
    expect(Object.fromEntries(rows.map((b) => [b.akun, b.n]))).toEqual({ C03: CANDIDATE_GOLDEN.C03, C05: CANDIDATE_GOLDEN.C05 });
    expect(rows.reduce((s, b) => s + b.n, 0)).toBe(CANDIDATE_GOLDEN.total);
    expect(rows.every((b) => b.tanpaProp === 0)).toBe(true);
  });

  test("T0531/T0600/T0636 get no relation (version comes from usage)", async () => {
    const r = await queryAura(driver, "MATCH (t:Tiket)-[:KANDIDAT_DISEBABKAN_OLEH]->(:Bug) WHERE t.id IN ['T0531','T0600','T0636'] RETURN t.id AS id");
    expect(r).toEqual([]);
  });

  test("error path: every candidate is on an offline outlet, has no linked bug, and was created after the outlet ran the bug's release", async () => {
    const r = await queryAura<{ pelanggar: number }>(
      driver,
      `MATCH (t:Tiket)-[:KANDIDAT_DISEBABKAN_OLEH]->(b:Bug)-[:TERDAPAT_DI]->(v:Rilis)
       MATCH (o:Outlet)-[:MEMBUKA_TIKET]->(t)
       OPTIONAL MATCH (o)-[mv:MENJALANKAN_VERSI]->(v)
       WITH t, o, mv, EXISTS { (t)-[:DISEBABKAN_OLEH]->(:Bug) } AS tertaut
       WHERE o.mode_offline <> true OR tertaut OR mv IS NULL OR t.dibuat < mv.sejak
       RETURN count(t) AS pelanggar`,
    );
    expect(r[0].pelanggar).toBe(0);
  });

  test("the C03 anomalies and the MENJALANKAN_VERSI/MEMBALAS/MENYEBUT relations are loaded in the graph", async () => {
    const [a] = await queryAura<{ n: number; min: number; maks: number }>(
      driver,
      "MATCH (:Outlet)-[:MENGALAMI]->(n:Anomali {account_id: 'C03'})-[:BERTEPATAN_DENGAN]->(:Rilis {id: 'v4.12'}) RETURN count(n) AS n, min(n.delta_pct) AS min, max(n.delta_pct) AS maks",
    );
    expect(a.n).toBe(6);
    expect(a.min).toBeGreaterThanOrEqual(-36.5);
    expect(a.maks).toBeLessThanOrEqual(-34);
    const r = await queryAura<{ tipe: string; n: number }>(driver, "MATCH ()-[e]->() WHERE e.derived = true AND type(e) IN ['MENJALANKAN_VERSI','MEMBALAS','MENYEBUT','MENGALAMI','BERTEPATAN_DENGAN'] RETURN type(e) AS tipe, count(e) AS n");
    expect(new Set(r.map((x) => x.tipe)).size).toBe(5);
  });
});

describe.skipIf(!CAN_WRITE)("idempotent derive (WRITES to Aura; only with AURA_MUTATE=1)", () => {
  test("bun run derive twice → same KANDIDAT_DISEBABKAN_OLEH count", async () => {
    const driver = openDriver();
    try {
      const count = async () => (await queryAura<{ n: number }>(driver, "MATCH ()-[r:KANDIDAT_DISEBABKAN_OLEH]->() RETURN count(r) AS n"))[0].n;
      await runFolder(driver, join(ROOT, "cypher/derive"));
      const first = await count();
      await runFolder(driver, join(ROOT, "cypher/derive"));
      expect(await count()).toBe(first);
      expect(first).toBe(CANDIDATE_GOLDEN.total);
    } finally {
      await driver.close();
    }
  }, 60_000);
});
