import { describe, expect, test } from "bun:test";
import { P_LEVEL, type DashboardWarna, type Level } from "../../../src/types/graph";
import {
  AMBANG_LEVEL,
  FAKTOR_RENEWAL,
  KONFIG_DEFAULT,
  MAKS_SINYAL_TERATAS,
  TANGGAL_ACUAN_DEFAULT,
} from "../../../src/server/scoring/config";
import {
  faktorRenewal,
  hariKeRenewal,
  hitungDivergen,
  rupiahBerisiko,
  sinyalTeratas,
  skorAkun,
  tentukanLevel,
} from "../../../src/server/scoring/score";
import { ASOF, CFG_UJI, sinyal } from "../../fixtures/scoring/fixture";

describe("config default (kunci nilai spesifikasi)", () => {
  test("nilai placeholder sesuai spesifikasi task F-05", () => {
    expect(FAKTOR_RENEWAL).toEqual({
      tingkat: [
        { maksHari: 30, faktor: 1.5 },
        { maksHari: 90, faktor: 1.25 },
        { maksHari: 180, faktor: 1.0 },
      ],
      lebihDari: 0.8,
      tanpaTanggal: 1.0,
    });
    expect(AMBANG_LEVEL).toEqual({ Kritis: 8, Tinggi: 5, Waspada: 2 });
    expect(MAKS_SINYAL_TERATAS).toBe(3);
    expect(TANGGAL_ACUAN_DEFAULT).toBe("2026-10-01");
    expect(KONFIG_DEFAULT).toEqual({ faktorRenewal: FAKTOR_RENEWAL, ambangLevel: AMBANG_LEVEL, maksSinyalTeratas: 3 });
  });
});

describe("hariKeRenewal", () => {
  test.each([
    ["2026-01-11", 10],
    ["2026-01-01", 0],
    ["2025-12-31", -1],
    ["2027-01-01", 365],
  ])("%s → %p", (tgl, hari) => {
    expect(hariKeRenewal(tgl, ASOF)).toBe(hari);
  });

  test("jam pada asOf tidak menggeser hari kalender", () => {
    expect(hariKeRenewal("2026-01-02", new Date("2026-01-01T23:59:00Z"))).toBe(1);
  });

  test.each([null, "", "bukan-tanggal", "2026-1-5", "2026-02-30", "2026-13-01"])("tidak valid %p → null", (tgl) => {
    expect(hariKeRenewal(tgl, ASOF)).toBeNull();
  });

  test("asOf tidak valid → null", () => {
    expect(hariKeRenewal("2026-01-11", new Date("x"))).toBeNull();
  });
});

describe("faktorRenewal (tabel disuntik)", () => {
  test.each([
    [-10, 2],
    [0, 2],
    [30, 2],
    [31, 1.5],
    [90, 1.5],
    [91, 1],
    [180, 1],
    [181, 0.5],
    [null, 0.9],
  ])("%p hari → %p", (hari, f) => {
    expect(faktorRenewal(hari, CFG_UJI.faktorRenewal)).toBe(f);
  });
});

describe("skorAkun", () => {
  test("Σ bobot × faktor renewal", () => {
    expect(skorAkun([sinyal("ACC-A", "X", 2), sinyal("ACC-A", "Y", 3)], 10, CFG_UJI)).toBe(10);
  });

  test("tanpa sinyal = 0", () => {
    expect(skorAkun([], 10, CFG_UJI)).toBe(0);
  });

  test("bobot NaN/Infinity diabaikan", () => {
    const s = [sinyal("ACC-A", "X", 2), sinyal("ACC-A", "N", NaN), sinyal("ACC-A", "I", Infinity), sinyal("ACC-A", "M", -Infinity)];
    expect(skorAkun(s, 151, CFG_UJI)).toBe(2);
  });
});

describe("tentukanLevel (ambang disuntik 10/6/3)", () => {
  test.each([
    [10.01, "Kritis"],
    [10, "Kritis"],
    [9.99, "Tinggi"],
    [6, "Tinggi"],
    [5.99, "Waspada"],
    [3, "Waspada"],
    [2.99, "Aman"],
    [0, "Aman"],
  ] as const)("%p → %s", (skor, level) => {
    expect(tentukanLevel(skor, CFG_UJI)).toBe(level);
  });
});

describe("rupiahBerisiko", () => {
  test.each(["Kritis", "Tinggi", "Waspada", "Aman"] as const)("%s memakai P_LEVEL", (level) => {
    expect(rupiahBerisiko(1_000_000, level)).toEqual({ p: P_LEVEL[level], rupiah: Math.round(1_000_000 * P_LEVEL[level]) });
  });

  test("dibulatkan ke bilangan bulat terdekat", () => {
    expect(rupiahBerisiko(11, "Waspada").rupiah).toBe(2); // 2.2
    expect(rupiahBerisiko(13, "Waspada").rupiah).toBe(3); // 2.6
  });

  test.each([-5_000_000, NaN, Infinity])("nilai %p diperlakukan 0", (v) => {
    expect(rupiahBerisiko(v, "Kritis")).toEqual({ p: 0.6, rupiah: 0 });
  });
});

describe("hitungDivergen", () => {
  test.each([
    ["Hijau", "Tinggi", true],
    ["Hijau", "Kritis", true],
    ["Hijau", "Waspada", false],
    ["Hijau", "Aman", false],
    ["Kuning", "Kritis", false],
    ["Merah", "Kritis", false],
  ] as [DashboardWarna, Level, boolean][])("%s + %s → %p", (d, l, hasil) => {
    expect(hitungDivergen(d, l)).toBe(hasil);
  });
});

describe("sinyalTeratas", () => {
  const daftar = [
    sinyal("ACC-A", "B", 2, "2025-03-01"),
    sinyal("ACC-A", "A", 2, "2025-03-01"),
    sinyal("ACC-A", "C", 2, "2025-01-01"),
    sinyal("ACC-A", "D", 5),
    sinyal("ACC-A", "E", 1),
    sinyal("ACC-A", "N", NaN),
  ];

  test("maks 3, bobot menurun, seri → sejak lebih awal → kode alfabet", () => {
    expect(sinyalTeratas(daftar, 3).map((s) => s.kode)).toEqual(["D", "C", "A"]);
    expect(sinyalTeratas(daftar, 5).map((s) => s.kode)).toEqual(["D", "C", "A", "B", "E"]);
  });

  test("tidak mengubah array asli", () => {
    const salinan = structuredClone(daftar);
    sinyalTeratas(daftar);
    expect(daftar).toEqual(salinan);
  });
});
