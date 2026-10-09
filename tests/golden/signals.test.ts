// Golden test for Inconsistency Radar v1 (F-04, T04-01/T04-07). Written before the rules: no account/contact IDs inside the rules.
// Signals are read directly through the driver (getSignals/getRanking belong to F-05/Dio, there is no backward dependency).
// Prerequisites for the Aura tests: the graph is loaded, `bun run derive` and `bun run signals` have been run.
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Driver } from "neo4j-driver";
import { SIGNALS_FOLDER, SignalContractError, runRules, runSignals, validateRow } from "../../scripts/signals";
import { CAN_WRITE, CANDIDATE_GOLDEN, HAS_AURA, openDriver, queryAura } from "../helpers/aura";

const CODES = ["CHAMPION_KELUAR", "JANJI_DILANGGAR", "KOMPETITOR_DISEBUT", "OUTREACH_TAK_BERBALAS", "RISIKO_PEMBAYARAN", "TIKET_BUG_TAK_TERTAUT", "ANOMALI_USAGE_RILIS_BUG", "TIKET_TAK_DIREPRODUKSI"];

describe("rules and contract (no Aura)", () => {
  const files = readdirSync(SIGNALS_FOLDER).filter((f) => f.endsWith(".cypher")).sort();

  test("eight rule files, one file = one signal code", () => {
    expect(files.map((f) => f.replace(".cypher", "").toUpperCase()).sort()).toEqual([...CODES].sort());
  });

  test("no account/contact/dataset IDs are hardcoded in the rules (generic for 40 accounts)", () => {
    const pattern = /'(C\d{2}|P\d{2}|K\d{3}|E\d{2}|I\d{4}|T\d{4}|D-\d{4}-\d{2}|FEAT-\d{2}|BUG-\d{3}|DL-\d{3}|v4\.\d+)'/;
    for (const f of files) {
      const body = readFileSync(join(SIGNALS_FOLDER, f), "utf8")
        .split("\n")
        .filter((l) => !l.trim().startsWith("//"))
        .join("\n");
      expect({ f, match: pattern.exec(body)?.[0] ?? null }).toEqual({ f, match: null });
    }
  });

  const valid = { akun: "CX", kode: "TEST", bobot: 2, bukti_ids: ["CX", "Y"], fakta: { a: 1 }, sejak: "2026-01-02" };

  test("a row that follows the contract {akun, kode, bobot, bukti_ids, fakta, sejak} is accepted", () => {
    expect(validateRow("test.cypher", valid)).toMatchObject({ akun: "CX", kode: "TEST", bobot: 2, sejak: "2026-01-02" });
    expect(validateRow("test.cypher", { ...valid, sejak: { year: 2026, month: 1, day: 2 } }).sejak).toBe("2026-01-02"); // Neo4j Date
  });

  test("error path: missing column, evidence without the account, sejak not a date, kode ≠ file name", () => {
    const withoutSejak: Record<string, unknown> = { ...valid };
    delete withoutSejak.sejak;
    expect(() => validateRow("test.cypher", withoutSejak)).toThrow(/missing result columns: sejak/);
    expect(() => validateRow("test.cypher", { ...valid, bukti_ids: ["Y"] })).toThrow(/must contain the account/);
    expect(() => validateRow("test.cypher", { ...valid, sejak: "yesterday" })).toThrow(SignalContractError);
    expect(() => validateRow("other.cypher", valid)).toThrow(/does not match the file name/);
  });
});

describe.skipIf(!HAS_AURA)("signals in Aura (read-only)", () => {
  let driver: Driver;
  let byAccount: Map<string, Map<string, { fakta: Record<string, unknown>; bukti: string[]; sejak: string; bobot: number }[]>>;
  let all: { id: string; akun: string; kode: string; bobot: number; sejak: string; fakta: string; source_file: string; source_id: string }[];

  beforeAll(async () => {
    driver = openDriver();
    all = await queryAura(driver, "MATCH (s:Sinyal)-[:PADA]->(a:Akun) RETURN s.id AS id, a.id AS akun, s.kode AS kode, s.bobot AS bobot, s.sejak AS sejak, s.fakta AS fakta, s.source_file AS source_file, s.source_id AS source_id");
    const evidence = await queryAura<{ id: string; ids: string[] }>(driver, "MATCH (s:Sinyal)-[:BUKTI]->(x:Entitas) RETURN s.id AS id, collect(x.id) AS ids");
    const evidenceIds = new Map(evidence.map((b) => [b.id, b.ids]));
    byAccount = new Map();
    for (const s of all) {
      const m = byAccount.get(s.akun) ?? new Map();
      m.set(s.kode, [...(m.get(s.kode) ?? []), { fakta: JSON.parse(s.fakta), bukti: evidenceIds.get(s.id) ?? [], sejak: s.sejak, bobot: s.bobot }]);
      byAccount.set(s.akun, m);
    }
  });
  afterAll(() => driver.close());

  const codesOf = (a: string) => [...(byAccount.get(a)?.keys() ?? [])].sort();

  test("no Sinyal yet → clear message (TDD phase T04-01)", () => {
    expect(all.length, "No Sinyal yet: run `bun run signals` after `bun run derive`").toBeGreaterThan(0);
  });

  test("every Sinyal follows the contract and carries rule provenance", () => {
    for (const s of all) {
      expect(CODES).toContain(s.kode);
      expect(typeof s.bobot).toBe("number");
      expect(s.sejak).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(() => JSON.parse(s.fakta)).not.toThrow();
      expect(s.source_file.startsWith("cypher/signals/")).toBe(true);
      expect(s.source_id).toBe(s.id);
      expect(s.id).toMatch(/^SIG-.+-[A-Z_]+-\d+$/);
    }
  });

  test("every Sinyal has evidence that contains its own account", () => {
    for (const [account, m] of byAccount) for (const [, list] of m) for (const s of list) expect(s.bukti).toContain(account);
  });

  test("C01: R1 (People) → K017 moved to P01; R2 (Promise) contains FEAT-07; competitor KasirPro mentioned by the new CFO", () => {
    expect(codesOf("C01")).toEqual(["CHAMPION_KELUAR", "JANJI_DILANGGAR", "KOMPETITOR_DISEBUT"]);
    const m = byAccount.get("C01")!;
    expect(m.get("CHAMPION_KELUAR")![0].fakta).toMatchObject({ kontak: "K017", keluar: "2026-08-15", pindah_ke: ["P01"] });
    expect(m.get("CHAMPION_KELUAR")![0].bukti).toContain("I0290"); // farewell interaction (OPTIONAL MATCH)
    expect(m.get("JANJI_DILANGGAR")![0].bukti).toContain("FEAT-07");
    expect(m.get("JANJI_DILANGGAR")![0].bukti).toContain("D-2025-11");
    expect(m.get("KOMPETITOR_DISEBUT")![0].fakta).toMatchObject({ kompetitor: "KasirPro", kontak: ["K134"] });
  });

  test("C04: unanswered outreach (3 emails) and payment risk (2× late)", () => {
    expect(codesOf("C04")).toEqual(["OUTREACH_TAK_BERBALAS", "RISIKO_PEMBAYARAN"]);
    const m = byAccount.get("C04")!;
    expect(m.get("OUTREACH_TAK_BERBALAS")![0].fakta).toMatchObject({ jumlah_tak_berbalas: 3, interaksi: ["I0288", "I0319", "I0339"] });
    expect(m.get("RISIKO_PEMBAYARAN")![0].fakta).toMatchObject({ keterlambatan_bayar_12bln: 2 });
  });

  test("C03 and C05: usage anomaly coinciding with a buggy release + unlinked bug tickets (F-03 golden constant)", () => {
    for (const [account, outlets, tickets] of [["C03", 6, CANDIDATE_GOLDEN.C03], ["C05", 5, CANDIDATE_GOLDEN.C05]] as const) {
      expect(codesOf(account)).toEqual(["ANOMALI_USAGE_RILIS_BUG", "TIKET_BUG_TAK_TERTAUT", "TIKET_TAK_DIREPRODUKSI"]);
      const m = byAccount.get(account)!;
      expect(m.get("ANOMALI_USAGE_RILIS_BUG")![0].fakta).toMatchObject({ tafsir: "bug, bukan churn", rilis: "v4.12", bug: ["BUG-412"], jumlah_outlet: outlets });
      expect(m.get("TIKET_BUG_TAK_TERTAUT")![0].fakta).toMatchObject({ bug: "BUG-412", jumlah_tiket: tickets });
      expect(m.get("TIKET_TAK_DIREPRODUKSI")![0].fakta).toMatchObject({ jumlah_tiket: 2 });
    }
  });

  test("Z1: C02 (9 permintaan_fitur tickets) and C06 have no negative signals", () => {
    expect(codesOf("C02")).toEqual([]);
    expect(codesOf("C06")).toEqual([]);
  });

  test("Z1: no ticket signal rests on a permintaan_fitur ticket", async () => {
    const r = await queryAura<{ n: number }>(
      driver,
      `MATCH (s:Sinyal)-[:BUKTI]->(t:Tiket) WHERE t.kategori = 'permintaan_fitur' RETURN count(t) AS n`,
    );
    expect(r[0].n).toBe(0);
  });

  test("40-account check: accounts outside C01–C06 are not highlighted by the v1 rules (the rules are not too loose)", () => {
    const outside = [...byAccount.keys()].filter((a) => !["C01", "C02", "C03", "C04", "C05", "C06"].includes(a));
    expect(outside, `non-focus accounts with signals: ${outside.join(", ")} -- check why`).toEqual([]);
  });

  test("runner error path: a rule with too few columns stops the runner before writing anything", async () => {
    const tmp = mkdtempSync(join(tmpdir(), "rules-"));
    try {
      mkdirSync(join(tmp, "x"));
      writeFileSync(join(tmp, "x", "broken.cypher"), "MATCH (a:Akun) RETURN a.id AS akun, 'BROKEN' AS kode, 1 AS bobot LIMIT 1\n");
      const before = (await queryAura<{ n: number }>(driver, "MATCH (s:Sinyal) RETURN count(s) AS n"))[0].n;
      await expect(runRules(driver, join(tmp, "x"), "2026-10-01")).rejects.toThrow(/missing result columns: bukti_ids, fakta, sejak/);
      expect((await queryAura<{ n: number }>(driver, "MATCH (s:Sinyal) RETURN count(s) AS n"))[0].n).toBe(before);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  test("runner error path: bukti_ids that do not exist in the graph are rejected", async () => {
    const tmp = mkdtempSync(join(tmpdir(), "rules-"));
    try {
      writeFileSync(join(tmp, "ghost.cypher"), "MATCH (a:Akun) WITH a LIMIT 1 RETURN a.id AS akun, 'GHOST' AS kode, 1 AS bobot, [a.id, 'ID-NOT-FOUND'] AS bukti_ids, {} AS fakta, date('2026-01-01') AS sejak\n");
      await expect(runRules(driver, tmp, "2026-10-01")).rejects.toThrow(/do not exist in the graph: ID-NOT-FOUND/);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });
});

describe.skipIf(!CAN_WRITE)("idempotent runner (WRITES to Aura; only with AURA_MUTATE=1)", () => {
  test("bun run signals twice → same number of Sinyal and PADA/BUKTI relations; signals owned by other features are untouched", async () => {
    const driver = openDriver();
    try {
      const count = async () =>
        (await queryAura<{ s: number; p: number; b: number }>(driver, "MATCH (s:Sinyal) OPTIONAL MATCH (s)-[p:PADA]->() OPTIONAL MATCH (s)-[b:BUKTI]->() RETURN count(DISTINCT s) AS s, count(DISTINCT p) AS p, count(DISTINCT b) AS b"))[0];
      // a signal "owned by another feature": source_file is not cypher/signals/
      const s = driver.session();
      await s.run("MERGE (x:Entitas:Sinyal {id: 'SIG-TEST-OTHER-1'}) SET x.kode = 'TEST_OTHER', x.source_file = 'scripts/other-feature.ts', x.source_id = 'SIG-TEST-OTHER-1'");
      await s.close();
      await runSignals(driver);
      const first = await count();
      await runSignals(driver);
      const second = await count();
      expect(second).toEqual(first);
      const other = await queryAura(driver, "MATCH (x:Sinyal {id: 'SIG-TEST-OTHER-1'}) RETURN x.id AS id");
      expect(other).toHaveLength(1);
      const s2 = driver.session();
      await s2.run("MATCH (x:Sinyal {id: 'SIG-TEST-OTHER-1'}) DETACH DELETE x");
      await s2.close();
    } finally {
      await driver.close();
    }
  }, 90_000);
});
