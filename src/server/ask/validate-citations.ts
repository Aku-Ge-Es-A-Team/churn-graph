import { KlaimSchema, type Klaim } from "../../types/graph";
import type { EvidenceItem, EvidenceRegistry } from "./evidence";

export type AlasanDibuang =
  | "format_tidak_valid"
  | "tanpa_bukti"
  | "bukti_tidak_dikenal"
  | "kutipan_tanpa_teks_sumber"
  | "kutipan_tidak_cocok";
export type AlasanDitandai = "kutipan_terlalu_pendek" | "angka_tidak_ditemukan";

export type KlaimDitandai = { klaim: Klaim; alasan: AlasanDitandai[] };
// `klaim` null bila elemen dari LLM bahkan tidak berbentuk Klaim.
export type KlaimDibuang = { klaim: Klaim | null; alasan: AlasanDibuang[]; idBermasalah?: string[] };

export type ValidationResult = {
  klaimLolos: Klaim[];
  klaimDitandai: KlaimDitandai[];
  klaimDibuang: KlaimDibuang[];
  valid: boolean;
};

const MIN_PANJANG_KUTIPAN = 8;
const NUMBER_TOKEN = /\d+(?:[.,]\d+)*/g;

export function normalizeText(s: string): string {
  return s
    .replace(/[‘’‚‛′]/g, "'")
    .replace(/[“”„‟″]/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

// HEURISTIK, bisa false positive/negative. Tiap token angka dibaca dua cara
// (Indonesia "1.500.000,5" dan internasional "1,500,000.5") lalu dibandingkan sebagai nilai,
// jadi "15%" = "15 %" dan "Rp 252 jt" = "252". Tidak paham satuan: "252 jt" ≠ "252.000.000".
function numberValues(text: string): Set<number> {
  const out = new Set<number>();
  for (const [tok] of text.matchAll(NUMBER_TOKEN)) {
    const id = Number(tok.replace(/\./g, "").replace(",", "."));
    const intl = Number(tok.replace(/,/g, ""));
    if (!Number.isNaN(id)) out.add(id);
    if (!Number.isNaN(intl)) out.add(intl);
  }
  return out;
}

// Konservatif: SETIAP angka di klaim harus ditemukan di bukti yang dirujuk.
function numbersMissing(klaimTeks: string, sources: EvidenceItem[]): boolean {
  const haystack = sources.map((s) => `${s.teks ?? ""} ${JSON.stringify(s.props ?? {})}`).join(" ");
  const available = numberValues(haystack);
  for (const [tok] of klaimTeks.matchAll(NUMBER_TOKEN)) {
    if (![...numberValues(tok)].some((v) => available.has(v))) return true;
  }
  return false;
}

function checkKlaim(
  klaim: Klaim,
  registry: EvidenceRegistry,
  minKutipan: number,
): { dibuang: KlaimDibuang } | { ditandai: AlasanDitandai[] } {
  if (klaim.teks.trim() === "") return { dibuang: { klaim, alasan: ["format_tidak_valid"] } };

  // 1. Tanpa bukti.
  if (klaim.bukti_ids.length === 0) return { dibuang: { klaim, alasan: ["tanpa_bukti"] } };

  // 2. Satu ID di luar registry cukup untuk membuang klaim.
  const unknown = klaim.bukti_ids.filter((id) => !registry.has(id));
  if (unknown.length) {
    return { dibuang: { klaim, alasan: ["bukti_tidak_dikenal"], idBermasalah: unknown } };
  }
  const sources = klaim.bukti_ids.map((id) => registry.get(id)!);

  const flags: AlasanDitandai[] = [];

  // 3. Kutipan harus substring teks dari bukti yang DIRUJUK klaim ini (peka huruf).
  if (klaim.kutipan !== undefined) {
    const withText = sources.filter((s) => s.teks && s.teks.trim() !== "");
    if (withText.length === 0) return { dibuang: { klaim, alasan: ["kutipan_tanpa_teks_sumber"] } };
    const kutipan = normalizeText(klaim.kutipan);
    if (!withText.some((s) => normalizeText(s.teks!).includes(kutipan))) {
      return { dibuang: { klaim, alasan: ["kutipan_tidak_cocok"] } };
    }
    if (kutipan.length < minKutipan) flags.push("kutipan_terlalu_pendek");
  }

  // 4. Penanda saja.
  if (numbersMissing(klaim.teks, sources)) flags.push("angka_tidak_ditemukan");

  return { ditandai: flags };
}

// `input` adalah keluaran LLM: apa pun bentuknya, fungsi ini tidak melempar error.
// Bila ragu, klaim dibuang; tidak ada jalur yang meloloskan klaim tanpa bukti di registry.
export function validateAnswer(
  input: unknown,
  registry: EvidenceRegistry,
  opts?: { minPanjangKutipan?: number },
): ValidationResult {
  const minKutipan = opts?.minPanjangKutipan ?? MIN_PANJANG_KUTIPAN;
  const result: ValidationResult = { klaimLolos: [], klaimDitandai: [], klaimDibuang: [], valid: false };

  const rawKlaim = (input as { klaim?: unknown } | null | undefined)?.klaim;
  if (typeof input !== "object" || !Array.isArray(rawKlaim)) return result;

  for (const raw of rawKlaim) {
    const parsed = KlaimSchema.safeParse(raw);
    if (!parsed.success) {
      result.klaimDibuang.push({ klaim: null, alasan: ["format_tidak_valid"] });
      continue;
    }
    const outcome = checkKlaim(parsed.data, registry, minKutipan);
    if ("dibuang" in outcome) result.klaimDibuang.push(outcome.dibuang);
    else if (outcome.ditandai.length) result.klaimDitandai.push({ klaim: parsed.data, alasan: outcome.ditandai });
    else result.klaimLolos.push(parsed.data);
  }

  result.valid = result.klaimLolos.length > 0;
  return result;
}
