import { describe, expect, test } from "bun:test";
import { DASHBOARD_WARNA, P_LEVEL, RiskRowSchema, type Sinyal } from "../../../src/types/graph";
import { sinyalDiabaikan, susunRiskRows, type AkunInfo } from "../../../src/server/scoring/rank";
import { ASOF, CFG_UJI, akun, sinyal, tanggal } from "../../fixtures/scoring/fixture";

const urutan = (akunList: AkunInfo[], s: Sinyal[], cfg = CFG_UJI) =>
  susunRiskRows(akunList, s, ASOF, cfg).map((r) => r.akun);

describe("susunRiskRows — urutan", () => {
  test("skor menurun", () => {
    const list = [akun("ACC-C"), akun("ACC-A"), akun("ACC-B")];
    const s = [sinyal("ACC-A", "X", 5), sinyal("ACC-B", "X", 3), sinyal("ACC-C", "X", 1)];
    expect(urutan(list, s)).toEqual(["ACC-A", "ACC-B", "ACC-C"]);
  });

  test("skor seri → renewal lebih dekat dulu", () => {
    const list = [akun("ACC-A", { tanggalRenewal: tanggal(20) }), akun("ACC-B", { tanggalRenewal: tanggal(10) })];
    const s = [sinyal("ACC-A", "X", 2), sinyal("ACC-B", "X", 2)];
    expect(urutan(list, s)).toEqual(["ACC-B", "ACC-A"]);
  });

  test("skor seri → renewal null paling akhir", () => {
    const cfg = { ...CFG_UJI, faktorRenewal: { ...CFG_UJI.faktorRenewal, tanpaTanggal: 1 } };
    const list = [akun("ACC-A", { tanggalRenewal: null }), akun("ACC-B")];
    const s = [sinyal("ACC-A", "X", 2), sinyal("ACC-B", "X", 2)];
    expect(urutan(list, s, cfg)).toEqual(["ACC-B", "ACC-A"]);
  });

  test("skor & renewal seri → nilai tahunan lebih besar dulu", () => {
    const list = [akun("ACC-A", { nilaiTahunan: 50_000_000 }), akun("ACC-B", { nilaiTahunan: 90_000_000 })];
    expect(urutan(list, [])).toEqual(["ACC-B", "ACC-A"]);
  });

  test("semua seri → ID akun alfabet", () => {
    expect(urutan([akun("ACC-B"), akun("ACC-A")], [])).toEqual(["ACC-A", "ACC-B"]);
  });
});

describe("susunRiskRows — kasus tepi", () => {
  test("akun tanpa sinyal tetap muncul sebagai Aman skor 0", () => {
    const [row] = susunRiskRows([akun("ACC-A", { nilaiTahunan: 123_456_789 })], [], ASOF, CFG_UJI);
    expect(row).toMatchObject({ akun: "ACC-A", level: "Aman", skor: 0, p: 0.05, rupiahBerisiko: Math.round(123_456_789 * 0.05), sinyalTeratas: [] });
  });

  test("sinyal akun tak dikenal diabaikan tanpa error dan dilaporkan", () => {
    const list = [akun("ACC-A")];
    const s = [sinyal("ACC-A", "X", 1), sinyal("ACC-ZZ", "X", 9)];
    const rows = susunRiskRows(list, s, ASOF, CFG_UJI);
    expect(rows.map((r) => r.akun)).toEqual(["ACC-A"]);
    expect(rows[0].skor).toBe(1);
    expect(sinyalDiabaikan(list, s).akunTakDikenal.map((x) => x.akun)).toEqual(["ACC-ZZ"]);
  });

  test("bobot NaN/Infinity diabaikan, tidak merusak skor, dan dilaporkan", () => {
    const list = [akun("ACC-A")];
    const s = [sinyal("ACC-A", "X", 4), sinyal("ACC-A", "N", NaN), sinyal("ACC-A", "I", Infinity)];
    const [row] = susunRiskRows(list, s, ASOF, CFG_UJI);
    expect(row.skor).toBe(4);
    expect(row.sinyalTeratas.map((x) => x.kode)).toEqual(["X"]);
    expect(sinyalDiabaikan(list, s).bobotTidakValid.map((x) => x.kode)).toEqual(["N", "I"]);
  });

  test("divergen = Hijau dan level >= Tinggi", () => {
    const list = [akun("ACC-A"), akun("ACC-B", { dashboard: "Kuning" })];
    const s = [sinyal("ACC-A", "X", 6), sinyal("ACC-B", "X", 6)];
    const rows = susunRiskRows(list, s, ASOF, CFG_UJI);
    expect(rows.map((r) => [r.akun, r.level, r.divergen])).toEqual([
      ["ACC-A", "Tinggi", true],
      ["ACC-B", "Tinggi", false],
    ]);
  });
});

describe("susunRiskRows — kemurnian & determinisme", () => {
  const list = [akun("ACC-B"), akun("ACC-A", { tanggalRenewal: tanggal(5) }), akun("ACC-C", { tanggalRenewal: null })];
  const s = [sinyal("ACC-A", "X", 3), sinyal("ACC-B", "Y", 2), sinyal("ACC-A", "N", NaN), sinyal("ACC-Q", "Z", 1)];

  test("tidak mengubah array masukan", () => {
    const [l0, s0] = [structuredClone(list), structuredClone(s)];
    susunRiskRows(list, s, ASOF, CFG_UJI);
    expect(list).toEqual(l0);
    expect(s).toEqual(s0);
  });

  test("dua panggilan dan urutan masukan berbeda → hasil identik", () => {
    const a = susunRiskRows(list, s, ASOF, CFG_UJI);
    expect(susunRiskRows(list, s, ASOF, CFG_UJI)).toEqual(a);
    expect(susunRiskRows([...list].reverse(), [...s].reverse(), ASOF, CFG_UJI)).toEqual(a);
  });
});

describe("susunRiskRows — properti (acak, seed tetap)", () => {
  // LCG sederhana agar deterministik.
  let seed = 42;
  const acak = () => ((seed = (seed * 1_664_525 + 1_013_904_223) % 2 ** 32) / 2 ** 32);
  const int = (min: number, max: number) => min + Math.floor(acak() * (max - min + 1));

  const list: AkunInfo[] = [];
  const s: Sinyal[] = [];
  for (let i = 0; i < 300; i++) {
    const id = `ACC-${String(i).padStart(3, "0")}`;
    list.push(
      akun(id, {
        dashboard: DASHBOARD_WARNA[int(0, 2)],
        nilaiTahunan: int(0, 1_000_000_000),
        tanggalRenewal: acak() < 0.1 ? null : tanggal(int(-60, 400)),
      }),
    );
    for (let j = int(0, 6); j > 0; j--) s.push(sinyal(id, `K${j}`, int(1, 5), tanggal(-int(0, 300))));
  }
  const rows = susunRiskRows(list, s, ASOF, CFG_UJI);

  test("tiap baris konsisten dengan P_LEVEL dan kontrak RiskRow", () => {
    expect(rows).toHaveLength(300);
    for (const r of rows) {
      expect(r.p).toBe(P_LEVEL[r.level]);
      expect(r.rupiahBerisiko).toBe(Math.round(r.nilaiTahunan * r.p));
      expect(r.sinyalTeratas.length).toBeLessThanOrEqual(3);
      expect(r.divergen).toBe(r.dashboard === "Hijau" && (r.level === "Kritis" || r.level === "Tinggi"));
      expect(RiskRowSchema.safeParse(r).success).toBe(true);
    }
  });

  test("skor tidak pernah naik sepanjang urutan", () => {
    for (let i = 1; i < rows.length; i++) expect(rows[i].skor).toBeLessThanOrEqual(rows[i - 1].skor);
  });
});
