// The six fixed Tanya Graph tools (F-14) against an in-memory graph: valid/invalid input, unknown account,
// evidence registration, and every query being accepted by the readCypher guard (read-only, LIMIT forced).
import { describe, expect, test } from "bun:test";
import type { z } from "zod";
import { EvidenceRegistry } from "../../../src/server/ask/evidence";
import { createAskTools, escapeLucene, TOOL_NAMES } from "../../../src/server/ask/tools";
import { guardCypher } from "../../../src/server/cypher-guard";
import { fakeGraph } from "../../helpers/fake-graph";

function setup(options?: { fail?: boolean }) {
  const graph = fakeGraph(options);
  const registry = new EvidenceRegistry();
  const tools = createAskTools(graph.run, registry);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const call = (name: keyof typeof tools, input: unknown): Promise<any> => (tools[name].execute as any)(input, { toolCallId: "t1", messages: [] });
  const accepts = (name: keyof typeof tools, input: unknown) => (tools[name].inputSchema as unknown as z.ZodType).safeParse(input).success;
  return { ...graph, registry, tools, call, accepts };
}

describe("tool set", () => {
  test("exactly the six fixed tools, no run_cypher", () => {
    expect(Object.keys(setup().tools).sort()).toEqual([...TOOL_NAMES].sort());
  });
});

describe("get_ranking", () => {
  test("returns ranked rows with computed facts and registers the account", async () => {
    const t = setup();
    const out = await t.call("get_ranking", {});
    expect(out.rows[0]).toMatchObject({ rank: 1, account: "C10", level: "High", atRiskValue: 40_000_000 });
    expect(out.atRiskValueIsEstimate).toBe(true);
    expect(t.registry.get("C10")?.props).toMatchObject({ atRiskValue: 40_000_000, level: "High" });
    expect(t.registry.has("I0500")).toBe(true);
  });

  test("filters by level", async () => {
    const out = await setup().call("get_ranking", { level: "Critical" });
    expect(out.rows).toEqual([]);
  });

  test("rejects an unknown level", () => {
    expect(setup().accepts("get_ranking", { level: "Kritis" })).toBe(false);
  });
});

describe("get_account_signals", () => {
  test("signals and checked rules of an account outside C01–C06", async () => {
    const t = setup();
    const out = await t.call("get_account_signals", { account: "c10" });
    expect(out.found).toBe(true);
    expect(out.signals.map((s: { code: string }) => s.code)).toEqual(["KOMPETITOR_DISEBUT"]);
    expect(out.rules.find((r: { code: string }) => r.code === "CHAMPION_KELUAR")?.status).toBe("clear");
    expect(t.registry.has("I0500")).toBe(true);
  });

  test("a safe account lists its feature-request tickets (Z1)", async () => {
    const t = setup();
    const out = await t.call("get_account_signals", { account: "C22" });
    expect(out.status).toBe("consistent");
    expect(out.featureRequestTickets.ticketIds).toEqual(["T0901"]);
    expect(t.registry.has("T0901")).toBe(true);
  });

  test("unknown account → explicit not-found result, not an error", async () => {
    const t = setup();
    expect(await t.call("get_account_signals", { account: "C99" })).toMatchObject({ found: false });
    expect(t.registry.size).toBe(0);
  });

  test("rejects an ID that is not an ID", () => {
    expect(setup().accepts("get_account_signals", { account: "C01' OR 1=1" })).toBe(false);
  });
});

describe("get_evidence", () => {
  test("subgraph nodes carry source_file and are registered", async () => {
    const t = setup();
    const out = await t.call("get_evidence", { account: "C10" });
    expect(out.nodes).toEqual([expect.objectContaining({ id: "I0500", source_file: "interactions.jsonl" })]);
    expect(t.registry.get("I0500")?.text).toContain("KasirPro");
  });

  test("unknown account and unknown signal", async () => {
    const t = setup();
    expect(await t.call("get_evidence", { account: "C99" })).toMatchObject({ found: false });
    expect(await t.call("get_evidence", { account: "C10", signal: "CHAMPION_KELUAR" })).toMatchObject({ signalFound: false });
  });
});

describe("find_precedents", () => {
  test("decisions with approver and discount limit", async () => {
    const t = setup();
    const out = await t.call("find_precedents", { type: "discount" });
    expect(out.discountLimit).toEqual({ limitPct: 15, precedentId: "D-2025-02" });
    expect(out.decisions[0]).toMatchObject({ id: "D-2025-02", approver: { id: "E01" } });
    expect(t.registry.has("D-2025-02") && t.registry.has("E01")).toBe(true);
  });

  test("filter by an account without decisions", async () => {
    expect((await setup().call("find_precedents", { account: "C22" })).decisions).toEqual([]);
  });
});

describe("search_text", () => {
  test("full-text hits with the original text", async () => {
    const t = setup();
    const out = await t.call("search_text", { query: "KasirPro" });
    expect(out.hits.map((h: { id: string }) => h.id)).toEqual(["I0500"]);
    expect(t.registry.get("I0500")?.text).toBe("Klien bilang sedang membandingkan dengan KasirPro.");
  });

  test("Lucene syntax in the keyword is escaped", () => {
    expect(escapeLucene("a:b OR c*")).toBe("a\\:b OR c\\*");
  });

  test("too-short keyword is rejected", () => {
    expect(setup().accepts("search_text", { query: "a" })).toBe(false);
  });
});

describe("find_connection", () => {
  test("unknown contact → not found", async () => {
    expect(await setup().call("find_connection", { contactId: "K999" })).toMatchObject({ found: false });
  });

  test("job moves mode needs no ID", async () => {
    const out = await setup().call("find_connection", {});
    expect(out.mode).toBe("moves");
    expect(out.since).toBe("2026-04-04");
  });
});

describe("graph access", () => {
  test("every tool query is accepted by the readCypher guard", async () => {
    const t = setup();
    await t.call("get_ranking", {});
    await t.call("get_account_signals", { account: "C10" });
    await t.call("get_evidence", { account: "C10" });
    await t.call("find_precedents", {});
    await t.call("search_text", { query: "KasirPro", account: "C10" });
    await t.call("find_connection", { contactId: "C10" });
    await t.call("find_connection", { account: "C10" });
    await t.call("find_connection", {});
    expect(t.queries.length).toBeGreaterThan(10);
    for (const q of t.queries) expect(guardCypher(q)).toMatchObject({ ok: true });
  });

  test("a graph failure surfaces as an error (the SDK reports it to the model as a tool error)", async () => {
    await expect(setup({ fail: true }).call("get_ranking", {})).rejects.toThrow("Neo4j unavailable");
  });
});
