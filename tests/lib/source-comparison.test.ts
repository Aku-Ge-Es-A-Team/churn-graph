import { describe, expect, test } from "bun:test";
import { compareSources } from "../../src/lib/source-comparison";
import type { GraphEdge, GraphPayload } from "../../src/types/graph";

const edge = (id: string, source: string, target: string, type: string, file: string, props: Record<string, unknown> = {}, derived = false): GraphEdge => ({
  id, source, target, type, props, source_file: file, source_id: `${id}-src`, derived,
});

const node = (id: string, label: string, file: string) => ({ id, label, props: {}, source_file: file, source_id: id });

// A reduced version of the real C01 champion evidence.
const payload: GraphPayload = {
  nodes: [node("K017", "Kontak", "crm_contacts.csv"), node("C01", "Akun", "crm_accounts.csv"), node("P01", "Akun", "crm_accounts.csv")],
  edges: [
    edge("BEKERJA_DI:K017->P01:2026-09-01", "K017", "P01", "BEKERJA_DI", "contact_employment_history.csv", { mulai: "2026-09-01", jabatan: "GM Operations" }),
    edge("CHAMPION_DARI:K017->C01", "K017", "C01", "CHAMPION_DARI", "crm_accounts.csv", { klaim: "crm" }),
    edge("PERNAH_BEKERJA_DI:K017->C01:2021-03-01", "K017", "C01", "PERNAH_BEKERJA_DI", "contact_employment_history.csv", { mulai: "2021-03-01", selesai: "2026-08-15" }),
    edge("MENYEBUT:I1->K017", "K017", "C01", "MENYEBUT", "interactions.jsonl", {}, true),
  ],
  highlight: ["K017"],
  meta: { account: "C01", nodeCount: 3, edgeCount: 4 },
};

describe("compareSources", () => {
  test("champion K017: the CRM claim (Source A) next to the work history (Source B)", () => {
    const c = compareSources(payload, "K017")!;
    expect(c.sourceA.sourceFile).toBe("crm_accounts.csv");
    expect(c.sourceB.sourceFile).toBe("contact_employment_history.csv");
    expect(c.sourceA.records.map((r) => r.title)).toEqual(["CHAMPION_DARI → C01"]);
    expect(c.sourceB.records).toHaveLength(2);
    expect(c.other).toEqual([]);
  });

  test("every record carries file, ID and date (— when the date is missing)", () => {
    const c = compareSources(payload, "K017")!;
    const history = c.sourceB.records.find((r) => r.title.startsWith("PERNAH"))!;
    expect(history).toMatchObject({ sourceFile: "contact_employment_history.csv", sourceId: expect.any(String), date: "2021-03-01" });
    expect(c.sourceA.records[0].date).toBeNull();
  });

  test("derived relationships do not count as a source", () => {
    const onlyDerived: GraphPayload = { ...payload, edges: [payload.edges[3], edge("x", "K017", "C01", "CHAMPION_DARI", "crm_accounts.csv")] };
    expect(compareSources(onlyDerived, "K017")).toBeNull();
  });

  test("error path: a node with a single source → null", () => {
    expect(compareSources(payload, "P01")).toBeNull(); // only BEKERJA_DI touches P01
    expect(compareSources(payload, "does-not-exist")).toBeNull();
  });

  test("a third source goes to `other`", () => {
    const three: GraphPayload = { ...payload, edges: [...payload.edges, edge("t", "K017", "C01", "MEMBUKA_TIKET", "support_tickets.csv")] };
    const c = compareSources(three, "K017")!;
    expect(c.other.map((g) => g.sourceFile)).toEqual(["support_tickets.csv"]);
  });
});
