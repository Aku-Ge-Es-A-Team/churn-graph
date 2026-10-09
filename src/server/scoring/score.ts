import { LEVEL, P_LEVEL, type DashboardWarna, type Level, type Sinyal } from "../../types/graph";
import { KONFIG_DEFAULT, MAKS_SINYAL_TERATAS, type ScoringConfig, type TabelRenewal } from "./config";

const MS_PER_HARI = 86_400_000;
const ISO_TANGGAL = /^(\d{4})-(\d{2})-(\d{2})$/;

// Selisih hari kalender (UTC) dari asOf ke tanggal renewal. Input tidak valid → null.
export function hariKeRenewal(tanggalRenewal: string | null, asOf: Date): number | null {
  const m = tanggalRenewal ? ISO_TANGGAL.exec(tanggalRenewal) : null;
  if (!m || Number.isNaN(asOf.getTime())) return null;
  const [y, bulan, hari] = [Number(m[1]), Number(m[2]) - 1, Number(m[3])];
  const target = new Date(Date.UTC(y, bulan, hari));
  // Tolak tanggal yang "digulung" Date, mis. 2026-02-30.
  if (target.getUTCMonth() !== bulan || target.getUTCDate() !== hari) return null;
  const acuan = Date.UTC(asOf.getUTCFullYear(), asOf.getUTCMonth(), asOf.getUTCDate());
  return Math.round((target.getTime() - acuan) / MS_PER_HARI);
}

export function faktorRenewal(renewalHari: number | null, tabel: TabelRenewal = KONFIG_DEFAULT.faktorRenewal): number {
  if (renewalHari === null) return tabel.tanpaTanggal;
  return tabel.tingkat.find((t) => renewalHari <= t.maksHari)?.faktor ?? tabel.lebihDari;
}

export const bobotValid = (s: Sinyal) => Number.isFinite(s.bobot);

// Sinyal berbobot tidak hingga/NaN diabaikan; daftarnya dilaporkan lewat sinyalDiabaikan() di rank.ts.
export function skorAkun(sinyal: Sinyal[], renewalHari: number | null, cfg: ScoringConfig = KONFIG_DEFAULT): number {
  const total = sinyal.filter(bobotValid).reduce((acc, s) => acc + s.bobot, 0);
  return total * faktorRenewal(renewalHari, cfg.faktorRenewal);
}

export function tentukanLevel(skor: number, cfg: ScoringConfig = KONFIG_DEFAULT): Level {
  const a = cfg.ambangLevel;
  if (skor >= a.Kritis) return "Kritis";
  if (skor >= a.Tinggi) return "Tinggi";
  if (skor >= a.Waspada) return "Waspada";
  return "Aman";
}

// Dashboard bilang aman (Hijau) padahal temuan >= Tinggi.
export function hitungDivergen(dashboard: DashboardWarna, level: Level): boolean {
  return dashboard === "Hijau" && LEVEL.indexOf(level) <= LEVEL.indexOf("Tinggi");
}

export const nilaiAman = (v: number) => (Number.isFinite(v) && v > 0 ? v : 0);

// ESTIMASI (asumsi A15): p ikut dikembalikan agar UI bisa menampilkannya.
export function rupiahBerisiko(nilaiTahunan: number, level: Level): { p: number; rupiah: number } {
  const p = P_LEVEL[level];
  return { p, rupiah: Math.round(nilaiAman(nilaiTahunan) * p) };
}

export const banding = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

// Bobot menurun, lalu `sejak` lebih awal, lalu `kode` alfabet. Tidak mengubah array masukan.
export function sinyalTeratas(sinyal: Sinyal[], n = MAKS_SINYAL_TERATAS): Sinyal[] {
  return sinyal
    .filter(bobotValid)
    .sort((a, b) => b.bobot - a.bobot || banding(a.sejak, b.sejak) || banding(a.kode, b.kode))
    .slice(0, n);
}
