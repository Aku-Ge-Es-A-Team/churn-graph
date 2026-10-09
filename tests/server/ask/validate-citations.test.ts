import { describe, expect, test } from "bun:test";
import { EvidenceRegistry } from "../../../src/server/ask/evidence";
import { validateAnswer, type ValidationResult } from "../../../src/server/ask/validate-citations";

function makeRegistry(): EvidenceRegistry {
  const r = new EvidenceRegistry();
  r.add([
    {
      id: "email-1",
      source_file: "emails.csv",
      source_id: "E-001",
      teks: "Kami   mempertimbangkan\npindah ke vendor lain karena harga naik 15%.",
    },
    { id: "tiket-7", source_file: "tickets.csv", source_id: "T-007", teks: "Printer struk sering macet sejak update." },
    {
      id: "usage-c01",
      source_file: "usage.csv",
      source_id: "U-C01-2026-08",
      props: { transaksi: 1200, turun_persen: 40 },
    },
    { id: "meeting-2", source_file: "meetings.csv", source_id: "M-002", teks: "Pelanggan bilang “layanan lambat” minggu lalu." },
    { id: "kontrak-c01", source_file: "contracts.csv", source_id: "K-C01", teks: "Nilai kontrak tahunan Rp 252 juta." },
  ]);
  return r;
}

// Semua hasil dikumpulkan untuk tes properti di akhir file.
const allResults: ValidationResult[] = [];
function run(input: unknown): ValidationResult {
  const result = validateAnswer(input, makeRegistry());
  allResults.push(result);
  return result;
}
const one = (klaim: unknown) => run({ jawaban: "x", klaim: [klaim] });

describe("validateAnswer — aturan per klaim", () => {
  test("bukti valid dan kutipan substring → lolos", () => {
    const r = one({ teks: "Pelanggan mempertimbangkan pindah vendor.", bukti_ids: ["email-1"], kutipan: "pindah ke vendor lain" });
    expect(r.klaimLolos).toHaveLength(1);
    expect(r.valid).toBe(true);
  });

  test("bukti_ids kosong → dibuang tanpa_bukti", () => {
    const r = one({ teks: "Pelanggan akan churn.", bukti_ids: [] });
    expect(r.klaimDibuang[0].alasan).toEqual(["tanpa_bukti"]);
    expect(r.valid).toBe(false);
  });

  test("satu ID palsu di antara ID valid → dibuang bukti_tidak_dikenal, ID palsu disebut", () => {
    const r = one({ teks: "Pelanggan kecewa.", bukti_ids: ["email-1", "palsu-9"] });
    expect(r.klaimDibuang[0].alasan).toEqual(["bukti_tidak_dikenal"]);
    expect(r.klaimDibuang[0].idBermasalah).toEqual(["palsu-9"]);
  });

  test("kutipan karangan → dibuang kutipan_tidak_cocok", () => {
    const r = one({ teks: "Pelanggan kecewa.", bukti_ids: ["email-1"], kutipan: "akan membatalkan kontrak bulan depan" });
    expect(r.klaimDibuang[0].alasan).toEqual(["kutipan_tidak_cocok"]);
  });

  test("kutipan sama tapi spasi/baris baru berbeda → lolos", () => {
    const r = one({ teks: "Pelanggan mempertimbangkan pindah.", bukti_ids: ["email-1"], kutipan: "Kami mempertimbangkan pindah" });
    expect(r.klaimLolos).toHaveLength(1);
  });

  test("tanda kutip lengkung vs lurus → lolos", () => {
    const r = one({ teks: "Pelanggan mengeluh layanan.", bukti_ids: ["meeting-2"], kutipan: 'bilang "layanan lambat"' });
    expect(r.klaimLolos).toHaveLength(1);
  });

  test("kutipan hanya beda huruf besar-kecil → dibuang", () => {
    const r = one({ teks: "Pelanggan mempertimbangkan pindah.", bukti_ids: ["email-1"], kutipan: "kami mempertimbangkan pindah" });
    expect(r.klaimDibuang[0].alasan).toEqual(["kutipan_tidak_cocok"]);
  });

  test("kutipan merujuk bukti tanpa teks → dibuang kutipan_tanpa_teks_sumber", () => {
    const r = one({ teks: "Penggunaan turun.", bukti_ids: ["usage-c01"], kutipan: "transaksi turun drastis" });
    expect(r.klaimDibuang[0].alasan).toEqual(["kutipan_tanpa_teks_sumber"]);
  });

  test("kutipan < 8 karakter → ditandai, bukan dibuang", () => {
    const r = one({ teks: "Pelanggan menyebut harga.", bukti_ids: ["email-1"], kutipan: "harga" });
    expect(r.klaimDibuang).toHaveLength(0);
    expect(r.klaimLolos).toHaveLength(0);
    expect(r.klaimDitandai[0].alasan).toEqual(["kutipan_terlalu_pendek"]);
  });

  test("angka tidak ada di bukti → ditandai angka_tidak_ditemukan", () => {
    const r = one({ teks: "Harga naik 20%.", bukti_ids: ["email-1"] });
    expect(r.klaimDitandai[0].alasan).toEqual(["angka_tidak_ditemukan"]);
  });

  test('"15 %" vs "15%" → tidak ditandai', () => {
    const r = one({ teks: "Harga naik 15 %.", bukti_ids: ["email-1"] });
    expect(r.klaimLolos).toHaveLength(1);
  });

  test("angka ditemukan di props bukti → tidak ditandai", () => {
    const r = one({ teks: "Transaksi turun 40% menjadi 1.200.", bukti_ids: ["usage-c01"] });
    expect(r.klaimLolos).toHaveLength(1);
  });

  test('"Rp 252 jt" vs "Rp 252 juta" → tidak ditandai', () => {
    const r = one({ teks: "Nilai tahunan Rp 252 jt.", bukti_ids: ["kontrak-c01"] });
    expect(r.klaimLolos).toHaveLength(1);
  });

  test("kutipan asli dari bukti A tapi klaim hanya merujuk bukti B → dibuang", () => {
    const r = one({ teks: "Pelanggan ingin pindah.", bukti_ids: ["tiket-7"], kutipan: "pindah ke vendor lain" });
    expect(r.klaimDibuang[0].alasan).toEqual(["kutipan_tidak_cocok"]);
  });

  test("campuran klaim valid dan tidak valid → valid true, daftar terpisah", () => {
    const r = run({
      klaim: [
        { teks: "Printer sering macet.", bukti_ids: ["tiket-7"] },
        { teks: "Pelanggan pasti churn.", bukti_ids: [] },
        { teks: "Harga naik 99%.", bukti_ids: ["email-1"] },
      ],
    });
    expect(r.valid).toBe(true);
    expect(r.klaimLolos.map((k) => k.teks)).toEqual(["Printer sering macet."]);
    expect(r.klaimDitandai.map((d) => d.klaim.teks)).toEqual(["Harga naik 99%."]);
    expect(r.klaimDibuang).toHaveLength(1);
  });
});

describe("validateAnswer — input rusak dari LLM", () => {
  const rusak: unknown[] = [
    null,
    undefined,
    "",
    "jawaban teks biasa",
    42,
    [],
    {},
    { jawaban: "x" },
    { klaim: "bukan array" },
    { klaim: null },
    {
      klaim: [
        null,
        1,
        "x",
        { teks: "tanpa bukti_ids" },
        { bukti_ids: ["email-1"] },
        { teks: "", bukti_ids: ["email-1"] },
        { teks: "   ", bukti_ids: ["email-1"] },
        { teks: 5, bukti_ids: "email-1" },
        { teks: "id bukan string", bukti_ids: [1, 2] },
      ],
    },
  ];

  test.each(rusak.map((x) => [x]))("tidak melempar error dan hasil aman: %p", (input: unknown) => {
    const r = run(input);
    expect(r.valid).toBe(false);
    expect(r.klaimLolos).toEqual([]);
    expect(r.klaimDitandai).toEqual([]);
  });
});

describe("properti", () => {
  test("tidak ada klaim lolos/ditandai dengan bukti_ids kosong atau di luar registry", () => {
    const known = new Set(makeRegistry().ids());
    expect(allResults.length).toBeGreaterThan(20);
    for (const r of allResults) {
      const tampil = [...r.klaimLolos, ...r.klaimDitandai.map((d) => d.klaim)];
      for (const k of tampil) {
        expect(k.bukti_ids.length).toBeGreaterThan(0);
        for (const id of k.bukti_ids) expect(known.has(id)).toBe(true);
      }
    }
  });
});
