import { afterEach, beforeEach, describe, expect, spyOn, test } from "bun:test";
import { EvidenceRegistry } from "../../../src/server/ask/evidence";
import { validateAnswer } from "../../../src/server/ask/validate-citations";
import { PENANDA_VERIFIKASI, PESAN_DITOLAK, renderAnswer } from "../../../src/server/ask/render-answer";
import { getValidationStats, logValidation, resetValidationLog } from "../../../src/server/ask/validation-log";

const registry = new EvidenceRegistry();
registry.add([
  { id: "tiket-7", source_file: "tickets.csv", source_id: "T-007", teks: "Printer struk sering macet sejak update." },
  { id: "email-1", source_file: "emails.csv", source_id: "E-001", teks: "Harga naik 15% tahun ini." },
]);

describe("renderAnswer", () => {
  test("kalimat bebas LLM tanpa bukti tidak muncul di teks tampilan", () => {
    const result = validateAnswer(
      {
        jawaban: "Printer sering macet. Pelanggan PASTI churn bulan depan.",
        klaim: [{ teks: "Printer sering macet.", bukti_ids: ["tiket-7"], kutipan: "sering macet" }],
      },
      registry,
    );
    const out = renderAnswer(result);
    expect(out.ditolak).toBe(false);
    expect(out.jawaban).toBe("Printer sering macet.");
    expect(out.jawaban).not.toContain("PASTI churn");
  });

  test("tidak ada klaim lolos → ditolak dengan pesan preset", () => {
    const result = validateAnswer(
      { jawaban: "Pelanggan akan churn.", klaim: [{ teks: "Pelanggan akan churn.", bukti_ids: ["palsu"] }] },
      registry,
    );
    const out = renderAnswer(result);
    expect(out).toEqual({ jawaban: PESAN_DITOLAK, klaim: [], ditolak: true });
  });

  test("klaim ditandai muncul dengan penanda, setelah klaim lolos", () => {
    const result = validateAnswer(
      {
        klaim: [
          { teks: "Harga naik 40%.", bukti_ids: ["email-1"] },
          { teks: "Printer sering macet.", bukti_ids: ["tiket-7"] },
          { teks: "Tanpa bukti.", bukti_ids: [] },
        ],
      },
      registry,
    );
    const out = renderAnswer(result);
    expect(out.jawaban).toBe(`Printer sering macet.\n${PENANDA_VERIFIKASI} Harga naik 40%.`);
    expect(out.klaim.map((k) => k.teks)).toEqual(["Printer sering macet.", "Harga naik 40%."]);
    expect(out.catatan).toContain("1 klaim perlu verifikasi");
    expect(out.catatan).toContain("1 klaim dibuang");
  });
});

describe("validation-log", () => {
  let infoSpy: ReturnType<typeof spyOn>;
  beforeEach(() => {
    resetValidationLog();
    infoSpy = spyOn(console, "info").mockImplementation(() => {});
  });
  afterEach(() => infoSpy.mockRestore());

  test("statistik per alasan dan jumlah klaim lolos; teks tidak dicatat", () => {
    logValidation(
      validateAnswer(
        {
          klaim: [
            { teks: "Printer sering macet.", bukti_ids: ["tiket-7"] },
            { teks: "RAHASIA tanpa bukti.", bukti_ids: [] },
          ],
        },
        registry,
      ),
    );
    logValidation(validateAnswer({ klaim: [{ teks: "Harga naik 40%.", bukti_ids: ["email-1"] }] }, registry));

    expect(getValidationStats()).toEqual({
      jumlahValidasi: 2,
      klaimLolos: 1,
      perAlasan: { tanpa_bukti: 1, angka_tidak_ditemukan: 1 },
    });
    expect(infoSpy).toHaveBeenCalledTimes(2);
    const logged = infoSpy.mock.calls.map((c: unknown[]) => String(c[0])).join("\n");
    expect(logged).not.toContain("RAHASIA");
    expect(logged).not.toContain("Printer");
    expect(JSON.parse(String(infoSpy.mock.calls[0][0])).lolos).toBe(1);
  });

  test("resetValidationLog mengosongkan state", () => {
    logValidation(validateAnswer({ klaim: [] }, registry));
    resetValidationLog();
    expect(getValidationStats()).toEqual({ jumlahValidasi: 0, klaimLolos: 0, perAlasan: {} });
  });
});
