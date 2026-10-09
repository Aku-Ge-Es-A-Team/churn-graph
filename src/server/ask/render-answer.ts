import type { Klaim } from "../../types/graph";
import type { ValidationResult } from "./validate-citations";

export const PESAN_DITOLAK =
  "Maaf, saya belum bisa menjawab pertanyaan ini dengan bukti yang dapat diverifikasi dari data. " +
  "Silakan coba salah satu pertanyaan preset.";
export const PENANDA_VERIFIKASI = "[perlu verifikasi]";

export type RenderedAnswer = { jawaban: string; klaim: Klaim[]; ditolak: boolean; catatan?: string };

// `jawaban` bebas dari LLM SENGAJA diabaikan: LLM bisa menyelipkan kalimat di sana yang tidak
// ada di `klaim[]`, sehingga lolos ke UI tanpa bukti. Teks tampilan hanya dirakit dari klaim
// yang sudah lolos validator, jadi setiap kalimat yang dilihat pengguna punya bukti_ids terverifikasi.
// Urutan: klaim lolos dulu (urutan asli), lalu klaim ditandai (urutan asli) dengan penanda.
export function renderAnswer(result: ValidationResult): RenderedAnswer {
  const ditandai = result.klaimDitandai.map((d) => d.klaim);
  if (result.klaimLolos.length === 0 && ditandai.length === 0) {
    return { jawaban: PESAN_DITOLAK, klaim: [], ditolak: true };
  }

  const lines = [
    ...result.klaimLolos.map((k) => k.teks.trim()),
    ...ditandai.map((k) => `${PENANDA_VERIFIKASI} ${k.teks.trim()}`),
  ];

  const notes: string[] = [];
  if (ditandai.length) notes.push(`${ditandai.length} klaim perlu verifikasi.`);
  if (result.klaimDibuang.length) notes.push(`${result.klaimDibuang.length} klaim dibuang karena tidak didukung bukti.`);

  return {
    jawaban: lines.join("\n"),
    klaim: [...result.klaimLolos, ...ditandai],
    ditolak: false,
    ...(notes.length ? { catatan: notes.join(" ") } : {}),
  };
}
