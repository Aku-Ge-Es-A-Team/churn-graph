// The 12 competency questions of docs/questions.md (Q1–Q12). Used as refusal suggestions, by F-15 (cache)
// and by `bun run eval:ask` (gate J12). Keep in sync with docs/questions.md.
export const PRESET_QUESTIONS = [
  "Akun mana yang paling berisiko churn, dan mengapa?",
  "Mengapa C01 kritis padahal dashboard hijau?",
  "Apakah penurunan usage C03 berarti pelanggan berhenti memakai?",
  "Akun mana lagi yang terdampak, atau berpotensi terdampak, BUG-412?",
  "Janji apa yang pernah diberikan ke C01, siapa yang menyetujui, dan apakah ditepati?",
  "Tindakan retensi apa untuk C04, dan preseden mana yang mendukungnya?",
  "Berapa nilai kontrak yang berisiko dalam 90 hari ke depan?",
  "Kontak pelanggan mana yang pindah perusahaan dalam 6 bulan terakhir?",
  "Di mana Rina sekarang, dan apa dampaknya ke deal P01?",
  "Lewat siapa jalur terbaik menuju decision maker P01?",
  "Diskon tertinggi yang pernah disetujui, oleh siapa, dan apa alasannya?",
  "Pelanggan mana yang akan melampaui batas outlet paketnya?",
] as const;

/** A short subset shown next to a refusal. */
export const REFUSAL_SUGGESTIONS: string[] = [PRESET_QUESTIONS[0], PRESET_QUESTIONS[1], PRESET_QUESTIONS[2]];
