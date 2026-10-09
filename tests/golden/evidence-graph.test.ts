// F-12 viewer against the real graph (read-only): every account's evidence payload fits the graph view (≤80 nodes,
// no dangling relationships after the adapter), and C01 shows the champion path and the broken promise in one view.
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { MAX_GRAPH_NODES, toFlowGraph } from "../../src/lib/evidence-graph";
import { fetchAccountEvidence } from "../../src/server/queries/evidence";
import { fetchAccounts } from "../../src/server/queries/risk";
import type { GraphPayload } from "../../src/types/graph";
import { HAS_GRAPH, openRunner } from "../helpers/runner";

describe.skipIf(!HAS_GRAPH)("evidence graph viewer on real payloads (read-only)", () => {
  let close: () => Promise<void>;
  const payloads = new Map<string, GraphPayload>();

  beforeAll(async () => {
    const runner = openRunner();
    close = runner.close;
    const accounts = await fetchAccounts(runner.run);
    for (const a of accounts) {
      const result = await fetchAccountEvidence(runner.run, a.account);
      if (result.status === "ok") payloads.set(a.account, result.payload);
    }
  }, 120_000);
  afterAll(() => close());

  test("all 40 customer accounts fit the graph view without dropped relationships", () => {
    expect(payloads.size).toBe(40);
    for (const [account, payload] of payloads) {
      const graph = toFlowGraph(payload);
      expect({ account, tooLarge: graph.tooLarge }).toEqual({ account, tooLarge: false });
      expect({ account, dropped: graph.droppedEdges }).toEqual({ account, dropped: [] });
      expect(graph.nodes.length).toBeLessThanOrEqual(MAX_GRAPH_NODES);
    }
  });

  test("C01 draws on at least 4 source files and shows the champion path and the FEAT-07 promise", () => {
    const c01 = payloads.get("C01")!;
    const files = new Set([...c01.nodes.map((n) => n.source_file), ...c01.edges.map((e) => e.source_file)]);
    expect(files.size).toBeGreaterThanOrEqual(4);
    const ids = new Set(c01.nodes.map((n) => n.id));
    for (const id of ["C01", "K017", "P01", "FEAT-07"]) expect(ids.has(id)).toBe(true);
    expect(c01.nodes.some((n) => n.source_file === "decision_log.csv")).toBe(true);
  });
});
