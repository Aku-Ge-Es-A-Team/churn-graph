import { describe, expect, test } from "bun:test";
import {
  GraphPayloadSchema,
  SinyalSchema,
  validateGraphPayload,
  type GraphPayload,
} from "../../src/types/graph";

function basePayload(): GraphPayload {
  return {
    nodes: [
      { id: "n1", label: "Akun", props: {}, source_file: "crm.csv", source_id: "1" },
      { id: "n2", label: "Klaim", props: {}, source_file: "tiket.csv", source_id: "2" },
    ],
    edges: [
      {
        id: "e1",
        source: "n1",
        target: "n2",
        type: "MENYEBUT",
        props: {},
        source_file: "tiket.csv",
        source_id: "2",
        derived: false,
      },
    ],
    meta: { akun: "C01", jumlahNode: 2, jumlahRelasi: 1 },
  };
}

describe("validateGraphPayload", () => {
  test("payload valid lolos", () => {
    const result = validateGraphPayload(basePayload());
    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
  });

  test("node duplikat ditolak", () => {
    const payload = basePayload();
    payload.nodes.push({ ...payload.nodes[0] });
    const result = validateGraphPayload(payload);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes("duplikat"))).toBe(true);
  });

  test("edge menunjuk node yang tidak ada ditolak", () => {
    const payload = basePayload();
    payload.edges[0].target = "tidak-ada";
    const result = validateGraphPayload(payload);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes("tidak ada"))).toBe(true);
  });

  test("node tanpa source_file ditolak", () => {
    const payload = basePayload();
    payload.nodes[0].source_file = "";
    const result = validateGraphPayload(payload);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes("source_file"))).toBe(true);
  });
});

describe("GraphPayloadSchema", () => {
  test("payload valid lolos parse zod", () => {
    expect(GraphPayloadSchema.safeParse(basePayload()).success).toBe(true);
  });
});

describe("SinyalSchema", () => {
  const sinyalValid = {
    akun: "C01",
    kode: "USAGE_TURUN",
    bobot: 0.5,
    bukti_ids: ["e1"],
    fakta: "Penggunaan turun 40% dalam 2 bulan",
    sejak: "2026-09-01",
  };

  test("sinyal valid lolos", () => {
    expect(SinyalSchema.safeParse(sinyalValid).success).toBe(true);
  });

  test("bukti_ids kosong ditolak", () => {
    const result = SinyalSchema.safeParse({ ...sinyalValid, bukti_ids: [] });
    expect(result.success).toBe(false);
  });

  test("sejak format salah ditolak", () => {
    const result = SinyalSchema.safeParse({ ...sinyalValid, sejak: "01-09-2026" });
    expect(result.success).toBe(false);
  });
});
