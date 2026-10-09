// Pengaman untuk query Cypher yang berasal dari LLM: fungsi murni, tanpa koneksi database.
// Lapis ini bekerja BERSAMA session READ di driver (lihat neo4j.ts), bukan penggantinya.

const MAX_LIMIT = 200;

// Kata kunci/klausa tulis & berbahaya. Dicocokkan dengan word boundary, case-insensitive.
const DENIED_KEYWORDS = [
  "CREATE",
  "MERGE",
  "DELETE",
  "DETACH",
  "SET",
  "REMOVE",
  "DROP",
  "FOREACH",
  "START",
];

// Mengganti isi komentar/string dengan spasi SEPANJANG ASLINYA (bukan memendekkan),
// supaya posisi karakter tetap sejajar dengan query asli — dibutuhkan agar pemotongan
// klausa LIMIT di bawah bisa dilakukan pada query asli, bukan versi yang sudah disamarkan.
function stripCommentsAndStrings(query: string): string {
  const blank = (match: string) => " ".repeat(match.length);
  return query
    .replace(/\/\*[\s\S]*?\*\//g, blank)
    .replace(/\/\/.*$/gm, blank)
    .replace(/'(?:[^'\\]|\\.)*'/g, blank)
    .replace(/"(?:[^"\\]|\\.)*"/g, blank);
}

function hasWord(haystack: string, word: string): boolean {
  // \s matches newline/tab juga, jadi "DETACH\n DELETE" tetap kena.
  return new RegExp(`\\b${word}\\b`, "i").test(haystack);
}

export type GuardResult = { ok: true; query: string } | { ok: false; alasan: string };

export function guardCypher(query: string, opts?: { maxLimit?: number }): GuardResult {
  const maxLimit = opts?.maxLimit ?? MAX_LIMIT;
  const trimmed = query.trim();
  if (!trimmed) {
    return { ok: false, alasan: "Query kosong tidak diizinkan." };
  }

  // withoutTrailingSemicolon tetap berisi teks ASLI (dipakai untuk hasil akhir).
  // cleaned dipakai HANYA untuk pemeriksaan kata kunci, posisinya sejajar dengan aslinya.
  const withoutTrailingSemicolon = trimmed.replace(/;+\s*$/, "");
  const cleaned = stripCommentsAndStrings(withoutTrailingSemicolon);

  // Titik koma di luar string/komentar berarti multi-statement.
  if (cleaned.includes(";")) {
    return { ok: false, alasan: "Hanya satu statement yang diizinkan." };
  }

  for (const keyword of DENIED_KEYWORDS) {
    if (hasWord(cleaned, keyword)) {
      return { ok: false, alasan: `Klausa "${keyword}" tidak diizinkan.` };
    }
  }

  if (/\bLOAD\s+CSV\b/i.test(cleaned)) {
    return { ok: false, alasan: 'Klausa "LOAD CSV" tidak diizinkan.' };
  }

  if (/\bapoc\s*\./i.test(cleaned)) {
    return { ok: false, alasan: 'Namespace "apoc" tidak diizinkan.' };
  }
  if (/\bdbms\s*\./i.test(cleaned)) {
    return { ok: false, alasan: 'Namespace "dbms" tidak diizinkan.' };
  }

  // Semua CALL dilarang kecuali satu prosedur full-text yang diizinkan.
  const callMatches = cleaned.matchAll(/\bCALL\s+([a-zA-Z0-9_.]+)/gi);
  for (const match of callMatches) {
    if (match[1].toLowerCase() !== "db.index.fulltext.querynodes") {
      return { ok: false, alasan: "Prosedur CALL tidak diizinkan." };
    }
  }

  // Paksa LIMIT di level atas. Query tanpa LIMIT dapat default aman; LIMIT yang melebihi
  // batas DITURUNKAN (bukan ditolak) karena niat pengguna ("butuh baris") tetap valid,
  // hanya jumlahnya yang perlu dibatasi agar tidak membebani database.
  // Dicari di `cleaned` (posisinya sejajar dengan `withoutTrailingSemicolon`) supaya LIMIT
  // palsu di dalam string/komentar tidak ikut terdeteksi, lalu dipotong dari teks ASLI.
  const limitMatch = cleaned.match(/\bLIMIT\s+(\d+)\s*$/i);
  let finalQuery = withoutTrailingSemicolon;
  if (!limitMatch) {
    finalQuery = `${finalQuery} LIMIT ${maxLimit}`;
  } else {
    const requested = parseInt(limitMatch[1], 10);
    if (requested > maxLimit) {
      finalQuery = withoutTrailingSemicolon.slice(0, limitMatch.index) + `LIMIT ${maxLimit}`;
    }
  }

  return { ok: true, query: finalQuery };
}
