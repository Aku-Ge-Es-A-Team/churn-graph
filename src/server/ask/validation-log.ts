import type { ValidationResult } from "./validate-citations";

// Hanya hitungan dan kode alasan: teks pertanyaan pengguna dan isi `teks` sumber tidak pernah dicatat.
export type ValidationLogEntry = {
  waktu: string;
  lolos: number;
  ditandai: number;
  dibuang: number;
  alasan: string[];
};

// ponytail: in-memory per instance, tumbuh tanpa batas dan hilang saat restart; cukup untuk demo/drill.
const entries: ValidationLogEntry[] = [];

export function logValidation(result: ValidationResult): ValidationLogEntry {
  const entry: ValidationLogEntry = {
    waktu: new Date().toISOString(),
    lolos: result.klaimLolos.length,
    ditandai: result.klaimDitandai.length,
    dibuang: result.klaimDibuang.length,
    alasan: [...result.klaimDitandai, ...result.klaimDibuang].flatMap((k) => k.alasan),
  };
  entries.push(entry);
  console.info(JSON.stringify({ event: "validasi_sitasi", ...entry }));
  return entry;
}

export function getValidationStats() {
  const perAlasan: Record<string, number> = {};
  let klaimLolos = 0;
  for (const e of entries) {
    klaimLolos += e.lolos;
    for (const a of e.alasan) perAlasan[a] = (perAlasan[a] ?? 0) + 1;
  }
  return { jumlahValidasi: entries.length, klaimLolos, perAlasan };
}

export function resetValidationLog(): void {
  entries.length = 0;
}
