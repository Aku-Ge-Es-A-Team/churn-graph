// Fixture RiskRow[] untuk skeleton /dashboard (T00-10) -- dipakai sampai getRanking() (F-05) tersedia.
// Mengikuti kontrak RiskRow versi `src/types/graph.ts` (draf Dio, hasil merge 2026-10-09).
// Level, renewal, dan nilai dari Brief §4 + data/raw (crm_accounts, contracts_billing).
// skor = jumlah bobot sinyal (ilustratif, belum dikalibrasi). renewalHari dihitung terhadap SNAPSHOT_DATE 2026-10-01.
// rupiahBerisiko = nilaiTahunan x p(level) (PRD, Estimasi). divergen = dashboard Hijau dan level >= Tinggi (PRD F-05).
// `sejak` per sinyal = tanggal bukti tertua yang menjadi dasar sinyal (ASUMSI: arti `sejak` belum final, keputusan terbuka #5 di graph.ts).
import { P_LEVEL, type RiskRow, type Sinyal } from "@/types/graph";

const sinyalC01: Sinyal[] = [
  { akun: "C01", kode: "CHAMPION_KELUAR", bobot: 3, bukti_ids: ["C01", "K017", "P01", "I0290"], fakta: "Champion K017 (Rina) keluar dari C01 pada 2026-08-15 dan kini GM Operations di P01.", sejak: "2026-08-15" },
  { akun: "C01", kode: "JANJI_DILANGGAR", bobot: 3, bukti_ids: ["C01", "D-2025-11", "FEAT-07", "I0258"], fakta: "Diskon 15% (D-2025-11) disetujui dengan janji FEAT-07 Q3 2026; target kini belum ditetapkan.", sejak: "2026-07-20" },
  { akun: "C01", kode: "KOMPETITOR_DISEBUT", bobot: 2, bukti_ids: ["C01", "K134", "I0331", "KOMP-kasirpro"], fakta: "CFO baru (K134) menyebut KasirPro dalam meeting perkenalan.", sejak: "2026-09-18" },
];

const sinyalC04: Sinyal[] = [
  { akun: "C04", kode: "OUTREACH_TAK_BERBALAS", bobot: 2, bukti_ids: ["C04", "I0288", "I0319", "I0339"], fakta: "Tiga email AM (12 Agu, 2 Sep, 23 Sep) tidak berbalas.", sejak: "2026-08-12" },
  { akun: "C04", kode: "RISIKO_PEMBAYARAN", bobot: 2, bukti_ids: ["C04", "K-C04", "D-2026-03"], fakta: "Keterlambatan bayar 12 bulan = 2; ada pengecualian tempo bayar 14 hari (D-2026-03).", sejak: "2026-03-03" },
];

const sinyalC03: Sinyal[] = [
  { akun: "C03", kode: "ANOMALI_USAGE_RILIS_BUG", bobot: 2, bukti_ids: ["C03", "C03-O01", "C03-O02", "C03-O03", "C03-O04", "C03-O05", "C03-O06", "v4.12", "BUG-412"], fakta: "6 outlet offline pindah ke 4.12 pada 1-5 Juli 2026; transaksi turun 34-36% vs Okt-Des 2025.", sejak: "2026-07-01" },
];

const sinyalC05: Sinyal[] = [
  { akun: "C05", kode: "ANOMALI_USAGE_RILIS_BUG", bobot: 2, bukti_ids: ["C05", "C05-O01", "C05-O02", "C05-O03", "C05-O04", "C05-O05", "v4.12", "BUG-412"], fakta: "5 outlet offline memakai 4.12 sejak Juli 2026; offline sync turun dari 13.903 ke 3.587.", sejak: "2026-07-01" },
];

export const riskRowsFixture = [
  {
    akun: "C01",
    nama: "Kopi Lintas Nusantara",
    dashboard: "Hijau",
    level: "Kritis",
    skor: 8,
    divergen: true,
    renewalHari: 75,
    nilaiTahunan: 149_940_000,
    rupiahBerisiko: 89_964_000,
    p: P_LEVEL.Kritis,
    sinyalTeratas: sinyalC01,
  },
  {
    akun: "C04",
    nama: "Roti Kenanga",
    dashboard: "Hijau",
    level: "Tinggi",
    skor: 4,
    divergen: true,
    renewalHari: 35,
    nilaiTahunan: 33_600_000,
    rupiahBerisiko: 13_440_000,
    p: P_LEVEL.Tinggi,
    sinyalTeratas: sinyalC04,
  },
  {
    akun: "C03",
    nama: "Apotek Sehat Sentosa",
    dashboard: "Kuning",
    level: "Tinggi",
    skor: 2,
    divergen: false,
    renewalHari: 111,
    nilaiTahunan: 68_040_000,
    rupiahBerisiko: 27_216_000,
    p: P_LEVEL.Tinggi,
    sinyalTeratas: sinyalC03,
  },
  {
    akun: "C05",
    nama: "Minimarket Berkah",
    dashboard: "Hijau",
    level: "Waspada",
    skor: 2,
    divergen: false,
    renewalHari: 191,
    nilaiTahunan: 95_760_000,
    rupiahBerisiko: 19_152_000,
    p: P_LEVEL.Waspada,
    sinyalTeratas: sinyalC05,
  },
  {
    akun: "C02",
    nama: "TB Sinar Jaya",
    dashboard: "Kuning",
    level: "Aman",
    skor: 0,
    divergen: false,
    renewalHari: 151,
    nilaiTahunan: 99_750_000,
    rupiahBerisiko: 4_987_500,
    p: P_LEVEL.Aman,
    sinyalTeratas: [],
  },
  {
    akun: "C06",
    nama: "Saiyo Group",
    dashboard: "Hijau",
    level: "Aman",
    skor: 0,
    divergen: false,
    renewalHari: 273,
    nilaiTahunan: 113_400_000,
    rupiahBerisiko: 5_670_000,
    p: P_LEVEL.Aman,
    sinyalTeratas: [],
  },
] satisfies RiskRow[];
