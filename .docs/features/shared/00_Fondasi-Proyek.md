# 00 -- Fondasi Proyek
> ID PRD: Lintas fitur · Prioritas: Fondasi · Penanggung jawab: Dio (infra) + Adrian (kontrak data) + Tegar (skeleton UI) · Estimasi: tidak ada di PRD (⚠️ ASUMSI ±6 jam-orang dari blok kerja J0–2 PRD §7; total task di file ini 9,5 jam-orang) · Status: Sedang dikerjakan (lihat kolom status per task di section 6)

## 1. Ringkasan Fitur
- Apa: fondasi lintas fitur yang harus ada sebelum fitur lain bisa dikerjakan: daftar 12 pertanyaan kompetensi (`docs/questions.md`), instance Neo4j AuraDB Free + env `NEO4J_*`, `.gitignore` yang menutup `.env*.local`, halaman `/health` + deploy awal Vercel, driver dasar `src/server/neo4j.ts`, kontrak tipe `src/types/graph.ts`, script `package.json`, skeleton halaman + fixture JSON, spike API key LLM, dan gerbang demo `src/proxy.ts`.
- Untuk siapa: tim pembangun (Adrian, Dio, Tegar). Persona Laras/Bima mendapat manfaat tidak langsung: demo tidak runtuh karena kredensial, region, atau kontrak data yang meleset.
- Peran di ★ jalur demo utama: bukan bagian jalur demo secara langsung; semua langkah 1–6 bergantung pada fondasi ini (URL produksi, driver, kontrak `GraphPayload`/`RiskRow`, gerbang demo).

## 2. Acuan PRD & TDD
- PRD: §7 (blok J0–0,5 "Kunci 12 pertanyaan", J0,5–2 "Setup", "Skema graph + kontrak tipe", "Skeleton UI + fixture JSON"; baris J16–17 "gerbang Basic Auth"), §5 (Pengganti sementara: Login = Basic Auth di `src/proxy.ts`; UI sebelum J9 = fixture JSON), §9 (tech stack, pengganti sementara), §8 (A7–A10, A12, pertanyaan terbuka 1–3).
- TDD (acuan sementara = Rencana Teknis): §1.2 (Langkah 1, 2, 3, 12), §1.3 Langkah 1, 2, 3, 12, §2.1 (stack), §2.2–2.3 (Neo4j dipilih, Prisma/Supabase tidak dipakai), §2.4 (struktur repo, env), §1.3 Langkah 8 (sketsa `src/server/neo4j.ts`).
- Keputusan yang dikunci:
  - Penyimpanan graph = Neo4j AuraDB Free; Prisma/Supabase tidak dipakai (PRD §9, Rencana Teknis §2.3).
  - Nama env var: `NEO4J_URI`, `NEO4J_USERNAME`, `NEO4J_PASSWORD`, `DEMO_PASSWORD`, `SNAPSHOT_DATE`. Nama env API key LLM tidak ditetapkan sumber mana pun (provider belum dipilih, PRD A8): ditulis `<LLM_API_KEY sesuai provider>`.
  - Secret hanya di `.env.local`; `.gitignore` harus memuat `.env*.local` sebelum kredensial diisi.
  - Kontrak tipe di `src/types/graph.ts`: `Sumber`, `GNode`, `GEdge`, `GraphPayload`, `RiskRow`. Nilai `RiskRow.level` mengikuti PRD: Kritis / Tinggi / Waspada / Aman (lihat K-B).
  - Halaman: `/`, `/akun/[id]`, `/tanya`, `/explore`, `/health`. Package manager Bun (`bun add --exact`, `bunx --bun`).
  - Gerbang demo di `src/proxy.ts` (konvensi `proxy` Next.js 16, bukan `middleware`), Basic Auth satu password bersama, fail-closed.

## 3. User Stories & Acceptance Criteria
- Tidak ada user story langsung -- mendukung F-01, F-02, F-03, F-04, F-05, F-06, F-07, F-08, F-09, F-10, F-11, F-12, F-14, F-15, F-16, F-17, F-18, F-19, F-20, F-21, F-22, F-23.
- Kriteria selesai fondasi (dari PRD §7 dan Rencana Teknis; ditandai "(tambahan teknis)"):
  - (tambahan teknis) URL produksi `/health` menjawab `RETURN 1` ke Aura (PRD §7 J0,5–2; Rencana Langkah 2).
  - (tambahan teknis) `.env.local` tidak muncul di `git status` (Rencana Langkah 2).
  - (tambahan teknis) `docs/questions.md` berisi 12 pertanyaan, masing-masing dengan pola path (Rencana Langkah 1).
  - (tambahan teknis) Halaman `/` dan `/akun/[id]` tampil dengan fixture JSON yang memenuhi tipe `RiskRow` dan `GraphPayload` (PRD §7 J0,5–2).
  - (tambahan teknis) 1 tool call ke LLM berhasil pada spike (PRD §7 J0,5–2).
  - (tambahan teknis) Tanpa kredensial yang benar, semua halaman dijawab 401 (PRD §5 Pengganti sementara; Rencana Langkah 12).

## 4. Ruang Lingkup Fitur
- Termasuk:
  - `docs/questions.md`; `.gitignore`; instance Aura + `.env.local` (+ nama variabel di `.env.example`, tanpa nilai); driver dasar dan `readCypher` minimal; `/health`; deploy awal Vercel (ditunda, lihat section 9); keputusan K-A: Prisma + Supabase dihapus dari repo.
  - Kontrak `src/types/graph.ts`; script `package.json` (`etl`, `load`, `derive`, `signals`, `rebuild`, `test:golden`, `typecheck`).
  - Layout dasar, skeleton `/` dan `/akun/[id]`, fixture JSON; spike API key LLM; `src/proxy.ts`.
- Tidak termasuk:
  - `cypher/schema.cypher` (constraint + full-text index) → 02 (F-02); desain label dan relasi tetap mengikuti Rencana Teknis Langkah 3.
  - ETL, loader, derive, runner sinyal dan seluruh isi `scripts/*` → 01 (F-01), 02 (F-02), 03 (F-03), 04 (F-04). Di sini hanya entri script di `package.json`.
  - Pengerasan `readCypher` (deny-list klausa tulis, `LIMIT` dipaksa, timeout 5 detik) → 09 (F-10). Di sini hanya session `READ` dan konversi integer.
  - `getRanking`, `getSignals` → 05 (F-05); `getAccountEvidence`, `/api/evidence` → 07 (F-08); `/api/ask` dan `maxDuration` → 13 (F-14); `/api/cypher` → 21 (F-22); `/api/graph/neighbors` → 22 (F-23).
  - Tabel peringkat, viewer graph, kartu bukti, grafik, timeline → 10, 11, 12, 17, 18.
  - Spike TypeSafe (milik 16, F-17). Fitur Could (F-24..F-30).
  - Smoke test produksi, `rebuild` penuh ke Aura, dan batas pengeluaran provider LLM (PRD §7 J16–17; Rencana Langkah 12 butir 1, 5, 6, 7): bergantung pada hampir semua fitur dan tidak dimiliki file manifest mana pun (lihat section 9).
- Pengganti sementara: fixture JSON (dari Brief §4) untuk `/` dan `/akun/[id]` sampai data nyata tersedia; Basic Auth satu akun demo sebagai pengganti login.

## 5. API, Data & Komponen yang Disentuh
| Jenis | Nama | Aksi | Acuan TDD |
| --- | --- | --- | --- |
| Layanan eksternal | Neo4j AuraDB Free | Buat | Rencana Teknis Langkah 2, §2.1 |
| Layanan eksternal | Vercel (Hobby) | Buat | Rencana Teknis Langkah 2, 12, §2.1 |
| Layanan eksternal | Provider LLM + Vercel AI SDK (`ai` + paket provider; provider belum dipilih) | Buat (spike) | Rencana Teknis §2.1, Langkah 9; PRD §8 A8 |
| Env var | `NEO4J_URI`, `NEO4J_USERNAME`, `NEO4J_PASSWORD` | Buat | Rencana Teknis Langkah 2, §2.4 |
| Env var | `SNAPSHOT_DATE` (`2026-10-01`) | Buat | Rencana Teknis Langkah 12, §2.4 |
| Env var | `DEMO_PASSWORD` | Buat | Rencana Teknis Langkah 12, §2.4 |
| Env var | `LLM_BASE_URL`, `LLM_API_KEY`, `LLM_MODEL` (endpoint OpenAI-compatible 9router; nama usulan, menggantikan `<LLM_API_KEY sesuai provider>`) | Buat | Rencana Teknis §2.4 |
| Env var (sisa scaffold Prisma/Supabase) | `DATABASE_URL`, `DIRECT_URL`, `AUTH_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_CERT_BUCKET` | Hapus dari `.env.example` (selesai, K-A). `.env`/`.env.local` lokal: nilai `DATABASE_URL`/`DIRECT_URL` sengaja dibiarkan atas permintaan Adrian, tidak dibaca kode mana pun; `CONTEXT7_API_KEY` dipertahankan (MCP) | Rencana Teknis §2.3 |
| Modul BE | `src/server/neo4j.ts` (driver, `readCypher` minimal) | Buat | Rencana Teknis Langkah 8 |
| Modul BE | `src/types/graph.ts` (`Sumber`, `GNode`, `GEdge`, `GraphPayload`, `RiskRow`) | Buat | Rencana Teknis Langkah 3 |
| Modul BE | `src/proxy.ts` | Buat | Rencana Teknis Langkah 12 |
| Library | `neo4j-driver` (`bun add --exact`) | Buat | Rencana Teknis §2.1 |
| Halaman | `/health` | Buat | Rencana Teknis Langkah 2 |
| Halaman FE | `/`, `/akun/[id]` (skeleton + layout dasar, fixture) | Buat | Rencana Teknis Langkah 10; PRD §7 |
| Berkas | `docs/questions.md` | Buat | Rencana Teknis Langkah 1 |
| Berkas | `.gitignore`, `package.json` (scripts) | Ubah | Rencana Teknis Langkah 2, 4 |
| Library | `ai` + `@ai-sdk/openai-compatible` (`bun add --exact`; paket provider T00-12) | Buat | Rencana Teknis §2.1, Langkah 9 |
| Berkas repo (sisa Prisma, K-A) | `prisma/schema.prisma`, `prisma.config.ts`, `src/lib/db.ts`, folder `generated/`, dependensi `prisma`, `@prisma/client`, `@prisma/adapter-pg`, `pg`, `@types/pg`, `dotenv`, 12 agent skill `prisma-*`/`supabase*` (+ entri `skills-lock.json`) | Hapus (selesai 2026-10-09) | Rencana Teknis §2.3 |

## 6. Breakdown Task Implementasi
| ID | Task | Layer | Estimasi (jam) | Bergantung pada | Output terverifikasi |
| --- | --- | --- | --- | --- | --- |
| T00-01 | (PIC: semua; draf Adrian) Tulis `docs/questions.md`: 12 pertanyaan dari Rencana Teknis Langkah 1 (8 inti Tim 1 + 4 lintas tim), tiap pertanyaan dengan pola path (label dan relasi dari tabel Langkah 3). Pertanyaan tanpa pola path ditandai "model belum lengkap". | DB | 0,5 | tidak ada | Berkas ada; 12 pertanyaan masing-masing punya satu pola path; sisa tanpa pola tercatat. |
| T00-02 | (PIC: Dio) Tambahkan `.env*.local` ke `.gitignore` (saat ini hanya `.env`). Harus selesai sebelum T00-03. | DevOps | 0,25 | tidak ada | `git check-ignore -v .env.local` mencetak aturan yang cocok; berkas `.env.local` uji kosong tidak muncul di `git status`. |
| T00-03 | (PIC: Dio) Buat instance Neo4j AuraDB Free; isi `.env.local` (`NEO4J_URI`, `NEO4J_USERNAME`, `NEO4J_PASSWORD`, `SNAPSHOT_DATE=2026-10-01`, `DEMO_PASSWORD`). Catat region Aura dan cek batas node/relasi Free di konsol (A9). Tambahkan hanya NAMA variabel ke `.env.example`. | DevOps | 0,5 | T00-02 | Konsol Aura menunjukkan instance running; `.env.local` terisi tanpa tampil di `git status`; `.env.example` hanya memuat nama tanpa nilai. **Status: sebagian** -- instance Aura jalan (Neo4j 5.27-aura, 0 node), `.env.local` terisi dan tidak di `git status`; region Aura dan batas Free (A9) belum dicatat dari konsol. |
| T00-04 | (PIC: Dio) `bun add --exact neo4j-driver`; buat `src/server/neo4j.ts`: satu instance driver dari `NEO4J_*`, `disableLosslessIntegers: true`, fungsi `readCypher(query, params)` dengan session `READ`. Pengerasan (deny-list, `LIMIT`, timeout) milik 09 (F-10). Baca `AGENTS.md` dan dokumen Next.js lokal sebelum menulis kode. | BE | 1,0 | T00-03 | Skrip sekali pakai di bawah Bun dan route di `next dev` sama-sama mengembalikan `RETURN 1`; kredensial salah menghasilkan error yang jelas, bukan crash proses. **Status: selesai** -- Bun dan `next start` mengembalikan `RETURN 1` ke Aura; kredensial salah/host tak ada → error terkontrol. |
| T00-05 | (PIC: Dio) Halaman `/health` yang menjalankan `RETURN 1` lewat `readCypher`; tampil "OK" atau pesan error terkontrol. Tidak boleh di-cache (`cacheComponents` aktif; baca dokumen lokal tentang data dinamis dan Suspense). | BE | 0,5 | T00-04 | `http://localhost:3000/health` menampilkan OK; setelah kredensial dirusak sementara menampilkan error terkontrol (jalur error). **Status: selesai lokal** -- build produksi + `next start` ke Aura: OK; password dirusak → blok `role="alert"` berisi kode error. Cek di produksi menunggu T00-07. |
| T00-06 | (PIC: tim; keputusan Adrian + Dio) ✅ K-A **diputuskan 2026-10-09 (Adrian): Prisma + Supabase dihapus; graph hanya Neo4j AuraDB.** Tindak lanjut: `bun remove` `prisma`, `@prisma/client`, `@prisma/adapter-pg`, `pg`, `@types/pg`, `dotenv`; hapus `prisma/`, `prisma.config.ts`, `src/lib/db.ts`, `generated/`, baris `/generated/prisma` di `.gitignore`; bersihkan env di `.env.example`; hapus 12 agent skill terkait dan entri `skills-lock.json`; tulis ulang rujukan K-A di dokumen fitur. | DevOps | 0,5 | keputusan tim | Keputusan tertulis di section 9; `bun run build` lokal lulus tanpa impor ke `generated/prisma`; `.env.example` bebas variabel yang tidak dipakai. **Status: selesai** (tidak ada rujukan Prisma/Supabase di kode, `package.json`, `bun.lock`, `.gitignore`, `.env.example`; tersisa transitif `dotenv` milik `shadcn`). |
| T00-07 | (PIC: Dio) Deploy awal ke Vercel: hubungkan repo, isi env Production `NEO4J_*` (dan `DEMO_PASSWORD`, `SNAPSHOT_DATE`), samakan region function dengan region Aura (default Vercel `iad1`). Jalankan `bun run build` lokal lebih dulu. | DevOps | 1,0 | T00-05, T00-06 | Build Vercel hijau; `https://<url-produksi>/health` menampilkan OK (Rencana Langkah 2: "URL produksi menjawab `RETURN 1`"). **Status: ditunda (keputusan Adrian 2026-10-09)** sampai ada minimal satu fitur dengan tampilan dari tim Data, Backend, dan Frontend. |
| T00-08 | (PIC: Adrian + Dio) Tulis `src/types/graph.ts` persis mengikuti Rencana Langkah 3 (`Sumber`, `GNode`, `GEdge`, `GraphPayload`, `RiskRow`) dengan `RiskRow.level` = `"Kritis" \| "Tinggi" \| "Waspada" \| "Aman"` (K-B). Review bersama Tegar sebelum dikunci. | BE | 0,75 | tidak ada | `bunx --bun tsc --noEmit` lulus; ketiga pihak menyetujui bentuk tipe; perbedaan dari Rencana (hanya `level`) tercatat. **bisa paralel** |
| T00-09 | (PIC: Adrian) Tambahkan script ke `package.json`: `etl`, `load`, `derive`, `signals`, `rebuild`, `test:golden` (nilai persis Rencana Langkah 4) dan `typecheck` (`next typegen && tsc --noEmit`, ⚠️ ASUMSI: `next typegen` wajib agar tipe global `PageProps`/`LayoutProps` ada di clone bersih; tanpa itu `tsc --noEmit` polos gagal sebelum `next build` pertama). | DevOps | 0,25 | tidak ada | `bun run` mencantumkan semua script; `bun run typecheck` jalan; script yang menunjuk berkas belum ada gagal jelas (bukan diam-diam sukses). **bisa paralel** |
| T00-10 | (PIC: Tegar) Fixture JSON: `RiskRow[]` (minimal C01–C06, level mengikuti PRD) dan `GraphPayload` jalur bukti C01, diisi dari jalur bukti Brief §4. Berkas harus lolos tipe T00-08 (`satisfies`). Setiap node dan relasi fixture memuat `props.source_file` dan `props.source_id` (dipakai 12/F-06). Lokasi berkas ⚠️ ASUMSI `src/fixtures/`. | FE | 1,0 | T00-08 | `tsc --noEmit` lulus dengan fixture di-`satisfies` ke tipe; C01 berlevel Kritis dengan dashboard Hijau; graph C01 memuat champion → P01 dan FEAT-07 → `decision_log`, tiap elemen punya `source_file` dan `source_id`. **bisa paralel** |
| T00-11 | (PIC: Tegar) Layout dasar dan skeleton: ganti `src/app/page.tsx` bawaan scaffold menjadi `/` yang merender fixture `RiskRow[]` (daftar sederhana), tambah `/akun/[id]` yang merender fixture `GraphPayload` secara teks/daftar dengan area kosong bernama untuk viewer, kartu tindakan, grafik, timeline. Perbarui `metadata` ("Create Next App") dan `lang`. Hanya memakai komponen shadcn yang sudah ada. | FE | 1,5 | T00-08, T00-10 | `bun run dev`: `/` menampilkan baris C01–C06 dari fixture; `/akun/C01` menampilkan node dan relasi fixture; `bun run build` lulus. **bisa paralel** |
| T00-12 | (PIC: Dio) spike tool calling dengan Vercel AI SDK (`ai` + `@ai-sdk/openai-compatible`) ke endpoint 9router (env `LLM_BASE_URL`, `LLM_API_KEY`, `LLM_MODEL`): satu tool sederhana dipanggil model dan hasilnya kembali. Skrip sementara `scripts/spike-llm.ts`, bukan bagian aplikasi. | BE | 1,0 | T00-03; keputusan provider | Satu panggilan tool berhasil (nama tool, argumen, dan hasil tercatat di catatan PR); bila gagal, A8 dinyatakan runtuh dan dilaporkan (F-14 gugur → F-15 + F-22). **Status: selesai 2026-10-09** -- model `cbai/gpt-5.6-sol`, tool `ambil_kode_verifikasi({"topik":"spike"})` dipanggil, kode acak kembali di jawaban. |
| T00-13 | (PIC: Dio) `src/proxy.ts`: Basic Auth satu password bersama dari `DEMO_PASSWORD`, fail-closed (500 bila env kosong), matcher mengecualikan `_next/static`, `_next/image`, `favicon.ico`. Baca `node_modules/next/dist/docs/` tentang konvensi `proxy`. Dikerjakan paling lambat di jendela J16–17 (PRD §7) tetapi tidak bergantung pada fitur lain. | BE | 0,75 | T00-07 | Tanpa header Authorization → 401 + `WWW-Authenticate`; kredensial benar → 200; `DEMO_PASSWORD` kosong → 500; dicek di URL produksi. **Status: selesai lokal** (401/200/500 terbukti dengan `next start`); cek di URL produksi menunggu T00-07. |
| | **Total 9,5 jam (estimasi PRD: ±6 jam, ⚠️ ASUMSI)** -- selisih +58%, lihat section 9. | | | | |

## 7. Dependensi
- Bergantung pada fitur: tidak ada.
- Memblokir fitur: seluruh file lain. Terutama: 01 (F-01) dan 02 (F-02) -- env `NEO4J_*` dan driver; 09 (F-10) -- `readCypher`; 10 (F-11), 11 (F-12), 17 (F-18), 18 (F-19) -- tipe, fixture, dan skeleton halaman; 13 (F-14) -- hasil spike LLM; 16 (F-17) -- env LLM.
- Dependensi eksternal: akun Neo4j Aura dan Vercel; API key LLM + keputusan provider (PRD §8 pertanyaan 2, A8, A10); isi Brief §4 (`docs/Brief_Churn-Early-Warning-Graph.md`) untuk fixture.
- Bisa mulai lebih dulu dengan mock: ya untuk T00-08, T00-09, T00-10, T00-11 (tidak memerlukan Aura). T00-03 sampai T00-07 menunggu akun layanan.

## 8. Cara Uji
| Kriteria selesai | Cara uji | Otomatis/Manual |
| --- | --- | --- |
| `docs/questions.md` berisi 12 pertanyaan dengan pola path | Baca berkas; tiap pertanyaan punya pola; pertanyaan tanpa pola ditandai | Manual |
| `.env*.local` terabaikan | `git check-ignore -v .env.local` mencetak aturan; `git status` bersih dari `.env.local`. Jalur error: tanpa aturan → perintah tidak mencetak apa pun | Otomatis (perintah git) |
| `/health` menjawab `RETURN 1` lokal dan di produksi | Buka `/health` di `localhost` dan URL Vercel. Jalur error: rusak-kan `NEO4J_PASSWORD` sementara → pesan error terkontrol, bukan halaman 500 kosong | Manual |
| Kontrak tipe konsisten | `bun run typecheck` lulus; fixture di-`satisfies` ke `RiskRow`/`GraphPayload`. Jalur error: tambah field salah di fixture → typecheck gagal | Otomatis |
| Skeleton `/` dan `/akun/[id]` tampil dengan fixture | `bun run dev`, buka `/` dan `/akun/C01`; `bun run build` lulus | Manual (+ build otomatis) |
| Script `package.json` | `bun run` menampilkan 6 script Rencana Langkah 4 + `typecheck` | Otomatis |
| Spike LLM | Jalankan skrip spike; satu tool call berhasil | Manual |
| Gerbang demo | `curl -i <url>` tanpa kredensial → 401; dengan kredensial benar → 200; `DEMO_PASSWORD` kosong → 500 | Manual (perintah curl) |

## 9. Asumsi, Konflik & Risiko
- ⚠️ ASUMSI: estimasi PRD untuk file ini tidak ada; ±6 jam-orang adalah perkiraan manifest dari tiga blok kerja J0–2 PRD §7. Total task 9,5 jam (+58%, >25%). Alasan: PRD tidak menganggarkan keputusan Prisma (0,5), `src/proxy.ts` (0,75; PRD menaruhnya di J16–17), dan `package.json` scripts; sisanya (8,25) tetap +38% di atas ±6 karena tiap task wajib punya output terverifikasi dan jalur error. Tidak disesuaikan agar terlihat cocok. -- cara validasi: bandingkan jam nyata J0–2 dengan T00-01..T00-12; hitungan "Semua" pada T00-01 tidak dikalikan 3 orang. PRD §5 menempatkan setup di cadangan 40% (16,8 jam-orang), bukan di batas Must 25,2.
- ⚠️ ASUMSI: isi fixture bergantung pada Brief §4 yang bukan sumber penulis file ini; ID node selain yang disebut PRD (C01, K017, P01, FEAT-07, DL-001, I0290, I0224, I0258, D-2025-02) harus diambil dari Brief. -- cara validasi: Tegar membaca Brief §4 pada T00-10; ID yang tidak ada di Brief dilarang.
- ⚠️ ASUMSI: lokasi fixture `src/fixtures/`, script `typecheck` (`tsc --noEmit`), dan `metadata`/`lang` baru tidak ditetapkan PRD/Rencana. Nama produk masih sementara (PRD A1). -- cara validasi: tinjau di PR T00-10/T00-11.
- ⚠️ ASUMSI: `neo4j-driver` berjalan di Bun; Rencana Teknis tidak menemukan pernyataan dukungan di dokumentasi driver. -- cara validasi: T00-04 menjalankan `RETURN 1` dari Bun dan dari Next.js; bila gagal, jalankan skrip dengan Node 24 (fallback Rencana Langkah 4).
- ⚠️ ASUMSI: batas AuraDB Free 200 ribu node / 400 ribu relasi (A9) dan pilihan region Aura yang cocok dengan `iad1` belum terverifikasi. -- cara validasi: cek konsol Aura di T00-03; bila region tidak sama, ubah region function Vercel (Rencana Langkah 2).
- ✅ TERBUKTI & SELESAI: sebelum K-A diputuskan, `tsc` pada clone tanpa folder `generated/` gagal (`src/lib/db.ts(2,30): TS2307 Cannot find module '../../generated/prisma/client'`), sehingga build Vercel/clone bersih pasti gagal. Teratasi dengan penghapusan Prisma (T00-06).
- ⚠️ ASUMSI: PRD §7 menaruh `cypher/schema.cypher` di jendela J0,5–2, sedangkan manifest menempatkannya di 02 (F-02, mulai J4). -- cara validasi: Adrian menulis draf schema bersamaan dengan T00-08 agar tidak menahan 02.
- ⚠️ ASUMSI: `/health` dan semua halaman berada di belakang gerbang `src/proxy.ts` (matcher Rencana Langkah 12); saat dev lokal `DEMO_PASSWORD` wajib ada di `.env.local` karena gerbang fail-closed. -- cara validasi: T00-13.
- ⚠️ ASUMSI: nama env API key LLM menunggu keputusan provider (PRD §8 pertanyaan 2); env TypeSafe tidak ada di sumber mana pun (hanya relevan untuk 16, F-17).
- ✅ KEPUTUSAN (K-A, 2026-10-09, Adrian): **Prisma + Supabase tidak dipakai; database Context Graph = Neo4j AuraDB Free.** Sejalan dengan PRD §9 dan Rencana Teknis §2.3. Sebelumnya Adrian sempat menyatakan "tetap Prisma + Supabase", lalu meralatnya di hari yang sama. Dihapus: dependensi, `prisma/`, `prisma.config.ts`, `src/lib/db.ts`, `generated/`, env di `.env.example`, 12 agent skill, dan rujukan K-A di 17 dokumen fitur. Catatan: nilai `DATABASE_URL`/`DIRECT_URL` di `.env`/`.env.local` lokal sengaja tidak dihapus atas permintaan Adrian (tidak dibaca kode mana pun).
- ⛔ KONFLIK (K-B): `RiskRow.level` di Rencana Teknis Langkah 3 = "Kritis"/"Tinggi"/"Sedang"/"Rendah"; PRD (F-05, §4, §5) = Kritis/Tinggi/Waspada/Aman -- dipakai sementara: PRD (T00-08).
- ⛔ KONFLIK (K-E): `.gitignore` repo hanya `.env`; Rencana Teknis Langkah 2 mewajibkan `.env*.local` -- dipakai sementara: Rencana (T00-02 dikerjakan sebelum kredensial diisi).
- ⛔ KONFLIK (K-G): Rencana Teknis Langkah 9 menyebut `run_cypher` sebagai lanjutan F09; PRD menaruhnya di F-28 (Could), bukan bagian F-14 -- dipakai sementara: PRD; spike T00-12 tidak mencakup `run_cypher`.
- ✅ KEPUTUSAN (2026-10-09, Adrian): (1) T00-01 `docs/questions.md` disetujui. (2) Provider LLM = endpoint OpenAI-compatible milik sendiri (9router) lewat `@ai-sdk/openai-compatible`; menutup PRD §8 pertanyaan 2 untuk spike T00-12. (3) Koneksi Vercel (T00-07) ditunda sampai ada minimal satu fitur dengan tampilan dari tim Data, Backend, dan Frontend; T00-13 dicek di URL produksi setelahnya.
- 🔁 USULAN PERUBAHAN: (a) `ai` 7.0.136 + `@ai-sdk/openai-compatible` 3.0.67 (exact) -- paket provider yang dimaksud T00-12; (b) env `LLM_BASE_URL`, `LLM_API_KEY`, `LLM_MODEL` (nama belum ditetapkan dokumen; menggantikan `<LLM_API_KEY sesuai provider>`); (c) script `typecheck` = `next typegen && tsc --noEmit`; (d) env `NEO4J_DATABASE`, `AURA_INSTANCEID`, `AURA_INSTANCENAME` ada di `.env.local` (dari berkas kredensial Aura) tetapi belum dipakai kode dan belum ada di dokumen.
- Risiko: smoke test produksi, `bun run rebuild` ke Aura, env produksi LLM/`SNAPSHOT_DATE` final, `maxDuration` `/api/ask`, dan batas pengeluaran provider LLM (PRD §7 J16–17; Rencana Langkah 12) tidak dimiliki file manifest mana pun -- mitigasi: dilaporkan ke tech lead untuk ditetapkan pemiliknya (ditambahkan ke file fitur terkait atau tugas gabungan di J16).
- Risiko: pertanyaan terbuka PRD §8 (jam selesai resmi, provider LLM, kamus R3, pemetaan S1–S8) belum dijawab saat J0 -- mitigasi: jawab sebelum T00-01 selesai; yang menyangkut provider memblokir T00-12.
- Risiko: kredensial Aura/LLM ikut ter-commit -- mitigasi: T00-02 sebelum T00-03; `.env.example` hanya nama; periksa `git diff --cached` sebelum commit.
- Risiko: instance Aura Free dijeda atau jaringan venue tidak stabil (A17) -- mitigasi: buka konsol Aura 30 menit sebelum demo; fallback Rencana Langkah 13.

## 10. Definition of Done
- [ ] Semua kriteria selesai di section 3 lolos uji di section 8
- [ ] Semua task di section 6 selesai, atau sudah dipindah secara eksplisit (T00-06 dan T00-12 boleh tetap terblokir hanya dengan catatan alasan)
- [ ] Lint, typecheck, dan build lulus (lokal dan Vercel)
- [ ] Tidak ada secret yang di-hardcode; konfigurasi lewat environment variable; `.env.example` hanya berisi nama
- [ ] Implementasi sesuai kontrak dan skema TDD, tanpa perubahan yang tidak tercatat
- [ ] UI di jalur demo punya tampilan loading, kosong, dan error (skeleton: minimal tampilan error `/health`)
- [ ] Sudah dicek di lingkungan deploy (`/health` dan gerbang `src/proxy.ts` di URL produksi)
- [ ] PR sudah direview dan di-merge, lalu status di header file diperbarui
- [ ] Keputusan K-A tercatat; tidak ada kode baru yang mengimpor Prisma
- [ ] Kontrak `src/types/graph.ts` disetujui Adrian, Dio, dan Tegar sebelum fitur 05, 07, 10, 11 memakainya
