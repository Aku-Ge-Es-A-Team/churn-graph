# 13 -- Tanya Graph versi sempit
> ID PRD: F-14 · Prioritas: Must · Penanggung jawab: Dio (Backend & AI) · Estimasi: 3 jam-orang (PRD); total task 6,75 jam · Status: Belum dimulai

## 1. Ringkasan Fitur
- Apa: `POST /api/ask` -- Q&A bahasa Indonesia atas graph lewat Vercel AI SDK dengan tool calling terbatas pada tool tetap (ranking, sinyal, bukti, preseden, teks, koneksi). Keluaran `{jawaban, klaim[]}` selalu melewati validator F-10; halaman `/tanya` menampilkan jawaban dan chip ID bukti.
- Untuk siapa: Bima (Account Manager) -- pertanyaan ad-hoc di rapat, termasuk tentang akun di luar C01–C06, langsung terjawab dengan bukti.
- Peran di ★ jalur demo utama: langkah 6 (ketik pertanyaan baru; jawaban dengan chip ID bukti yang lolos validator). Gerbang J12: ≥6 dari 12 preset terjawab dengan bukti.

## 2. Acuan PRD & TDD
- PRD: §2 T3, §3 kasus penggunaan 4, §4 metrik (pertanyaan preset, pertanyaan kejutan, klaim tanpa bukti), §5 OUT OF SCOPE X7, §6 F-14, §7 (J10–12, gerbang J12, pemotongan butir 4), §8 A8, A10, A16, A19, §9 jalur demo langkah 6.
- TDD (acuan sementara): Rencana Teknis §1.3 Langkah 9 (tabel tool, aturan system prompt, kontrak output, validator, `maxDuration = 60`), Langkah 8 (fungsi query yang dibungkus tool), Langkah 10 (`/tanya`), Langkah 12 (env LLM, batas pengeluaran), §2.1 (AI SDK), §3.4 "F09 · Tanya Graph (Q&A ad-hoc)" (ID F09 milik Rencana, bukan ID PRD).
- Keputusan yang dikunci:
  - Tool tetap saja: `get_ranking`, `get_account_signals`, `get_evidence`, `find_precedents`, `search_text`, `find_connection` (Rencana Teknis Langkah 9). Tool `run_cypher` TIDAK dibangun (F-28, Could; ⛔ K-G).
  - LLM tidak menyentuh database bebas; semua tool memakai fungsi query/`readCypher`.
  - Aturan system prompt: bahasa Indonesia; setiap klaim menyebut ID node dari hasil tool; tanpa hasil tool → "tidak ditemukan bukti"; angka rupiah hanya dari output skoring berlabel Estimasi; penyimpangan preseden disebut beserta alasannya.
  - Kontrak keluaran `{ jawaban, klaim: [{ teks, bukti_ids }] }` divalidasi F-10 sebelum sampai ke UI.
  - Pertanyaan di luar kemampuan tool → ditolak sopan dan menyarankan preset.
  - Hasil tool dikirim ke LLM sebagai JSON ringkas dan dipotong (efisiensi token).

## 3. User Stories & Acceptance Criteria
- User story: Sebagai Bima, saya ingin mengetik pertanyaan baru dalam bahasa Indonesia dan mendapat jawaban dengan bukti, agar pertanyaan ad-hoc di rapat langsung terjawab.
- Acceptance criteria:
  - Diberikan pertanyaan, ketika `POST /api/ask` dipanggil, maka AI SDK hanya memakai tool tetap (ranking, sinyal, bukti, preseden, teks, koneksi) dan mengembalikan `{jawaban, klaim[]}` yang sudah lolos F-10.
  - Diberikan pertanyaan tentang akun di luar C01–C06, ketika dijawab, maka jawaban memakai data akun tersebut, bukan template.
  - Gerbang J12: ≥6 dari 12 preset terjawab dengan bukti. Bila tidak, demo memakai F-15 + konsol Aura.
  - Diberikan pertanyaan di luar kemampuan tool, ketika diproses, maka sistem menolak dengan sopan dan menyarankan preset.
- Kriteria teknis tambahan:
  - (tambahan teknis) `src/app/api/ask/route.ts` mengekspor `maxDuration = 60`; tidak memakai `export const dynamic`/`revalidate` (dihapus saat Cache Components aktif).
  - (tambahan teknis) Pertanyaan yang tidak memicu satu pun tool dijawab dengan penolakan sopan + saran preset, bukan jawaban dari pengetahuan model.
  - (tambahan teknis) Kegagalan LLM (key tidak valid, kuota habis, timeout) mengembalikan pesan error terstruktur; UI menyarankan preset (F-15) sebagai jalur cadangan.
  - (tambahan teknis) Target waktu jawaban ±20 detik (Rencana Teknis Langkah 11, ditandai target).

## 4. Ruang Lingkup Fitur
- Termasuk: route handler `POST /api/ask`; bungkus tool untuk fungsi yang sudah ada (ranking, sinyal, bukti, preseden) serta dua query baru `search_text` (full-text) dan `find_connection` (`shortestPath` ≤4 hop); system prompt dan keluaran terstruktur; integrasi validator F-10; perakitan respons (klaim lolos + subgraph dari `bukti_ids` lolos); penolakan sopan; halaman `/tanya` minimal; evaluasi 12 preset dan uji akun di luar C01–C06.
- Tidak termasuk: validator sitasi dan `readCypher` (09, F-10); fungsi `getRanking` (05), `getSignals` (04/05), `getAccountEvidence` (07), preseden (08); cache jawaban dan tombol preset (14, F-15); konsol Cypher (21, F-22); tool `run_cypher`/text-to-Cypher dan ringkasan skema + 5 contoh Cypher yang hanya dibutuhkan `run_cypher` (F-28, Could, ⛔ K-G); AI Claim Checker (16, F-17); chatbot bebas (OUT OF SCOPE X7).
- Pengganti sementara: keluaran tool tiruan untuk menguji validator dan UI sebelum F-04–F-09 siap; respons `/api/ask` tiruan (fixture) untuk halaman `/tanya`; fixture tidak tampil di demo final.

## 5. API, Data & Komponen yang Disentuh
| Jenis | Nama | Aksi | Acuan TDD |
| --- | --- | --- | --- |
| Endpoint | `POST /api/ask` (`src/app/api/ask/route.ts`) | Buat | PRD F-14; Rencana Teknis Langkah 8–9 |
| Modul BE | `src/server/ai/` (definisi tool, system prompt, perakit respons) | Buat | Rencana Teknis §2.4, Langkah 9 |
| Modul BE | `src/server/queries/` -- `risk.ts` (`getRanking`, `getSignals`), `evidence.ts` (`getAccountEvidence`, induced subgraph), `precedents.ts` | Pakai | Rencana Teknis Langkah 8 |
| Modul BE | `src/server/queries/connection.ts` (`find_connection`) dan query `search_text` | Buat | Rencana Teknis §2.4, Langkah 9 |
| Modul BE | Validator sitasi + `readCypher` (09) | Pakai | Rencana Teknis Langkah 8–9 |
| Layanan eksternal | Endpoint LLM 9router (OpenAI-compatible) dengan tool calling, lewat `getLlmModel()` di `src/server/ai/provider.ts` (A8 terbukti di spike T00-12) | Pakai | Rencana Teknis §2.1 |
| Library | `ai` (Vercel AI SDK) + paket provider sesuai pilihan (⚠️ ASUMSI A8); `zod` untuk skema input tool | Pakai (`bun add --exact`) | Rencana Teknis §2.1 |
| Env var | `LLM_BASE_URL`, `LLM_API_KEY`, `LLM_MODEL`, `NEO4J_URI`, `NEO4J_USERNAME`, `NEO4J_PASSWORD` | Pakai | Rencana Teknis Langkah 2, 12, §2.4 |
| Indeks | Full-text index `teks_bebas` di `cypher/schema.cypher` | Pakai | Rencana Teknis Langkah 5 |
| Node/relasi | `:Sinyal`, `:Keputusan`, `:Interaksi`, `:Tiket`, `MENYETUJUI`, `PADA`, `BUKTI` | Pakai | Rencana Teknis Langkah 3 |
| Komponen FE | Halaman `/tanya` (input, jawaban, chip ID bukti, subgraph) | Buat | Rencana Teknis Langkah 10 |
| Test | Evaluasi 12 preset (`docs/questions.md`) dan uji kejutan | Buat | PRD §4 |

## 6. Breakdown Task Implementasi
| ID | Task | Layer | Estimasi (jam) | Bergantung pada | Output terverifikasi |
| --- | --- | --- | --- | --- | --- |
| T13-01 | `ai` dan `@ai-sdk/openai-compatible` sudah terpasang (T00-12); pakai `getLlmModel()` dari `src/server/ai/provider.ts`; pastikan `LLM_BASE_URL`, `LLM_API_KEY`, `LLM_MODEL` ada di `.env.local` dan env Vercel; buat `src/app/api/ask/route.ts` (skeleton, `maxDuration = 60`) | BE | 0,5 | 00 (spike key LLM + keputusan provider, PRD §8 pertanyaan 2) | `POST /api/ask` dengan pertanyaan sederhana menghasilkan satu tool call berhasil dan respons 200 |
| T13-02 | Bungkus tool `get_ranking`, `get_account_signals`, `get_evidence`, `find_precedents` (skema input `zod`, hasil JSON ringkas: ID + properti kunci, dipotong) di atas fungsi 05/07/08 | BE | 1,0 | 05 (F-05), 07 (F-08), 08 (F-09) | Tiap tool dipanggil terpisah dari test dan mengembalikan ID node; ukuran hasil dibatasi |
| T13-03 | Buat tool `search_text` (full-text `teks_bebas` atas interaksi/tiket) dan `find_connection` (`shortestPath` ≤4 hop antar dua entitas) lewat `readCypher` | BE | 1,0 | 09 (F-10), 04 (F-04: data & indeks termuat) | `search_text("KasirPro")` mengembalikan interaksi non-template; `find_connection` antar dua ID mengembalikan jalur atau "tidak ada jalur" |
| T13-04 | System prompt (5 aturan Rencana Teknis Langkah 9, bahasa Indonesia) dan keluaran terstruktur `{ jawaban, klaim: [{ teks, bukti_ids }] }`; hanya tool tetap yang didaftarkan | BE | 0,5 | T13-01, T13-02 | Respons selalu berbentuk kontrak (validasi skema `zod`); `run_cypher` tidak terdaftar |
| T13-05 | Integrasi validator F-10: kumpulkan ID dan teks dari hasil tool, validasi klaim, rakit respons (jawaban dirender dari klaim lolos; subgraph dari `bukti_ids` lolos lewat fungsi induced subgraph 07); log hasil validator | BE | 0,75 | T13-02, T13-03, T13-04, 09 (F-10), 07 (F-08) | Klaim dengan ID palsu tidak muncul di respons; respons memuat `GraphPayload` dari `bukti_ids` lolos |
| T13-06 | Penolakan sopan di luar kemampuan tool: bila tak ada tool terpanggil atau semua klaim dibuang → pesan "tidak ditemukan bukti" + saran preset; error LLM (key/kuota/timeout) → pesan terstruktur | BE | 0,5 | T13-05 | Pertanyaan di luar domain mengembalikan penolakan + saran preset; kunci API salah → error terstruktur tanpa membocorkan key |
| T13-07 | Halaman `/tanya` minimal: input, state loading/kosong/error, jawaban, chip ID bukti, penampil subgraph (menggunakan komponen F-12 bila sudah ada) -- ⚠️ ASUMSI pemilik: Tegar | FE | 1,0 | Kontrak respons T13-04; **bisa paralel** dengan respons tiruan; 11 (F-12) bersifat dependensi lunak | Pertanyaan diketik → jawaban + chip tampil; chip ID dapat diklik/disorot; tidak ada error konsol |
| T13-08 | Evaluasi gerbang J12: jalankan 12 pertanyaan preset (`docs/questions.md`), hitung jawaban yang semua klaimnya punya `bukti_ids` valid; catat pertanyaan yang gagal dan sebabnya (tool/prompt/data) | Test | 1,0 | T13-05, T13-07 | Tabel hasil 12 preset; ≥6/12 → gerbang lulus, selain itu F-14 dibekukan sebagai beta dan demo memakai 14 (F-15) |
| T13-09 | Uji akun di luar C01–C06 (jawaban memakai data akun itu, bukan template), pertanyaan di luar kemampuan, dan jalur error LLM | Test | 0,5 | T13-06, T13-08 | Minimal tiga akun acak non-fokus dijawab dengan ID bukti miliknya; penolakan sopan muncul untuk pertanyaan di luar domain |
| | **Total 6,75 jam (estimasi PRD: 3 jam)** | | | | |

## 7. Dependensi
- Bergantung pada fitur: 05 (F-05) -- ranking/rupiah; 07 (F-08) -- bukti & induced subgraph; 08 (F-09) -- preseden; 09 (F-10) -- `readCypher` + validator; 00 -- spike key LLM, provider terpilih, `docs/questions.md`, koneksi Aura. Dependensi lunak: 11 (F-12) untuk penampil subgraph di `/tanya`.
- Memblokir fitur: 14 (F-15) -- cache jawaban memakai fungsi ini.
- Dependensi eksternal: API key LLM dengan tool calling dan kuota cukup (A8, A10); nama env var key mengikuti provider terpilih; Aura aktif; internet venue stabil (A17).
- Bisa mulai lebih dulu dengan mock: ya untuk T13-01, T13-04 (dengan tool tiruan), dan T13-07 (respons tiruan); T13-02/T13-03/T13-08 menunggu fungsi 05/07/08/09 dan data nyata.

## 8. Cara Uji
| Acceptance criteria | Cara uji | Otomatis/Manual |
| --- | --- | --- |
| `POST /api/ask` memakai tool tetap dan keluaran `{jawaban, klaim[]}` lolos F-10 (happy path) | Test integrasi memanggil route dengan "Mengapa C01 kritis padahal dashboard hijau?"; assert bentuk keluaran, semua `bukti_ids` ada di hasil tool | Otomatis (butuh Aura + key LLM) |
| Hanya tool tetap terdaftar | Test: daftar tool = enam nama tetap; `run_cypher` tidak ada | Otomatis |
| Akun di luar C01–C06 dijawab dengan data akun tersebut | Tiga pertanyaan akun acak; periksa ID node pada klaim milik akun itu | Manual + otomatis (assert ID) |
| Gerbang J12 ≥6/12 preset | Jalankan 12 preset; hitung jawaban yang semua klaimnya valid | Manual (nondeterministik, dijalankan terjadwal) |
| Jalur error: pertanyaan di luar kemampuan | Tanya "resep nasi goreng"; harus ditolak sopan + saran preset | Otomatis/Manual |
| Jalur error: key LLM salah / kuota habis | Jalankan dengan key tidak valid; respons error terstruktur | Manual |
| Klaim tanpa bukti tidak lolos ke UI | Periksa log validator selama drill | Manual |
| Tampilan `/tanya` (loading/kosong/error) | Uji manual di dev dan produksi | Manual |

## 9. Asumsi, Konflik & Risiko
- ⚠️ ASUMSI: Estimasi task 6,75 jam vs PRD 3 jam (+125%, di atas ambang 25%). Rencana Teknis §3.4 F09 sendiri memperkirakan ±5 jo untuk v1, dan angka 6,75 memasukkan halaman `/tanya`, evaluasi 12 preset, dan pengujian akun luar fokus yang tidak terhitung di PRD -- cara validasi: bandingkan jam nyata di J12 (gerbang).
- ⚠️ ASUMSI: Halaman `/tanya` tidak dimiliki file frontend mana pun di manifest (Tegar memegang F-06, F-11, F-12, F-18, F-19); ditulis di sini sebagai T13-07 dengan pemilik Tegar -- cara validasi: konfirmasi pembagian dengan tech lead.
- ✅ KEPUTUSAN (2026-10-09, Adrian + Dio): provider LLM = endpoint OpenAI-compatible 9router; paket `@ai-sdk/openai-compatible`; env `LLM_BASE_URL`, `LLM_API_KEY`, `LLM_MODEL`. Spike tool call T00-12 sudah lulus.
- ⚠️ ASUMSI: Respons dikembalikan setelah validasi selesai (tanpa streaming teks mentah), karena validator F-10 perlu keluaran utuh -- cara validasi: ukur latensi di T13-08; bila >20 detik, pertimbangkan streaming status progres saja.
- ⚠️ ASUMSI: Fungsi `find_connection` dan `search_text` ditempatkan di `src/server/queries/` (struktur repo Rencana Teknis §2.4 hanya menyebut `connection`); nama berkas `search_text` belum ditetapkan -- cara validasi: sepakati dengan Adrian.
- ⚠️ ASUMSI: Tool tetap belum tentu menjawab seluruh 12 pertanyaan di `docs/questions.md`: Rencana Teknis Langkah 9 tidak memetakan pertanyaan 4 (akun terdampak BUG-412), 8 (kontak pindah perusahaan dalam 6 bulan), dan 12 (batas outlet paket) ke tool mana pun -- cara validasi: T13-08 memetakan tiap preset ke tool.
- ⚠️ ASUMSI: Target ≥10/12 preset di J15 dan ≥7/10 pertanyaan kejutan (A16) belum terbukti; hanya gerbang J12 (≥6/12) yang bersumber dari input.
- ✅ KEPUTUSAN (K-A, 2026-10-09, Adrian): Prisma + Supabase dihapus dari repo; penyimpanan graph hanya Neo4j AuraDB Free (PRD §9, Rencana Teknis §2.3). Fitur ini tidak memakai Prisma/Supabase.
- ⛔ KONFLIK (K-G): Rencana Teknis Langkah 9 menaruh `run_cypher` sebagai "lanjutan" dari Tanya Graph, PRD menaruhnya sebagai F-28 (Could) di luar F-14 -- dipakai sementara: ikuti PRD; `run_cypher`, ringkasan skema, dan 5 contoh Cypher tidak dibangun di file ini.
- ⛔ KONFLIK: PRD F-14 menetapkan keluaran `{jawaban, klaim[]}`, sedangkan Rencana Teknis Langkah 8 (tabel) menyebut `POST /api/ask` mengembalikan "Stream narasi + klaim[] + GraphPayload" -- dipakai sementara: PRD sebagai dasar acceptance criteria; respons dibuat superset `{jawaban, klaim[], graph}` (nama field `graph` ⚠️ ASUMSI) tanpa streaming teks mentah agar validator F-10 tidak terlewati.
- 🔁 USULAN PERUBAHAN: bila T13-08 menunjukkan pertanyaan kompetensi 8 dan 12 (dan mungkin 4) tidak dapat dijawab oleh enam tool tetap, tambahkan tool pembaca khusus (mis. riwayat jabatan kontak dan batas paket outlet) -- alasan: PRD menetapkan "tool tetap" dan memotong `run_cypher`, tetapi gerbang J12 butuh ≥6/12 dan target J15 ≥10/12. Belum ada task yang bergantung; keputusan diambil setelah T13-08.
- 🔁 USULAN PERUBAHAN: tambahkan field opsional `kutipan[]` pada klaim (lihat 09, F-10) -- alasan: validasi substring deterministik; sementara kutipan diekstrak dari tanda petik.
- Risiko: LLM lambat/gagal saat demo live (internet venue, kuota) -- mitigasi: F-15 cache preset, konsol Aura, video cadangan; batas pengeluaran di dashboard provider (Rencana Teknis Langkah 12).
- Risiko: jawaban bebas (`jawaban`) memuat pernyataan di luar `klaim[]` -- mitigasi: render jawaban dari klaim lolos (T13-05) dan system prompt memaksa jawaban hanya merangkum klaim.
- Risiko: Dio belum tentu familier stack TypeScript/Bun (A11) -- mitigasi: Adrian atau Tegar pair di T13-02/T13-03.

## 10. Definition of Done
- [ ] Semua acceptance criteria di section 3 lolos uji di section 8
- [ ] Semua task di section 6 selesai, atau sudah dipindah secara eksplisit
- [ ] Lint, typecheck, dan build lulus (script `typecheck` belum ada di `package.json` saat file ini ditulis)
- [ ] Tidak ada secret yang di-hardcode; konfigurasi lewat environment variable (key LLM hanya di `.env.local`/env Vercel)
- [ ] Implementasi sesuai kontrak dan skema TDD, tanpa perubahan yang tidak tercatat
- [ ] UI di jalur demo punya tampilan loading, kosong, dan error
- [ ] Sudah dicek di lingkungan deploy (`/tanya` menjawab di URL produksi, termasuk `maxDuration`)
- [ ] PR sudah direview dan di-merge, lalu status di header file diperbarui
- [ ] Hasil evaluasi 12 preset terdokumentasi; keputusan gerbang J12 (lanjut atau bekukan sebagai beta) dicatat
- [ ] Batas pengeluaran di dashboard provider LLM sudah dipasang
- [ ] Log validator menunjukkan 0 klaim tanpa bukti yang lolos ke UI selama drill
