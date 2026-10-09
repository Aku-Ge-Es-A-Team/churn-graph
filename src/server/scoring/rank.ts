import type { DashboardWarna, RiskRow, Sinyal } from "../../types/graph";
import { KONFIG_DEFAULT, type ScoringConfig } from "./config";
import {
  banding,
  bobotValid,
  hariKeRenewal,
  hitungDivergen,
  nilaiAman,
  rupiahBerisiko,
  sinyalTeratas,
  skorAkun,
  tentukanLevel,
} from "./score";

export type AkunInfo = {
  akun: string;
  nama: string;
  dashboard: DashboardWarna;
  nilaiTahunan: number;
  tanggalRenewal: string | null;
};

// null (tanpa tanggal renewal) ditaruh paling akhir.
const bandingRenewal = (a: number | null, b: number | null) =>
  a === b ? 0 : a === null ? 1 : b === null ? -1 : a - b;

// Skor menurun → renewal terdekat → nilai tahunan terbesar → ID akun alfabet.
const bandingBaris = (a: RiskRow, b: RiskRow) =>
  b.skor - a.skor ||
  bandingRenewal(a.renewalHari, b.renewalHari) ||
  nilaiAman(b.nilaiTahunan) - nilaiAman(a.nilaiTahunan) ||
  banding(a.akun, b.akun);

// Murni: tidak mengubah masukan. Sinyal untuk akun yang tidak ada di akunList diabaikan (lihat sinyalDiabaikan).
export function susunRiskRows(
  akunList: AkunInfo[],
  sinyalSemua: Sinyal[],
  asOf: Date,
  cfg: ScoringConfig = KONFIG_DEFAULT,
): RiskRow[] {
  const perAkun = Map.groupBy(sinyalSemua, (s) => s.akun);
  return akunList
    .map((a): RiskRow => {
      const sinyal = perAkun.get(a.akun) ?? [];
      const renewalHari = hariKeRenewal(a.tanggalRenewal, asOf);
      const skor = skorAkun(sinyal, renewalHari, cfg);
      const level = tentukanLevel(skor, cfg);
      const { p, rupiah } = rupiahBerisiko(a.nilaiTahunan, level);
      return {
        akun: a.akun,
        nama: a.nama,
        dashboard: a.dashboard,
        level,
        skor,
        divergen: hitungDivergen(a.dashboard, level),
        renewalHari,
        nilaiTahunan: a.nilaiTahunan,
        rupiahBerisiko: rupiah,
        p,
        sinyalTeratas: sinyalTeratas(sinyal, cfg.maksSinyalTeratas),
      };
    })
    .sort(bandingBaris);
}

// Pendamping susunRiskRows: sinyal yang tidak ikut dihitung, untuk dilog/dilaporkan pemanggil.
export function sinyalDiabaikan(akunList: AkunInfo[], sinyalSemua: Sinyal[]) {
  const dikenal = new Set(akunList.map((a) => a.akun));
  return {
    akunTakDikenal: sinyalSemua.filter((s) => !dikenal.has(s.akun)),
    bobotTidakValid: sinyalSemua.filter((s) => dikenal.has(s.akun) && !bobotValid(s)),
  };
}
