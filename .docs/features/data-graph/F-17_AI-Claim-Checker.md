# 16 -- AI Claim Checker, batch
> ID PRD: F-17 · Prioritas: Should #3 · Penanggung jawab: Adrian (Data Graph) · Estimasi: 3 jam-orang (PRD) · Status: Belum dimulai

## 1. Ringkasan Fitur
- Apa: pekerjaan batch saat rebuild yang mengklasifikasi setiap kalimat dari ±32 interaksi non-template, memakai kalimat itu sendiri sebagai kutipan, mencocokkan klaim ke data terstruktur, lalu membuat node `Klaim` dan sinyal "Janji internal vs eksternal" (I0224 vs I0258). Tidak dipanggil live saat demo.
- Untuk siapa: Laras -- janji yang disampaikan ke klien dicocokkan dengan status sebenarnya sehingga janji yang dilanggar terlihat.
- Peran di ★ jalur demo utama: memperkaya langkah 2 (janji FEAT-07 → `decision_log`); bukan syarat jalur demo.

## 2. Acuan PRD & TDD
- PRD: §5 (OUT OF SCOPE X2: tidak ada embeddings), §6 F-17 (Should #3), §7 (J9–13, hanya bila gerbang J8 lolos; spike TypeSafe J9–10), §8 (A8, A10, A20), §9 (opsional TypeSafe Jev `@typesafe-ai/sdk`, versi exact).
- TDD (acuan sementara = Rencana Teknis): §2.1 (AI/LLM: Vercel AI SDK `ai` + paket provider; model cepat-murah dengan tool calling), §1.3 Langkah 9 (efisiensi token; validator sitasi F10), §1.3 Langkah 7 (kontrak sinyal). Fitur ini TIDAK ada di Rencana Teknis §3.4; acuan teknis terbatas, lihat section 9.
- Keputusan yang dikunci:
  - Backend memakai TypeSafe Jev bila spike J9–10 lolos; selain itu AI SDK structured output.
  - Fitur batch dan tidak dipanggil live saat demo.
  - Kutipan = kalimat itu sendiri (harus substring dari teks sumber; aturan F-10).
  - Sinyal mengikuti kontrak F-04 `{akun, kode, bobot, bukti_ids, fakta, sejak}` dengan kode `JANJI_INTERNAL_VS_EKSTERNAL` (ditetapkan di F-04).
  - Hanya berjalan bila gerbang J8 (golden F-04) lolos.

## 3. User Stories & Acceptance Criteria
- User story: Sebagai Laras, saya ingin janji yang disampaikan ke klien dicocokkan dengan status sebenarnya, agar janji yang dilanggar terlihat.
- Acceptance criteria:
  - Diberikan ±32 interaksi non-template, ketika rebuild dijalankan, maka setiap kalimat diklasifikasi dan kalimat itu sendiri dipakai sebagai kutipan.
  - Diberikan klaim I0224 vs I0258, ketika dicocokkan ke data terstruktur, maka terbentuk node `Klaim` + sinyal "Janji internal vs eksternal".
  - Backend memakai TypeSafe Jev bila spike J9–10 lolos; selain itu AI SDK structured output. Fitur tidak dipanggil live saat demo.
- Kriteria teknis tambahan:
  - (tambahan teknis) Hanya interaksi `template=false` yang dikirim ke LLM (hemat token); payload JSON ringkas (ID + properti kunci).
  - (tambahan teknis) Hasil LLM di-cache ke berkas di `data/build/` (nama ⚠️ ASUMSI) sehingga rebuild berikutnya tidak memanggil LLM dan hasilnya stabil.
  - (tambahan teknis) Kutipan yang bukan substring dari teks sumber dibuang (memakai logika validasi yang sama dengan 09 / F-10).
  - (tambahan teknis) Keluaran terstruktur divalidasi dengan `zod`; klaim tanpa interaksi sumber ditolak.

## 4. Ruang Lingkup Fitur
- Termasuk:
  - Spike TypeSafe Jev (20 tiket berlabel) → keputusan Jev ya/tidak (A20).
  - Skema klasifikasi kalimat, prompt, batch runner, cache hasil.
  - Pencocokan klaim ke data terstruktur (keputusan, fitur, rilis) dan pembentukan node `Klaim` beserta relasinya.
  - Penulisan sinyal `JANJI_INTERNAL_VS_EKSTERNAL` mengikuti kontrak F-04.
  - Tes dengan fixture (tanpa memanggil LLM).
- Tidak termasuk:
  - Runner aturan Cypher dan aturan `JANJI_DILANGGAR` (R2) → 04 (F-04).
  - Validator sitasi untuk jawaban Tanya Graph → 09 (F-10), 13 (F-14).
  - Pemanggilan live saat demo, embeddings/GraphRAG (X2, OUT OF SCOPE).
- Pengganti sementara: hasil klaim di-cache; tanpa API key, tes memakai fixture hasil LLM.

## 5. API, Data & Komponen yang Disentuh
| Jenis | Nama | Aksi | Acuan TDD |
| --- | --- | --- | --- |
| Modul BE | skrip batch klaim (⚠️ path asumsi: `scripts/claims.ts`) | Buat | Rencana Teknis §2.1 (AI SDK), §2.4 (`scripts/`) |
| Modul BE | validasi kutipan substring dari `src/server/ai/` (F-10) | Pakai | Rencana Teknis §1.3 Langkah 9 |
| Tabel (node graph) | `:Klaim` | Buat | manifest §2 (daftar label); Rencana Teknis tidak merinci |
| Relasi | relasi `Klaim` ↔ `Interaksi`/`Keputusan`/`Akun` (lihat 🔁 USULAN PERUBAHAN) | Buat | -- |
| Tabel (node graph) | `:Sinyal`, `PADA`, `BUKTI` | Pakai | Rencana Teknis §1.3 Langkah 7 |
| Tabel (node graph) | `:Interaksi`, `:Keputusan`, `:Fitur`, `:Rilis`, `:Akun` | Pakai | Rencana Teknis §1.3 Langkah 3 |
| Library | `ai` (Vercel AI SDK) + paket provider; `@typesafe-ai/sdk` (versi exact, opsional) | Pakai | Rencana Teknis §2.1; PRD §9 |
| Env var | `LLM_BASE_URL`, `LLM_API_KEY`, `LLM_MODEL` (9router, keputusan final); `NEO4J_URI`, `NEO4J_USERNAME`, `NEO4J_PASSWORD` | Pakai | Rencana Teknis §1.3 Langkah 12, 2 |
| Env var | kredensial TypeSafe (lihat 🔁 USULAN PERUBAHAN) | Buat | -- |
| Script | `package.json` → `claims` + penyisipan di `rebuild` (lihat 🔁) | Ubah | Rencana Teknis §1.3 Langkah 4 |

## 6. Breakdown Task Implementasi
| ID | Task | Layer | Estimasi (jam) | Bergantung pada | Output terverifikasi |
| --- | --- | --- | --- | --- | --- |
| T16-01 | Spike TypeSafe Jev: klasifikasikan 20 tiket berlabel, bandingkan akurasi vs kamus (A20); putuskan Jev atau AI SDK structured output. **Terblokir** untuk jalur Jev sampai nama env TypeSafe disepakati (🔁); jalur AI SDK tidak terblokir. | Test | 1,0 | 04 (F-04, gerbang J8), 09 (F-10) | Catatan keputusan Jev ya/tidak dengan akurasi dari 20 sampel. |
| T16-02 | Skema `zod` + prompt klasifikasi kalimat (kelas klaim, kalimat = kutipan, interaksi sumber, akun). Daftar kelas belum ditetapkan PRD (⚠️ ASUMSI). | BE | 0,75 | T16-01 | Fixture 3 interaksi menghasilkan JSON yang lolos `zod`; kutipan = substring dari `isi` interaksi. |
| T16-03 | Skrip batch: ambil ±32 interaksi `template=false`, panggil model dengan JSON ringkas, cache hasil ke `data/build/`, sisipkan ke `rebuild`. **Terblokir** oleh 🔁 (script `claims`/urutan `rebuild`). | BE | 0,75 | T16-02, 15 (F-16) | Run pertama memanggil LLM sekali per interaksi; run kedua memakai cache (0 panggilan). |
| T16-04 | Pencocokan klaim ke data terstruktur (keputusan/fitur/rilis) dan pembentukan node `Klaim` + relasinya. **Terblokir** sampai 🔁 tipe relasi `Klaim` disetujui. | BE | 0,75 | T16-03 | I0224 dan I0258 menjadi `Klaim` terhubung ke interaksi sumber dan ke data terstruktur yang dicocokkan; hasil cocok-vs-bertentangan terlihat di properti. |
| T16-05 | Tulis sinyal `JANJI_INTERNAL_VS_EKSTERNAL` sesuai kontrak F-04 (`PADA`, `BUKTI`, `sejak`, `fakta` JSON string) tanpa menghapus sinyal runner F-04. | DB | 0,5 | T16-04 | `Sinyal` untuk akun terkait I0224/I0258 ada dengan `bukti_ids` memuat kedua interaksi; sinyal F-04 tetap utuh. |
| T16-06 | Guard kutipan: pakai logika substring dari 09 (F-10); buang klaim tanpa kutipan valid atau tanpa interaksi sumber. | BE | 0,25 | T16-02, 09 (F-10) | Klaim dengan kutipan karangan tidak masuk graph. |
| T16-07 | Tes `tests/golden/claims.test.ts` (⚠️ nama berkas asumsi) dengan fixture hasil LLM: I0224 vs I0258 → `Klaim` + sinyal; interaksi template tidak diproses; idempoten. | Test | 0,5 | T16-05, T16-06 | `bun test tests/golden/claims.test.ts` hijau; jalur error: klaim dengan kutipan bukan substring ditolak. |
| | **Total 4,5 jam termasuk spike (3,5 jam tanpa spike); estimasi PRD: 3 jam** -- selisih +50% (+17% tanpa spike), lihat ⚠️ ASUMSI di section 9. | | | | |

## 7. Dependensi
- Bergantung pada fitur: 04 (F-04) -- runner dan kontrak sinyal serta gerbang J8; 09 (F-10) -- validasi sitasi/kutipan; 15 (F-16) -- identitas email yang benar.
- Memblokir fitur: tidak ada.
- Dependensi eksternal: API key LLM dengan kuota cukup (A8, A10); kredensial TypeSafe bila Jev dipakai; internet; gerbang J8 lolos (jika tidak, fitur dibatalkan).
- Bisa mulai lebih dulu dengan mock: sebagian -- skema, prompt, dan tes dengan fixture hasil LLM bisa dibuat tanpa API key; pemanggilan nyata menunggu key dan 04/09/15.

## 8. Cara Uji
| Acceptance criteria | Cara uji | Otomatis/Manual |
| --- | --- | --- |
| Setiap kalimat dari ±32 interaksi non-template diklasifikasi, kutipan = kalimat itu sendiri | Jalankan batch (atau fixture hasil LLM); assert jumlah interaksi yang diproses = 32 dan setiap kutipan adalah substring `isi`; jalur error: kutipan karangan ditolak | Otomatis (fixture) + manual (satu run nyata) |
| I0224 vs I0258 → node `Klaim` + sinyal | Query `Klaim` terkait kedua interaksi dan `Sinyal` dengan kode `JANJI_INTERNAL_VS_EKSTERNAL` | Otomatis |
| Fitur tidak dipanggil live saat demo | Tidak ada route handler yang memanggil batch; run kedua memakai cache | Otomatis (cek cache) + manual (review kode) |
| (tambahan teknis) interaksi template tidak diproses | Assert tidak ada `Klaim` dari interaksi `template=true` | Otomatis |

## 9. Asumsi, Konflik & Risiko
- ⚠️ ASUMSI: total 4,5 jam vs estimasi PRD 3 jam (+50%, >25%). Spike TypeSafe (±1 jam, PRD §7 baris "J9–10") adalah entri jadwal terpisah, kemungkinan tidak termasuk 3 jam F-17; tanpa spike 3,5 jam (+17%). -- cara validasi: konfirmasi ke Adrian/Dio apakah spike dihitung terpisah.
- ⚠️ ASUMSI: jumlah ±32 interaksi non-template = 350 − 318; daftar kelas klaim, definisi "kalimat bertentangan", dan sumber data terstruktur untuk pencocokan belum tertulis di PRD/Rencana Teknis. -- cara validasi: baca I0224 dan I0258 di T16-02 dan tentukan kelas minimum yang dibutuhkan kasus itu.
- ⚠️ ASUMSI (A8, A10, A20): provider LLM = 9router (OpenAI-compatible, sudah diputuskan); kuota cukup; Jev akurat untuk teks Indonesia. -- cara validasi: spike T16-01.
- ⚠️ ASUMSI: skrip batch di `scripts/claims.ts` dan cache di `data/build/`; nama tidak ditetapkan Rencana Teknis. -- cara validasi: sepakati dengan Dio.
- ⛔ KONFLIK: fitur ini ada di PRD (F-17, ex-P15) tetapi tidak ada di Rencana Teknis §3.4 (tidak ada detail teknis, relasi `Klaim`, atau langkah rebuild). Aturan prioritas: ikuti PRD -- dipakai sementara: PRD F-17 + deskripsi stack di Rencana Teknis §2.1.
- ✅ KEPUTUSAN (K-A, 2026-10-09, Adrian): Prisma + Supabase dihapus dari repo; penyimpanan graph hanya Neo4j AuraDB Free (PRD §9, Rencana Teknis §2.3). Fitur ini tidak memakai Prisma/Supabase.
- 🔁 USULAN PERUBAHAN: (1) tambahkan tipe relasi untuk `:Klaim` ke tabel relasi Rencana Teknis Langkah 3; usul: `(Klaim)-[:DIKUTIP_DARI]->(Interaksi)` dan `(Klaim)-[:BERTENTANGAN_DENGAN]->(Keputusan|Klaim)` -- alasan: tabel relasi tidak memuat `Klaim`. Task terblokir: T16-04. (2) tambahkan script `claims` dan sisipkan di `rebuild` setelah `signals` -- alasan: PRD meminta klaim diklasifikasi saat rebuild, sedangkan script `rebuild` Rencana Teknis hanya etl → load → derive → signals. Task terblokir: T16-03. (3) tetapkan nama env var kredensial TypeSafe -- alasan: tidak ada di PRD/Rencana Teknis; hanya dibutuhkan bila Jev dipakai. Task terblokir: T16-01 (jalur Jev).
- Risiko: LLM salah mengklasifikasi kalimat Indonesia -- mitigasi/fallback: kutipan wajib substring, cache, dan fallback ke AI SDK; fitur dipotong bila J8 gagal (PRD §7).
- Risiko: kuota/biaya LLM -- mitigasi/fallback: hanya ±32 interaksi, cache hasil, payload ringkas.

## 10. Definition of Done
- [ ] Semua acceptance criteria di section 3 lolos uji di section 8
- [ ] Semua task di section 6 selesai, atau sudah dipindah secara eksplisit
- [ ] Lint, typecheck, dan build lulus
- [ ] Tidak ada secret yang di-hardcode; konfigurasi lewat environment variable (API key LLM/TypeSafe hanya di `.env.local`)
- [ ] Implementasi sesuai kontrak dan skema TDD, tanpa perubahan yang tidak tercatat
- [ ] UI di jalur demo punya tampilan loading, kosong, dan error (tidak berlaku: fitur non-UI)
- [ ] Sudah dicek di lingkungan deploy (dijalankan dari laptop terhadap Aura; tidak dipanggil di Vercel)
- [ ] PR sudah direview dan di-merge, lalu status di header file diperbarui
- [ ] Keputusan Jev/AI SDK tercatat; ketiga 🔁 diputuskan; hasil klaim ter-cache sehingga demo tidak butuh LLM
