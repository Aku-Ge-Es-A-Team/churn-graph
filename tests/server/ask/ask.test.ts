// "Ask the graph" pipeline and tools (F-14), without network: the graph runner and the LLM are fakes.
import { describe, expect, test } from "bun:test";
import { ask, claimsFromBracketedProse, hasUncitedLines, parseModelJson, type GenerateFn } from "../../../src/server/ask/ask";
import { createAskTools, TOOL_NAMES } from "../../../src/server/ask/tools";
import { EvidenceRegistry } from "../../../src/server/ask/evidence";
import { findConnection, sanitizeSearchText, searchText } from "../../../src/server/queries/connection";
import type { CypherRunner } from "../../../src/server/queries/runner";

const INTERACTION_TEXT = "Pelanggan menyebut akan pindah ke KasirPro karena janji fitur belum ditepati";
const nodes: Record<string, { labels: string[]; props: Record<string, unknown> }> = {
  I0331: { labels: ["Interaksi", "Entitas"], props: { id: "I0331", isi: INTERACTION_TEXT, source_file: "interactions.jsonl", source_id: "I0331" } },
  K134: { labels: ["Kontak", "Entitas"], props: { id: "K134", nama: "CFO baru", source_file: "crm_contacts.csv", source_id: "K134" } },
};

/** Fake graph: answers only the queries the tools under test issue. */
const run: CypherRunner = async (query, params = {}) => {
  if (query.includes("db.index.fulltext.queryNodes")) {
    return /kasirpro/i.test(String(params.query)) ? [{ id: "I0331", labels: ["Interaksi", "Entitas"], props: nodes.I0331.props, score: 2.5 }] : [];
  }
  if (query.includes("shortestPath")) {
    return params.from === "I0331" && params.to === "K134" ? [{ nodeIds: ["I0331", "K134"], relationshipTypes: ["DIHADIRI_OLEH"] }] : [];
  }
  if (query.includes("WHERE n.id IN $ids")) {
    return (params.ids as string[]).filter((id) => nodes[id]).map((id) => ({ id, labels: nodes[id].labels, props: nodes[id].props }));
  }
  if (query.includes("(x:Entitas)-[r]->(y:Entitas)")) return [];
  throw new Error(`unexpected query: ${query.slice(0, 60)}`);
};

type Tools = ReturnType<typeof createAskTools>;
const callTool = async (tools: Tools, name: "search_text", input: { query: string }) =>
  (tools[name].execute as (input: { query: string }, options: object) => Promise<unknown>)(input, { toolCallId: "t", messages: [] });

/** Fake LLM: calls search_text for real (so the registry fills up), then replies with the given text. */
const llm = (reply: string, useTool = true): GenerateFn => async ({ tools }) => {
  if (useTool) await callTool(tools, "search_text", { query: "KasirPro" });
  return { text: reply, toolsUsed: useTool ? ["search_text"] : [] };
};

const goodClaim = { text: "Kontak menyebut KasirPro pada I0331", evidenceIds: ["I0331"], quote: "pindah ke KasirPro" };

describe("ask pipeline", () => {
  test("happy path: a claim backed by a tool result passes and the subgraph is built from its evidence IDs", async () => {
    const result = await ask("Siapa yang menyebut KasirPro?", { run, generate: llm(JSON.stringify({ answer: "x", claims: [goodClaim] })) });
    expect(result.refused).toBe(false);
    expect(result.claims.map((c) => c.evidenceIds)).toEqual([["I0331"]]);
    expect(result.graph?.nodes.map((n) => n.id)).toEqual(["I0331"]);
    expect(result.toolsUsed).toEqual(["search_text"]);
    // The free-form `answer` of the model is never shown.
    expect(result.answer).toBe(goodClaim.text);
  });

  test("a claim with an invented ID is discarded while the valid one is kept", async () => {
    const fake = { text: "Ada 7 akun lain yang terdampak", evidenceIds: ["T9999"] };
    const result = await ask("q?", { run, generate: llm(`\`\`\`json\n${JSON.stringify({ answer: "", claims: [goodClaim, fake] })}\n\`\`\``) });
    expect(result.claims).toHaveLength(1);
    expect(result.answer).not.toContain("7 akun");
    expect(result.note).toContain("discarded");
  });

  test("error path: when every claim is invalid the answer is a refusal, not model knowledge", async () => {
    const result = await ask("q?", { run, generate: llm(JSON.stringify({ answer: "tebakan", claims: [{ text: "x", evidenceIds: ["T9999"] }] })) });
    expect(result.refused).toBe(true);
    expect(result.graph).toBeNull();
    expect(result.answer).toContain("preset");
  });

  test("error path: a question that triggers no tool is refused politely", async () => {
    const result = await ask("resep nasi goreng", { run, generate: llm(JSON.stringify({ answer: "Tumis nasi", claims: [goodClaim] }), false) });
    expect(result.refused).toBe(true);
    expect(result.claims).toEqual([]);
  });

  test("error path: a reply with neither JSON nor bracketed IDs is refused", async () => {
    const result = await ask("q?", { run, generate: llm("Maaf, saya tidak tahu.") });
    expect(result.refused).toBe(true);
  });

  test("prose with bracketed IDs becomes claims, and an invented bracketed ID is still dropped", async () => {
    const prose = "1. **Kontak** menyebut KasirPro . [I0331]\nRingkasan tanpa ID.\n- Ada 7 akun lain [T9999]";
    const result = await ask("q?", { run, generate: llm(prose) });
    expect(result.claims).toEqual([{ text: "Kontak menyebut KasirPro.", evidenceIds: ["I0331"] }]);
    expect(result.note).toContain("discarded");
  });
});

describe("tools", () => {
  test("exactly the six fixed tools are registered and run_cypher is not among them", () => {
    const tools = createAskTools({ run, registry: new EvidenceRegistry() });
    expect(Object.keys(tools).sort()).toEqual([...TOOL_NAMES].sort());
    expect(Object.keys(tools)).not.toContain("run_cypher");
  });

  test("search_text registers the returned nodes as citeable evidence with their text", async () => {
    const registry = new EvidenceRegistry();
    const out = (await callTool(createAskTools({ run, registry }), "search_text", { query: "KasirPro" })) as { citeableIds: string[] };
    expect(out.citeableIds).toContain("I0331");
    expect(registry.get("I0331")?.text).toBe(INTERACTION_TEXT);
    expect(registry.has("T9999")).toBe(false);
  });
});

describe("connection queries", () => {
  test("search text is sanitised and an empty query returns nothing", async () => {
    expect(sanitizeSearchText('Kasir"Pro" (v4.12) && x')).toBe("Kasir Pro v4.12 x");
    expect(await searchText(run, "   ")).toEqual([]);
    expect((await searchText(run, "KasirPro"))[0].id).toBe("I0331");
  });

  test("find_connection returns the path, or found:false when there is none", async () => {
    expect(await findConnection(run, "I0331", "K134")).toEqual({ found: true, hops: 1, nodeIds: ["I0331", "K134"], relationshipTypes: ["DIHADIRI_OLEH"] });
    expect((await findConnection(run, "I0331", "ZZZ")).found).toBe(false);
    expect((await findConnection(run, "I0331", "I0331")).found).toBe(false);
  });
});

describe("parseModelJson", () => {
  test("extracts the object from fences and prose, and returns null when there is none", () => {
    expect(parseModelJson('Hasil: {"a":1} selesai')).toEqual({ a: 1 });
    expect(parseModelJson("tidak ada json")).toBeNull();
    expect(parseModelJson("{rusak")).toBeNull();
  });
});

describe("claimsFromBracketedProse", () => {
  test("reads several IDs inside one pair of brackets and keeps separate brackets working", () => {
    const text = "- **Janji:** FEAT-07 akan dirilis Q3 2026. [D-2025-11, FEAT-07]\nPenyetuju: Andi Wiratama. [E01] [D-2025-11]";
    expect(claimsFromBracketedProse(text).claims).toEqual([
      { text: "Janji: FEAT-07 akan dirilis Q3 2026.", evidenceIds: ["D-2025-11", "FEAT-07"] },
      { text: "Penyetuju: Andi Wiratama.", evidenceIds: ["E01", "D-2025-11"] },
    ]);
  });

  test("error path: a line without IDs and a bracket that is not an ID list yield no claim", () => {
    expect(claimsFromBracketedProse("Tidak ada ID di sini.\nCatatan [lihat dokumen ini] saja.").claims).toEqual([]);
  });
});


describe("hasUncitedLines", () => {
  test("detects a substantive line without IDs (citation only at the end of a block)", () => {
    expect(hasUncitedLines("- Janji: integrasi akuntansi akan dirilis Q3 2026.\n- Penyetuju: Andi Wiratama.\n[D-2025-11, E01]")).toBe(true);
  });
  test("a fully cited reply, short headings and blank lines are fine", () => {
    expect(hasUncitedLines("Untuk C01:\n\n- Janji integrasi akuntansi dirilis Q3 2026. [D-2025-11]\n- Penyetuju adalah Andi Wiratama. [E01]")).toBe(false);
  });
});
