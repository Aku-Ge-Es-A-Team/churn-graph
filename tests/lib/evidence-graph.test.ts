import { describe, expect, test } from "bun:test";
import { MAX_GRAPH_NODES, firstDate, layoutFlowGraph, sourceCategory, toFlowGraph } from "../../src/lib/evidence-graph";
import type { GraphPayload } from "../../src/types/graph";

const node = (id: string, label: string, source_file: string, props: Record<string, unknown> = {}) => ({ id, label, props, source_file, source_id: id });

const payload: GraphPayload = {
  nodes: [
    node("C01", "Akun", "crm_accounts.csv", { nama: "Kopi Lintas Nusantara" }),
    node("K017", "Kontak", "crm_contacts.csv", { nama: "Rina Hapsari" }),
    node("P01", "Akun", "crm_accounts.csv"),
    node("I0331", "Interaksi", "interactions.json", { tanggal: "2026-09-18" }),
  ],
  edges: [
    { id: "e1", source: "K017", target: "C01", type: "PERNAH_BEKERJA_DI", props: { selesai: "2026-08-15" }, source_file: "contact_employment_history.csv", source_id: "K017", derived: false },
    { id: "e2", source: "K017", target: "P01", type: "BEKERJA_DI", props: {}, source_file: "contact_employment_history.csv", source_id: "K017", derived: false },
    { id: "e3", source: "I0331", target: "KOMP", type: "MENYEBUT", props: {}, source_file: "interactions.json", source_id: "I0331", derived: true, confidence: 0.8 },
    { id: "e4", source: "I0331", target: "C01", type: "MENYEBUT", props: {}, source_file: "interactions.json", source_id: "I0331", derived: true, confidence: 0.75 },
  ],
  highlight: ["C01", "K017"],
  meta: { account: "C01", nodeCount: 4, edgeCount: 4 },
};

describe("toFlowGraph", () => {
  test("keeps every node, drops edges whose endpoint is missing", () => {
    const g = toFlowGraph(payload);
    expect(g.nodes).toHaveLength(4);
    expect(g.edges.map((e) => e.id)).toEqual(["e1", "e2", "e4"]);
    expect(g.droppedEdges).toEqual(["e3"]);
    expect(g.tooLarge).toBe(false);
  });

  test("marks highlighted nodes and names nodes by their title", () => {
    const g = toFlowGraph(payload);
    const c01 = g.nodes.find((n) => n.id === "C01")!;
    expect(c01.data.highlighted).toBe(true);
    expect(c01.data.title).toBe("Kopi Lintas Nusantara");
    expect(g.nodes.find((n) => n.id === "P01")!.data.highlighted).toBe(false);
    expect(g.nodes.find((n) => n.id === "P01")!.data.title).toBe("P01");
  });

  test("labels relationships with type, date and confidence for derived ones", () => {
    const g = toFlowGraph(payload);
    expect(g.edges.find((e) => e.id === "e1")!.data.label).toBe("PERNAH_BEKERJA_DI · 2026-08-15");
    expect(g.edges.find((e) => e.id === "e4")!.data).toMatchObject({ derived: true, label: "MENYEBUT · conf 0.75" });
  });

  test("lists only the source categories present, in legend order", () => {
    expect(toFlowGraph(payload).categories).toEqual(["crm", "interactions"]);
  });

  test("flags payloads above the node limit", () => {
    const big: GraphPayload = {
      ...payload,
      nodes: Array.from({ length: MAX_GRAPH_NODES + 1 }, (_, i) => node(`N${i}`, "Tiket", "support_tickets.csv")),
      edges: [],
    };
    expect(toFlowGraph(big).tooLarge).toBe(true);
  });

  test("an empty payload gives an empty graph", () => {
    const g = toFlowGraph({ ...payload, nodes: [], edges: [], highlight: [] });
    expect(g.nodes).toEqual([]);
    expect(g.edges).toEqual([]);
    expect(g.categories).toEqual([]);
  });
});

describe("sourceCategory and firstDate", () => {
  test("maps known files and falls back to other", () => {
    expect(sourceCategory("decision_log.csv")).toBe("decisions");
    expect(sourceCategory("data/raw/support_tickets.csv")).toBe("tickets");
    expect(sourceCategory("unknown.csv")).toBe("other");
    expect(sourceCategory(undefined)).toBe("other");
  });

  test("returns the first date-like property", () => {
    expect(firstDate({ mulai: "2021-03-01", selesai: "2026-08-15" })).toBe("2021-03-01");
    expect(firstDate({ tanggal: "2026-09-18T00:00:00" })).toBe("2026-09-18");
    expect(firstDate({})).toBeNull();
  });
});

describe("layoutFlowGraph", () => {
  // elkjs' bundled fake worker does not load under Bun's test runner, so ELK is stubbed here; the real layout runs in the browser.
  type Call = { layoutOptions: Record<string, string>; children: { id: string }[]; edges: { sources: string[]; targets: string[] }[] };
  const stubElk = () => {
    const calls: Call[] = [];
    return {
      calls,
      layout: async (graph: Call) => {
        calls.push(graph);
        return { children: graph.children.map((c, i) => ({ id: c.id, x: i * 300, y: 10 })) };
      },
    };
  };

  test("asks ELK for a layered left-to-right layout and maps positions onto the nodes", async () => {
    const elk = stubElk();
    const nodes = await layoutFlowGraph(toFlowGraph(payload), elk);
    expect(elk.calls[0].layoutOptions["elk.algorithm"]).toBe("layered");
    expect(elk.calls[0].layoutOptions["elk.direction"]).toBe("RIGHT");
    expect(elk.calls[0].edges).toHaveLength(3);
    expect(nodes.map((n) => n.position.x)).toEqual([0, 300, 600, 900]);
  });

  test("an empty graph needs no layout", async () => {
    const elk = stubElk();
    expect(await layoutFlowGraph(toFlowGraph({ ...payload, nodes: [], edges: [] }), elk)).toEqual([]);
    expect(elk.calls).toHaveLength(0);
  });
});
