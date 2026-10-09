// ETL golden test (F-01 T01-08): runs against the real dataset in data/raw.
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { RAW_DEFAULT, runEtl } from "../../scripts/etl/index";
import { EtlError, type EtlEdge, type EtlNode } from "../../scripts/etl/types";

let tmp: string;
let result: ReturnType<typeof runEtl>;
let node: Map<string, EtlNode>;
let edge: Map<string, EtlEdge>;

beforeAll(() => {
  tmp = mkdtempSync(join(tmpdir(), "etl-golden-"));
  result = runEtl({ outDir: join(tmp, "run1") });
  node = new Map(result.nodes.map((n) => [n.id, n]));
  edge = new Map(result.edges.map((e) => [e.key, e]));
});

afterAll(() => rmSync(tmp, { recursive: true, force: true }));

describe("source counts (F-01 acceptance)", () => {
  test("14 files: rows = passed + failed, all passed", () => {
    expect(result.report.files).toHaveLength(14);
    for (const f of result.report.files) {
      expect(f.rows).toBe(f.passed + f.failed);
      expect(f.failed).toBe(0);
    }
    const rows = Object.fromEntries(result.report.files.map((f) => [f.file, f.rows]));
    expect(rows["crm_accounts.csv"]).toBe(45);
    expect(rows["interactions.jsonl"]).toBe(350);
    expect(rows["product_usage_daily.csv"]).toBe(226_300);
  });

  test("nodes per label match the source row counts; UsageBulan = 620 × 12", () => {
    expect(result.report.nodes_by_label).toEqual({
      Akun: 45, Anomali: 11, Bug: 4, Deal: 22, Fitur: 8, Interaksi: 350, Karyawan: 10, Keputusan: 30, Kompetitor: 1,
      Kontak: 160, Kontrak: 40, Organisasi: 13, Outlet: 620, Rilis: 3, Tiket: 640, UsageBulan: 7440,
    });
  });

  test("318 of 350 interactions are flagged as templates (not dropped)", () => {
    const templates = result.nodes.filter((n) => n.label === "Interaksi" && n.props.template === true);
    expect(templates).toHaveLength(318);
    expect(result.report.interaction_templates).toEqual({ count: 318, total: 350, threshold: 5 });
  });

  test("every node and relation carries source_file + source_id; IDs are unique; no relations dropped", () => {
    for (const n of result.nodes) {
      expect(n.source_file).toBeTruthy();
      expect(n.source_id).toBeTruthy();
    }
    for (const e of result.edges) {
      expect(e.source_file).toBeTruthy();
      expect(e.source_id).toBeTruthy();
      expect(e.derived).toBe("rule" in e.props); // derived relations (F-03) always carry rule + confidence
      expect(node.has(e.from) && node.has(e.to)).toBe(true);
    }
    expect(new Set(result.nodes.map((n) => n.id)).size).toBe(result.nodes.length);
    expect(result.report.dropped_relations).toEqual([]);
  });
});

describe("reconciliation and dirty data (Brief §3.3)", () => {
  test("CRM vs contract: 0 conflicts; every deal vs contract difference is explained by discount", () => {
    expect(result.report.reconciliation.account_contract_conflicts).toEqual([]);
    const differences = result.report.reconciliation.deal_contract_differences;
    expect(differences).toHaveLength(7);
    expect(differences.every((s) => s.note?.startsWith("explained by discount"))).toBe(true);
  });

  test("version 4.10 stays a string; limit 'tanpa batas' → null + flag; decision value by type", () => {
    expect(node.get("v4.12")?.props.versi).toBe("4.12");
    expect(result.nodes.some((n) => n.label === "UsageBulan" && n.props.versi_utama === "4.10")).toBe(true);
    expect(node.get("K-C01")?.props).toMatchObject({ batas_outlet_paket: null, tanpa_batas: true });
    expect(node.get("K-C02")?.props).toMatchObject({ batas_outlet_paket: 25, tanpa_batas: false });
    expect(node.get("D-2025-11")?.props).toMatchObject({ nilai_teks: "15%", nilai_persen: 15 });
    expect(node.get("D-2026-03")?.props).toMatchObject({ nilai_teks: "Tempo bayar 14 hari", nilai_persen: null });
  });

  test("empty offline = null: outlets without offline are null, C03 offline is measured", () => {
    expect(node.get("USG-C01-O01-2026-08")?.props.total_offline_tersinkron).toBeNull();
    const total = (month: string) =>
      [1, 2, 3, 4, 5, 6].reduce((s, i) => s + (node.get(`USG-C03-O0${i}-${month}`)!.props.total_offline_tersinkron as number), 0);
    expect([total("2026-06"), total("2026-08"), total("2026-09")]).toEqual([8056, 926, 887]);
  });

  test("usage delta of the 6 offline C03 outlets in Aug 2026: −34% to −36%", () => {
    for (let i = 1; i <= 6; i++) {
      const d = node.get(`USG-C03-O0${i}-2026-08`)!.props.delta_pct as number;
      expect(d).toBeLessThan(-33.5);
      expect(d).toBeGreaterThan(-36.5);
    }
  });

  test("tickets T0531/T0600/T0636 record 4.12 although their offline outlet never ran 4.12 in usage", () => {
    const neverInUsage = result.report.ticket_vs_usage_versions.never_in_usage;
    const offlineOutsideC03C05 = neverInUsage.filter((t) => t.outlet_offline && !/^C0[35]-/.test(t.outlet)).map((t) => t.ticket);
    expect(offlineOutsideC03C05).toEqual(["T0531", "T0600", "T0636"]);
    expect(node.get("T0531")?.props.versi_usage).toBe("4.11");
  });

  test("Rina's old email is not guessed: recorded 6× for F-16", () => {
    const rina = result.report.unresolved_emails.find((e) => e.email === "rina.hapsari@kopilintas.co.id");
    expect(rina?.count).toBe(6);
    expect(rina?.interactions).toContain("I0290");
    expect(edge.has("TERLIBAT_DI:E03->I0224:pengirim")).toBe(true);
    expect([...edge.keys()].some((k) => k.startsWith("TERLIBAT_DI:") && k.includes("->I0224:penerima"))).toBe(false);
  });

  test("stale CRM champion detected (C01/K017 → P01) without changing the CRM claim", () => {
    expect(result.report.stale_crm_champions).toEqual([{ account: "C01", contact: "K017", ended: "2026-08-15", moved_to: ["P01"] }]);
    expect(edge.get("CHAMPION_DARI:K017->C01")?.props).toEqual({ klaim: "crm" });
  });
});

describe("C01 evidence path readiness (material for 'which account is most at risk, and why?')", () => {
  test("champion moved: PERNAH_BEKERJA_DI C01 (ended) and a dated BEKERJA_DI P01", () => {
    expect(edge.get("PERNAH_BEKERJA_DI:K017->C01:2021-03-01")?.props).toMatchObject({ selesai: "2026-08-15", jabatan: "Head of Operations" });
    expect(edge.get("BEKERJA_DI:K017->P01:2026-09-01")?.props).toMatchObject({ jabatan: "GM Operations" });
    expect(edge.has("MEMILIKI:P01->DL-001")).toBe(true);
  });

  test("broken promise: E01 → D-2025-11 → FEAT-07 (not fulfilled), based on I0061 and the contract", () => {
    expect(edge.has("MENYETUJUI:E01->D-2025-11")).toBe(true);
    expect(edge.get("MENJANJIKAN:D-2025-11->FEAT-07")?.props).toEqual({ status_janji: "Belum ditepati" });
    expect(edge.has("DIDASARKAN_PADA:D-2025-11->I0061")).toBe(true);
    expect(edge.has("DIDASARKAN_PADA:K-C01->D-2025-11")).toBe(true);
    expect(node.get("FEAT-07")?.props.target_terkini).toBe("Belum ditetapkan");
  });

  test("new CFO K134 in meeting I0331 about C01; C01 integration tickets linked to the account and the reporter", () => {
    expect(edge.has("TERLIBAT_DI:K134->I0331:peserta")).toBe(true);
    expect(edge.has("TENTANG:I0331->C01")).toBe(true);
    for (const t of ["T0382", "T0407", "T0537"]) {
      expect(edge.get(`MEMBUKA_TIKET:C01->${t}`)?.props).toEqual({ tanpa_outlet: true });
      expect(edge.has(`MEMBUKA_TIKET:K050->${t}`)).toBe(true);
    }
  });

  test("source sufficiency within ≤2 hops: C01 reaches 6 sources; the other focus accounts ≥ 3", () => {
    const coverage = new Map(result.report.evidence_path_coverage.map((x) => [x.account, x]));
    expect(coverage.get("C01")?.source_count).toBe(6);
    for (const a of ["C02", "C03", "C04", "C05", "C06"]) expect(coverage.get(a)!.source_count).toBeGreaterThanOrEqual(3);
  });
});

describe("determinism and error paths", () => {
  test("two runs produce identical files", () => {
    runEtl({ outDir: join(tmp, "run2") });
    for (const f of ["nodes.jsonl", "edges.jsonl", "quality-report.json"]) {
      expect(readFileSync(join(tmp, "run2", f), "utf8")).toBe(readFileSync(join(tmp, "run1", f), "utf8"));
    }
  });

  test("a missing required file → EtlError naming the file", () => {
    const empty = join(tmp, "empty");
    mkdirSync(empty);
    expect(() => runEtl({ rawDir: empty, outDir: join(tmp, "x"), write: false })).toThrow(EtlError);
    expect(() => runEtl({ rawDir: empty, outDir: join(tmp, "x"), write: false })).toThrow(/crm_accounts\.csv/);
  });

  test("a broken row in a test copy lands in the report; the ETL does not crash and that row does not become a node", () => {
    const copy = join(tmp, "raw-broken");
    cpSync(RAW_DEFAULT, copy, { recursive: true });
    const path = join(copy, "crm_deals.csv");
    writeFileSync(path, readFileSync(path, "utf8").replace("2026-09-11", "11/09/2026")); // DL-001: stage_sejak is not ISO
    const r = runEtl({ rawDir: copy, write: false });
    const deals = r.report.files.find((f) => f.file === "crm_deals.csv")!;
    expect([deals.rows, deals.passed, deals.failed]).toEqual([22, 21, 1]);
    expect(deals.failure_examples[0]).toMatchObject({ id: "DL-001" });
    expect(deals.failure_examples[0].reason).toContain("stage_sejak");
    expect(r.report.nodes_by_label.Deal).toBe(21);
  });

  test("a duplicate ID across labels in the data → the ETL stops", () => {
    const copy = join(tmp, "raw-duplicate");
    cpSync(RAW_DEFAULT, copy, { recursive: true });
    const path = join(copy, "employees.csv");
    // employee 'C01' collides with Akun C01
    writeFileSync(path, readFileSync(path, "utf8").trimEnd() + "\r\nC01,Fake,Staff,fake@kasirnusa.id\r\n"); // CRLF like the original file
    expect(() => runEtl({ rawDir: copy, write: false })).toThrow(/Duplicate IDs.*C01/);
  });
});
