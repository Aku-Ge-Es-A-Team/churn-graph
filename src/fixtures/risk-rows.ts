// Fixture RiskRow[] untuk skeleton "/" (T00-10) -- dipakai sampai getRanking() (F-05) tersedia.
// Level, renewal, dan nilai dari Brief §4 + data/raw (crm_accounts, contracts_billing).
// skor = jumlah bobot awal F-04 (ilustratif, belum dikalibrasi). hariKeRenewal dihitung
// terhadap SNAPSHOT_DATE 2026-10-01. nilaiBerisiko = nilaiTahunan x p(level) (PRD, Estimasi).
import type { RiskRow } from "@/types/graph";

export const riskRowsFixture = [
  {
    id: "C01",
    nama: "Kopi Lintas Nusantara",
    dashboard: "Hijau",
    level: "Kritis",
    skor: 8,
    renewal: "2026-12-15",
    hariKeRenewal: 75,
    nilaiTahunan: 149_940_000,
    nilaiBerisiko: 89_964_000,
    sinyal: [
      { kode: "CHAMPION_KELUAR", bobot: 3 },
      { kode: "JANJI_DILANGGAR", bobot: 3 },
      { kode: "KOMPETITOR_DISEBUT", bobot: 2 },
    ],
  },
  {
    id: "C04",
    nama: "Roti Kenanga",
    dashboard: "Hijau",
    level: "Tinggi",
    skor: 4,
    renewal: "2026-11-05",
    hariKeRenewal: 35,
    nilaiTahunan: 33_600_000,
    nilaiBerisiko: 13_440_000,
    sinyal: [
      { kode: "OUTREACH_TAK_BERBALAS", bobot: 2 },
      { kode: "RISIKO_PEMBAYARAN", bobot: 2 },
    ],
  },
  {
    id: "C03",
    nama: "Apotek Sehat Sentosa",
    dashboard: "Kuning",
    level: "Tinggi",
    skor: 3,
    renewal: "2027-01-20",
    hariKeRenewal: 111,
    nilaiTahunan: 68_040_000,
    nilaiBerisiko: 27_216_000,
    sinyal: [
      { kode: "ANOMALI_USAGE_RILIS_BUG", bobot: 2 },
      { kode: "TIKET_BUG_TAK_TERTAUT", bobot: 1 },
    ],
  },
  {
    id: "C05",
    nama: "Minimarket Berkah",
    dashboard: "Hijau",
    level: "Waspada",
    skor: 3,
    renewal: "2027-04-10",
    hariKeRenewal: 191,
    nilaiTahunan: 95_760_000,
    nilaiBerisiko: 19_152_000,
    sinyal: [
      { kode: "ANOMALI_USAGE_RILIS_BUG", bobot: 2 },
      { kode: "TIKET_TAK_DIREPRODUKSI", bobot: 1 },
    ],
  },
  {
    id: "C02",
    nama: "TB Sinar Jaya",
    dashboard: "Kuning",
    level: "Aman",
    skor: 0,
    renewal: "2027-03-01",
    hariKeRenewal: 151,
    nilaiTahunan: 99_750_000,
    nilaiBerisiko: 4_987_500,
    sinyal: [],
  },
  {
    id: "C06",
    nama: "Saiyo Group",
    dashboard: "Hijau",
    level: "Aman",
    skor: 0,
    renewal: "2027-07-01",
    hariKeRenewal: 273,
    nilaiTahunan: 113_400_000,
    nilaiBerisiko: 5_670_000,
    sinyal: [],
  },
] satisfies RiskRow[];
