// F-08 evidence path: induced subgraph over the evidence IDs of an account's signals (real graph, read-only).
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { fetchAccountEvidence, fetchInducedSubgraph } from "../../src/server/queries/evidence";
import { fetchAccounts } from "../../src/server/queries/risk";
import { validateGraphPayload, GraphPayloadSchema, type GraphPayload } from "../../src/types/graph";
import { HAS_GRAPH, openRunner } from "../helpers/runner";

async function evidence(run: ReturnType<typeof openRunner>["run"], account: string, code?: string): Promise<GraphPayload> {
  const result = await fetchAccountEvidence(run, account, code);
  if (result.status !== "ok") throw new Error(`expected ok for ${account}, got ${result.status}`);
  return result.payload;
}

describe.skipIf(!HAS_GRAPH)("evidence payload (read-only)", () => {
  let run: ReturnType<typeof openRunner>["run"];
  let close: () => Promise<void>;
  let c01: GraphPayload;

  beforeAll(async () => {
    const runner = openRunner();
    run = runner.run;
    close = runner.close;
    c01 = await evidence(run, "C01");
  });
  afterAll(() => close());

  test("C01: a consistent GraphPayload with unique nodes and no dangling relationships", () => {
    expect(GraphPayloadSchema.safeParse(c01).success).toBe(true);
    expect(validateGraphPayload(c01)).toEqual({ ok: true, errors: [] });
    expect(new Set(c01.nodes.map((n) => n.id)).size).toBe(c01.nodes.length);
    expect(new Set(c01.edges.map((e) => e.id)).size).toBe(c01.edges.length);
    expect(c01.meta).toEqual({ account: "C01", nodeCount: c01.nodes.length, edgeCount: c01.edges.length });
  });

  test("every relationship and node carries source_file; C01 draws on at least 4 different source files", () => {
    for (const e of c01.edges) expect(e.source_file && e.source_file !== "(unknown)").toBeTruthy();
    for (const n of c01.nodes) expect(n.source_file && n.source_file !== "(unknown)").toBeTruthy();
    const files = new Set([...c01.nodes, ...c01.edges].map((x) => x.source_file));
    expect(files.size).toBeGreaterThanOrEqual(4);
  });

  test("the evidence contains the champion path and the broken promise", () => {
    const edges = new Set(c01.edges.map((e) => e.id));
    expect(edges.has("CHAMPION_DARI:K017->C01")).toBe(true);
    expect(edges.has("PERNAH_BEKERJA_DI:K017->C01:2021-03-01")).toBe(true);
    expect(edges.has("BEKERJA_DI:K017->P01:2026-09-01")).toBe(true);
    expect(edges.has("MENJANJIKAN:D-2025-11->FEAT-07")).toBe(true);
    expect(edges.has("MENYETUJUI:E01->D-2025-11")).toBe(true);
    const promise = c01.edges.find((e) => e.id === "MENJANJIKAN:D-2025-11->FEAT-07")!;
    expect(promise.props.status_janji).toBe("Belum ditepati");
  });

  test("dates and integers are plain JSON values; internal bookkeeping properties are not leaked", () => {
    const history = c01.edges.find((e) => e.id === "PERNAH_BEKERJA_DI:K017->C01:2021-03-01")!;
    expect(history.props).toMatchObject({ mulai: "2021-03-01", selesai: "2026-08-15" });
    expect(JSON.stringify(c01)).not.toContain('"year"');
    for (const n of c01.nodes) for (const k of ["id", "sumber", "source_file", "source_id"]) expect(k in n.props).toBe(false);
    for (const e of c01.edges) for (const k of ["key", "derived", "source_file", "source_id"]) expect(k in e.props).toBe(false);
  });

  test("derived relationships keep their rule and confidence", () => {
    const derived = c01.edges.find((e) => e.derived);
    expect(derived?.rule).toBeTruthy();
    expect(derived?.confidence).toBeGreaterThan(0);
  });

  test("filtering by signal code returns a subset and highlights exactly its evidence", async () => {
    const champion = await evidence(run, "C01", "CHAMPION_KELUAR");
    expect(champion.meta.signal).toBe("CHAMPION_KELUAR");
    expect(champion.highlight).toContain("K017");
    expect(champion.highlight).not.toContain("FEAT-07");
    expect(champion.nodes.length).toBeLessThan(c01.nodes.length);
    const all = new Set(c01.highlight);
    for (const id of champion.highlight) expect(all.has(id)).toBe(true);
  });

  test("an existing account without signals gives an empty payload, not an error", async () => {
    const c02 = await evidence(run, "C02");
    expect(c02.nodes).toEqual([]);
    expect(c02.edges).toEqual([]);
    expect(c02.highlight).toEqual([]);
  });

  test("error paths: unknown account and unknown signal are structured results", async () => {
    expect(await fetchAccountEvidence(run, "ZZZ")).toEqual({ status: "account_not_found" });
    expect(await fetchAccountEvidence(run, "C01", "NO_SUCH_SIGNAL")).toEqual({ status: "signal_not_found" });
    expect(await fetchAccountEvidence(run, "C02", "CHAMPION_KELUAR")).toEqual({ status: "signal_not_found" });
  });

  test("an empty ID list gives an empty subgraph without querying", async () => {
    const never = async () => {
      throw new Error("must not be called");
    };
    expect(await fetchInducedSubgraph(never, [])).toEqual({ nodes: [], edges: [] });
  });

  test("all 40 customer accounts answer in under 2 seconds each (cold)", async () => {
    const accounts = await fetchAccounts(run);
    expect(accounts).toHaveLength(40);
    let slowest = 0;
    for (const a of accounts) {
      const start = performance.now();
      const payload = await evidence(run, a.account);
      slowest = Math.max(slowest, performance.now() - start);
      expect(validateGraphPayload(payload).ok).toBe(true);
      for (const e of payload.edges) expect(e.source_file).toBeTruthy();
    }
    console.info(`[evidence] slowest account: ${Math.round(slowest)} ms`);
    expect(slowest).toBeLessThan(2000);
  }, 120_000);
});
