import { describe, expect, test } from "bun:test";
import { EvidenceRegistry, collectEvidence, evidenceFromGraphPayload } from "../../../src/server/ask/evidence";
import type { GraphPayload } from "../../../src/types/graph";

const base = { source_file: "emails.csv", source_id: "E-001" };

describe("EvidenceRegistry", () => {
  test("items with the same ID are merged without losing text", () => {
    const r = new EvidenceRegistry();
    r.add({ id: "a", ...base, text: "original body" });
    r.add({ id: "a", ...base, text: "" });
    r.add({ id: "a", ...base });
    expect(r.size).toBe(1);
    expect(r.get("a")?.text).toBe("original body");
  });

  test("empty text is filled by a later item with the same ID", () => {
    const r = new EvidenceRegistry();
    r.add({ id: "a", ...base });
    r.add([{ id: "a", ...base, text: "new body" }]);
    expect(r.get("a")?.text).toBe("new body");
    expect(r.has("a")).toBe(true);
    expect(r.ids()).toEqual(["a"]);
  });
});

describe("collectEvidence", () => {
  test("does not throw on oddly shaped tool results", () => {
    const r = new EvidenceRegistry();
    const accepted = collectEvidence(
      [null, undefined, 1, "x", {}, { data: [] }, { evidence: "not an array" }, { evidence: [null, 5, { id: "no-source" }, { id: "", ...base }, { id: "ok", ...base, text: "t" }] }],
      r,
    );
    expect(accepted).toBe(1);
    expect(r.ids()).toEqual(["ok"]);
    expect(collectEvidence(null, r)).toBe(0);
    expect(collectEvidence({ evidence: [] }, r)).toBe(0);
  });
});

describe("evidenceFromGraphPayload", () => {
  test("produces items with source_file and source_id filled in", () => {
    const payload: GraphPayload = {
      nodes: [
        { id: "n1", label: "Tiket", props: { judul: "Printer jams", deskripsi: "Since the update", count: 3 }, source_file: "tickets.csv", source_id: "T-1" },
        { id: "n2", label: "UsageBulan", props: { transactions: 1200 }, source_file: "usage.csv", source_id: "U-1" },
      ],
      edges: [{ id: "e1", source: "n1", target: "n2", type: "MENYEBUT", props: {}, source_file: "tickets.csv", source_id: "T-1", derived: false }],
      highlight: ["n1"],
      meta: { account: "C01", nodeCount: 2, edgeCount: 1 },
    };
    const items = evidenceFromGraphPayload(payload);
    expect(items.map((i) => i.id)).toEqual(["n1", "n2", "e1"]);
    for (const i of items) {
      expect(i.source_file).not.toBe("");
      expect(i.source_id).not.toBe("");
    }
    expect(items[0].text).toBe("Printer jams\nSince the update");
    expect(items[1].text).toBeUndefined();
    expect(items[1].props).toEqual({ transactions: 1200 });
  });
});
