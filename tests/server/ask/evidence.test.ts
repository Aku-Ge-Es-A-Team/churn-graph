import { describe, expect, test } from "bun:test";
import {
  EvidenceRegistry,
  collectEvidence,
  evidenceFromGraphPayload,
} from "../../../src/server/ask/evidence";
import type { GraphPayload } from "../../../src/types/graph";

const base = { source_file: "emails.csv", source_id: "E-001" };

describe("EvidenceRegistry", () => {
  test("ID sama digabung tanpa menghapus teks", () => {
    const r = new EvidenceRegistry();
    r.add({ id: "a", ...base, teks: "isi asli" });
    r.add({ id: "a", ...base, teks: "" });
    r.add({ id: "a", ...base });
    expect(r.size).toBe(1);
    expect(r.get("a")?.teks).toBe("isi asli");
  });

  test("teks kosong terisi oleh item berikutnya dengan ID sama", () => {
    const r = new EvidenceRegistry();
    r.add({ id: "a", ...base });
    r.add([{ id: "a", ...base, teks: "isi baru" }]);
    expect(r.get("a")?.teks).toBe("isi baru");
    expect(r.has("a")).toBe(true);
    expect(r.ids()).toEqual(["a"]);
  });
});

describe("collectEvidence", () => {
  test("tidak melempar error untuk hasil tool berbentuk aneh", () => {
    const r = new EvidenceRegistry();
    const accepted = collectEvidence(
      [
        null,
        undefined,
        1,
        "x",
        {},
        { data: [] },
        { evidence: "bukan array" },
        { evidence: [null, 5, { id: "tanpa-sumber" }, { id: "", ...base }, { id: "ok", ...base, teks: "t" }] },
      ],
      r,
    );
    expect(accepted).toBe(1);
    expect(r.ids()).toEqual(["ok"]);
    expect(collectEvidence(null, r)).toBe(0);
    expect(collectEvidence({ evidence: [] }, r)).toBe(0);
  });
});

describe("evidenceFromGraphPayload", () => {
  test("menghasilkan item dengan source_file dan source_id terisi", () => {
    const payload: GraphPayload = {
      nodes: [
        { id: "n1", label: "Tiket", props: { judul: "Printer macet", deskripsi: "Sejak update", jumlah: 3 }, source_file: "tickets.csv", source_id: "T-1" },
        { id: "n2", label: "UsageBulan", props: { transaksi: 1200 }, source_file: "usage.csv", source_id: "U-1" },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2", type: "MENYEBUT", props: {}, source_file: "tickets.csv", source_id: "T-1", derived: false },
      ],
      meta: { akun: "C01", jumlahNode: 2, jumlahRelasi: 1 },
    };
    const items = evidenceFromGraphPayload(payload);
    expect(items.map((i) => i.id)).toEqual(["n1", "n2", "e1"]);
    for (const i of items) {
      expect(i.source_file).not.toBe("");
      expect(i.source_id).not.toBe("");
    }
    expect(items[0].teks).toBe("Printer macet\nSejak update");
    expect(items[1].teks).toBeUndefined();
    expect(items[1].props).toEqual({ transaksi: 1200 });
  });
});
