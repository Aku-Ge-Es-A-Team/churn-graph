import { describe, expect, test } from "bun:test";
import { UsageAggregator } from "../../scripts/etl/aggregate";
import { assertUniqueIds } from "../../scripts/etl/build";
import {
  compareDealContract,
  isIsoDate,
  parseDecisionValue,
  parseLimit,
  parseYesNo,
  reconcileAccountContract,
  slug,
  templateTexts,
} from "../../scripts/etl/clean";
import { extractCsv, extractJsonl } from "../../scripts/etl/extract";
import { buildEmailIndex, parseAlias } from "../../scripts/etl/resolve";
import * as S from "../../scripts/etl/schemas";
import { EtlError, type EtlNode } from "../../scripts/etl/types";

describe("normalizer", () => {
  test("ISO date: format and calendar", () => {
    expect(isIsoDate("2026-10-01")).toBe(true);
    expect(isIsoDate("2026-02-30")).toBe(false);
    expect(isIsoDate("01/10/2026")).toBe(false);
  });

  test("mode_offline_aktif ya/tidak → boolean, anything else null", () => {
    expect(parseYesNo("ya")).toBe(true);
    expect(parseYesNo(" Tidak ")).toBe(false);
    expect(parseYesNo("mungkin")).toBeNull();
  });

  test("batas_outlet_paket: a number or 'tanpa batas'", () => {
    expect(parseLimit("25")).toEqual({ limit: 25, unlimited: false });
    expect(parseLimit("tanpa batas")).toEqual({ limit: null, unlimited: true });
    expect(parseLimit("banyak")).toBeNull();
  });

  test("decision_log.nilai is read according to the type", () => {
    expect(parseDecisionValue("diskon", "15%")).toEqual({ nilai_teks: "15%", nilai_persen: 15 });
    expect(parseDecisionValue("pengecualian", "Tempo bayar 14 hari")).toEqual({ nilai_teks: "Tempo bayar 14 hari", nilai_persen: null });
    expect(parseDecisionValue("diskon", "Tempo bayar 14 hari")).toBeNull(); // error path: a discount that is not a percentage
  });

  test("template: threshold is exactly 5 occurrences", () => {
    const four = Array(4).fill("Fine.");
    const five = Array(5).fill("Fine.");
    expect(templateTexts(four).size).toBe(0);
    expect([...templateTexts(five)]).toEqual(["Fine."]);
    expect(templateTexts(["", "", "", "", "", ""]).size).toBe(0); // empty text is not a template
  });

  test("slug for derived IDs", () => {
    expect(slug("PT Teknologi Kasir Prima")).toBe("pt-teknologi-kasir-prima");
    expect(slug("Café & Co.")).toBe("cafe-co");
  });
});

describe("reconciliation: the contract value wins", () => {
  test("package and outlet-count conflicts are recorded, the contract value is used", () => {
    const r = reconcileAccountContract({ account_id: "CX", paket: "Starter", jumlah_outlet: 8 }, { paket: "Growth", outlet_kontrak: 12 });
    expect(r.paket).toBe("Growth");
    expect(r.jumlah_outlet).toBe(12);
    expect(r.conflicts.map((k) => k.field)).toEqual(["paket", "jumlah_outlet"]);
  });

  test("no conflict when equal; without a contract → the CRM value", () => {
    expect(reconcileAccountContract({ account_id: "CX", paket: "Growth", jumlah_outlet: 12 }, { paket: "growth", outlet_kontrak: 12 }).conflicts).toEqual([]);
    expect(reconcileAccountContract({ account_id: "P01", paket: null, jumlah_outlet: 60 }, undefined).jumlah_outlet).toBe(60);
  });

  test("deal vs contract difference: explained by discount or not", () => {
    expect(compareDealContract({ deal_id: "D1", nilai_tahunan: 100 }, { nilai_tahunan: 100, diskon_pct: 10 })).toBeNull();
    expect(compareDealContract({ deal_id: "D1", nilai_tahunan: 88_200_000 }, { nilai_tahunan: 79_380_000, diskon_pct: 10 })?.note).toBe("explained by discount 10%");
    expect(compareDealContract({ deal_id: "D1", nilai_tahunan: 100 }, { nilai_tahunan: 70, diskon_pct: 10 })?.note).toBe("difference not explained by discount");
  });
});

describe("extract + zod", () => {
  test("failed rows are recorded with a reason, the ETL does not crash, rows = passed + failed; versions stay strings", () => {
    const text = "versi,tanggal_rilis\r\n4.10,2025-09-15\r\n4.11,not-a-date\r\n4.12\r\n";
    const accepted: string[] = [];
    const st = extractCsv(S.RELEASE, text, (r) => accepted.push(r.versi));
    expect(st.rows).toBe(3);
    expect(st.passed).toBe(1);
    expect(st.failed).toBe(2);
    expect(st.rows).toBe(st.passed + st.failed);
    expect(accepted).toEqual(["4.10"]); // not 4.1
    expect(st.failure_examples[0].id).toBe("4.11");
    expect(st.failure_examples[0].reason).toContain("tanggal_rilis");
  });

  test("a missing column stops the ETL with a clear message", () => {
    expect(() => extractCsv(S.RELEASE, "versi\n4.10\n", () => {})).toThrow(/missing columns: tanggal_rilis/);
  });

  test("a file without data rows → EtlError", () => {
    expect(() => extractCsv(S.RELEASE, "versi,tanggal_rilis\n", () => {})).toThrow(EtlError);
  });

  test("JSONL: broken and invalid rows are recorded", () => {
    const ok = JSON.stringify({ interaction_id: "I1", tanggal: "2026-01-02", tipe: "email", account_id: "C01", dari: "a@x.id", ke: "", peserta: "K1;E1", subjek: "s", isi: "hello", membalas_id: "" });
    const wrongType = JSON.stringify({ interaction_id: "I2", tanggal: "2026-01-02", tipe: "sms", account_id: "", dari: "", ke: "", peserta: "", subjek: "", isi: "", membalas_id: "" });
    const rows: string[] = [];
    const st = extractJsonl(S.INTERACTION, [ok, "{not json", wrongType].join("\n"), (r) => rows.push(r.interaction_id));
    expect([st.rows, st.passed, st.failed]).toEqual([3, 1, 2]);
    expect(rows).toEqual(["I1"]);
  });

  test("USAGE: an empty offline cell = null (not 0); version stays a string", () => {
    const rows: { off: number | null; v: string }[] = [];
    extractCsv(S.USAGE, "tanggal,outlet_id,account_id,versi_aplikasi,jumlah_transaksi,transaksi_offline_tersinkron\n2026-01-01,C01-O01,C01,4.10,120,\n2026-01-02,C01-O02,C01,4.10,90,7\n", (r) => rows.push({ off: r.transaksi_offline_tersinkron, v: r.versi_aplikasi }));
    expect(rows).toEqual([{ off: null, v: "4.10" }, { off: 7, v: "4.10" }]);
  });

  test("CONTRACT: 'tanpa batas' is accepted, other text is rejected", () => {
    const header = "contract_id,account_id,paket,outlet_kontrak,batas_outlet_paket,mulai,tanggal_renewal,harga_per_outlet_bulan,diskon_pct,nilai_tahunan,keterlambatan_bayar_12bln,decision_id\n";
    const result: { limit: number | null; unlimited: boolean }[] = [];
    const st = extractCsv(S.CONTRACT, header + "K-1,C1,Enterprise,42,tanpa batas,2025-12-15,2026-12-15,350000,15,149940000,0,\nK-2,C2,Growth,25,banyak,2026-03-01,2027-03-01,350000,5,99750000,0,\n", (r) => result.push({ limit: r.batas_outlet_paket, unlimited: r.tanpa_batas }));
    expect(result).toEqual([{ limit: null, unlimited: true }]);
    expect(st.failed).toBe(1);
  });
});

describe("UsageBulan aggregation", () => {
  const row = (date: string, transactions: number, offline: number | null, version = "4.10") => ({ tanggal: date, outlet_id: "O1", account_id: "C1", versi_aplikasi: version, jumlah_transaksi: transactions, transaksi_offline_tersinkron: offline });

  test("Oct–Dec 2025 baseline, delta for other months, offline null stays null", () => {
    const a = new UsageAggregator();
    for (const t of ["2025-10-01", "2025-11-01", "2025-12-01"]) a.add(row(t, 100, null));
    a.add(row("2026-08-01", 70, null, "4.12"));
    const [o] = a.finish();
    const august = o.months.find((m) => m.bulan === "2026-08")!;
    expect(august.baseline_rata_harian).toBe(100);
    expect(august.delta_pct).toBe(-30);
    expect(august.total_offline_tersinkron).toBeNull();
    expect(august.versi_utama).toBe("4.12");
    expect(o.versionSince).toEqual({ "4.10": "2025-10-01", "4.12": "2026-08-01" });
  });

  test("offline: the total counts only days that have a number", () => {
    const a = new UsageAggregator();
    a.add(row("2026-06-01", 10, 5));
    a.add(row("2026-06-02", 10, 0));
    const [o] = a.finish();
    expect(o.months[0].total_offline_tersinkron).toBe(5);
  });
});

describe("email resolution", () => {
  const contacts = [
    { contact_id: "K1", email: "Rina@Mandala.id" },
    { contact_id: "K2", email: "double@x.id" },
    { contact_id: "K3", email: "double@x.id" },
  ];
  const employees = [{ employee_id: "E1", email: "sari@kasirnusa.id" }];

  test("exact match is case-insensitive", () => {
    const idx = buildEmailIndex(contacts, employees);
    expect(idx.lookup("rina@mandala.id")).toEqual({ id: "K1", label: "Kontak" });
    expect(idx.lookup("SARI@kasirnusa.id")).toEqual({ id: "E1", label: "Karyawan" });
  });

  test("unknown and ambiguous emails are not guessed", () => {
    const idx = buildEmailIndex(contacts, employees);
    expect(idx.lookup("rina.hapsari@kopilintas.co.id")).toBeNull();
    expect(idx.lookup("double@x.id")).toBeNull();
    expect(idx.ambiguous.get("double@x.id")).toEqual(["K2", "K3"]);
  });

  test("a manual alias resolves an old email", () => {
    const aliases = parseAlias("email,entity_id\nrina.hapsari@kopilintas.co.id,K1\n,\n");
    const idx = buildEmailIndex(contacts, employees, aliases);
    expect(idx.lookup("rina.hapsari@kopilintas.co.id")?.id).toBe("K1");
  });
});

describe("globally unique IDs", () => {
  const node = (id: string, label: string): EtlNode => ({ key: id, id, label, sumber: "crm", source_file: "x.csv", source_id: id, props: {} });

  test("the same ID across labels stops the ETL", () => {
    expect(() => assertUniqueIds([node("X1", "Akun"), node("X1", "Kontak")])).toThrow(/Duplicate IDs.*X1 \(Akun, Kontak\)/);
  });

  test("distinct IDs pass", () => {
    expect(() => assertUniqueIds([node("A", "Akun"), node("B", "Kontak")])).not.toThrow();
  });
});
