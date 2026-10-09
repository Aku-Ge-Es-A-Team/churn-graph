import { describe, expect, test } from "bun:test";
import { MAX_NODES, NEUTRAL_GROUP, SOURCE_GROUPS, edgeLabel, layoutNodes, sourceGroup, toFlowGraph } from "@/lib/graph-layout";
import type { GraphEdge, GraphNode, GraphPayload } from "@/types/graph";

const node = (id: string, source_file = "crm_accounts.csv"): GraphNode => ({ id, label: "Akun", props: {}, source_file, source_id: id });
const edge = (id: string, source: string, target: string, extra: Partial<GraphEdge> = {}): GraphEdge => ({
  id,
  source,
  target,
  type: "BEKERJA_DI",
  props: {},
  source_file: "contact_employment_history.csv",
  source_id: id,
  derived: false,
  ...extra,
});
const payload = (nodes: GraphNode[], edges: GraphEdge[], highlight: string[] = []): GraphPayload => ({
  nodes,
  edges,
  highlight,
  meta: { account: "C01", nodeCount: nodes.length, edgeCount: edges.length },
});

describe("toFlowGraph", () => {
  test("keeps every node and edge of a valid payload and marks highlighted nodes", () => {
    const result = toFlowGraph(payload([node("A"), node("B"), node("C")], [edge("e1", "A", "B"), edge("e2", "B", "C")], ["B"]));
    expect(result.nodes).toHaveLength(3);
    expect(result.edges).toHaveLength(2);
    expect(result.droppedEdges).toEqual([]);
    expect(result.nodes.map((n) => n.data.highlighted)).toEqual([false, true, false]);
  });

  test("drops and reports edges whose endpoint is missing (no orphan edges)", () => {
    const result = toFlowGraph(payload([node("A"), node("B")], [edge("e1", "A", "B"), edge("e2", "A", "GHOST")]));
    expect(result.edges.map((e) => e.id)).toEqual(["e1"]);
    expect(result.droppedEdges).toEqual(["e2"]);
  });

  test("an empty payload gives an empty result", () => {
    expect(toFlowGraph(payload([], []))).toEqual({ nodes: [], edges: [], droppedEdges: [], tooLarge: false });
  });

  test("error path: more than MAX_NODES nodes is refused, nothing is drawn", () => {
    const nodes = Array.from({ length: MAX_NODES + 1 }, (_, i) => node(`N${i}`));
    const result = toFlowGraph(payload(nodes, []));
    expect(result.tooLarge).toBe(true);
    expect(result.nodes).toHaveLength(0);
  });

  test("exactly MAX_NODES nodes is still drawn", () => {
    const nodes = Array.from({ length: MAX_NODES }, (_, i) => node(`N${i}`));
    expect(toFlowGraph(payload(nodes, [])).tooLarge).toBe(false);
  });

  test("derived relationships are dashed and labelled with their confidence", () => {
    const result = toFlowGraph(payload([node("A"), node("B")], [edge("e1", "A", "B", { derived: true, confidence: 0.8, type: "KANDIDAT_DISEBABKAN_OLEH" }), edge("e2", "A", "B")]));
    expect(result.edges[0].style?.strokeDasharray).toBeDefined();
    expect(result.edges[0].label).toBe("KANDIDAT_DISEBABKAN_OLEH · derived 0.8");
    expect(result.edges[1].style).toBeUndefined();
  });
});

describe("edgeLabel and sourceGroup", () => {
  test("label is the type plus the first date property", () => {
    expect(edgeLabel(edge("e", "A", "B", { props: { mulai: "2026-09-01" } }))).toBe("BEKERJA_DI · 2026-09-01");
    expect(edgeLabel(edge("e", "A", "B"))).toBe("BEKERJA_DI");
  });

  test("every group has a distinct colour and unknown files fall back to neutral instead of throwing", () => {
    expect(new Set(SOURCE_GROUPS.map((g) => g.color)).size).toBe(SOURCE_GROUPS.length);
    expect(SOURCE_GROUPS).toHaveLength(7);
    expect(sourceGroup("decision_log.csv").key).toBe("decisions");
    expect(sourceGroup("something_new.csv")).toBe(NEUTRAL_GROUP);
  });
});

describe("layoutNodes (ELK layered, left to right)", () => {
  test("a chain is laid out with strictly increasing x and keeps the node count", async () => {
    const flow = toFlowGraph(payload([node("A"), node("B"), node("C")], [edge("e1", "A", "B"), edge("e2", "B", "C")]));
    const laid = await layoutNodes(flow.nodes, flow.edges);
    expect(laid).toHaveLength(3);
    const x = Object.fromEntries(laid.map((n) => [n.id, n.position.x]));
    expect(x.A).toBeLessThan(x.B);
    expect(x.B).toBeLessThan(x.C);
  });

  test("empty input resolves to an empty list", async () => {
    expect(await layoutNodes([], [])).toEqual([]);
  });
});
