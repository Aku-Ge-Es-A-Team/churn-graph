// Semua angka skoring yang belum disepakati tim. Fungsi di score.ts/rank.ts menerimanya lewat `cfg`.

export type TabelRenewal = {
  // Urut menaik berdasarkan maksHari; hari negatif (renewal sudah lewat) otomatis jatuh ke tingkat pertama.
  tingkat: { maksHari: number; faktor: number }[];
  lebihDari: number; // di atas tingkat terakhir
  tanpaTanggal: number; // tanggal renewal tidak ada / tidak valid
};

// ASUMSI, belum dikalibrasi.
export const FAKTOR_RENEWAL: TabelRenewal = {
  tingkat: [
    { maksHari: 30, faktor: 1.5 },
    { maksHari: 90, faktor: 1.25 },
    { maksHari: 180, faktor: 1.0 },
  ],
  lebihDari: 0.8,
  tanpaTanggal: 1.0,
};

// PLACEHOLDER: skala ini mengasumsikan bobot sinyal 1–5 dan HARUS dikalibrasi ulang
// setelah keluaran F-04 yang nyata tersedia. Skor di bawah Waspada = Aman.
export const AMBANG_LEVEL = { Kritis: 8, Tinggi: 5, Waspada: 2 };

// Tanggal snapshot dataset (SNAPSHOT_DATE di PRD/doc 00). Hanya dipakai pemanggil paling luar;
// fungsi inti selalu menerima `asOf` sebagai parameter.
export const TANGGAL_ACUAN_DEFAULT = "2026-10-01";

export const MAKS_SINYAL_TERATAS = 3;

export type ScoringConfig = {
  faktorRenewal: TabelRenewal;
  ambangLevel: typeof AMBANG_LEVEL;
  maksSinyalTeratas: number;
};

export const KONFIG_DEFAULT: ScoringConfig = {
  faktorRenewal: FAKTOR_RENEWAL,
  ambangLevel: AMBANG_LEVEL,
  maksSinyalTeratas: MAKS_SINYAL_TERATAS,
};
