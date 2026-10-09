// Data SINTETIS untuk menguji MEKANIKA skoring, BUKAN kalibrasi.
// ID netral (ACC-*), tidak meniru akun nyata, dan tidak diatur agar cocok dengan ekspektasi demo.
import type { Sinyal } from "../../../src/types/graph";
import type { ScoringConfig } from "../../../src/server/scoring/config";
import type { AkunInfo } from "../../../src/server/scoring/rank";

// Sengaja berbeda dari KONFIG_DEFAULT: tes tidak boleh bergantung pada nilai placeholder.
export const CFG_UJI: ScoringConfig = {
  faktorRenewal: {
    tingkat: [
      { maksHari: 30, faktor: 2 },
      { maksHari: 90, faktor: 1.5 },
      { maksHari: 180, faktor: 1 },
    ],
    lebihDari: 0.5,
    tanpaTanggal: 0.9,
  },
  ambangLevel: { Kritis: 10, Tinggi: 6, Waspada: 3 },
  maksSinyalTeratas: 3,
};

export const ASOF = new Date("2026-01-01T00:00:00Z");

// ASOF + n hari, format YYYY-MM-DD.
export const tanggal = (hari: number) => new Date(ASOF.getTime() + hari * 86_400_000).toISOString().slice(0, 10);

export const sinyal = (akun: string, kode: string, bobot: number, sejak = "2025-06-01"): Sinyal => ({
  akun,
  kode,
  bobot,
  bukti_ids: [`${akun}:${kode}`],
  fakta: "{}",
  sejak,
});

export const akun = (id: string, over: Partial<AkunInfo> = {}): AkunInfo => ({
  akun: id,
  nama: `Akun ${id}`,
  dashboard: "Hijau",
  nilaiTahunan: 100_000_000,
  tanggalRenewal: tanggal(151), // faktor 1 di CFG_UJI
  ...over,
});
