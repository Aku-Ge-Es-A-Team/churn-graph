# 22 -- `SALING_KENAL` + expand 1 hop
> ID PRD: F-23 · Prioritas: Should #9 · Penanggung jawab: Adrian (Data Graph) + Tegar (Frontend) · Estimasi: 1,5 jam-orang (PRD) · Status: Belum dimulai

## 1. Ringkasan Fitur
- Apa: relasi turunan `SALING_KENAL` antar kontak (derive Cypher), endpoint `GET /api/graph/neighbors?id=` yang mengembalikan tetangga 1 hop sebagai `GraphPayload`, dan aksi "expand" pada node kontak di penampil subgraph F-12 dengan batas 120 node.
- Untuk siapa: Bima -- tahu siapa yang mengenal decision maker baru sehingga punya jalur hangat untuk mendekatinya.
- Peran di ★ jalur demo utama: bukan bagian jalur demo; nilai tambah di penampil graph (jawaban pertanyaan 10 lintas tim).

## 2. Acuan PRD & TDD
- PRD: §6 F-23 (Should #9, dipotong paling pertama), §7 (J14–15), §8 (A16: batas 120 node).
- TDD (acuan sementara = Rencana Teknis): §1.3 Langkah 6 (`SALING_KENAL` dihitung di Cypher), §1.3 Langkah 3 (tabel relasi `SALING_KENAL`), §1.3 Langkah 8 (`GET /api/graph/neighbors?id=` → `GraphPayload`), §1.3 Langkah 10 (klik node membuka panel samping), §3.4 ("lanjutan: expand tetangga 1 hop saat node diklik" pada F12 Rencana).
- Keputusan yang dikunci:
  - `GET /api/graph/neighbors?id=` mengembalikan `GraphPayload` (expand 1 hop).
  - `SALING_KENAL` bersifat turunan (`derived: true`, `rule`, `confidence`) dengan properti `dasar`, `org`, `confidence`.
  - Semua query lewat `readCypher` (read-only, timeout 5 detik, `LIMIT`).
  - Hasil expand tidak boleh membuat graph melebihi 120 node (A16).

## 3. User Stories & Acceptance Criteria
- User story: Sebagai Bima, saya ingin melihat siapa yang mengenal decision maker baru, agar saya punya jalur hangat untuk mendekatinya.
- Acceptance criteria:
  - Diberikan node kontak di F-12, ketika diklik "expand", maka tetangga 1 hop ditambahkan tanpa melebihi 120 node (⚠️ ASUMSI A16).
  - Diberikan relasi `SALING_KENAL`, ketika ditampilkan, maka dasar relasinya (interaksi bersama) bisa diklik.
- Kriteria teknis tambahan:
  - (tambahan teknis) `id` pada endpoint diteruskan sebagai parameter Cypher, bukan digabung ke string query.
  - (tambahan teknis) Hasil digabung ke graph yang tampil dengan deduplikasi menurut `key`; bila batas 120 tercapai, pengguna diberi pesan dan tidak ada node yang dibuang diam-diam.
  - (tambahan teknis) `SALING_KENAL` dibentuk dari dua kontak dengan masa kerja tumpang-tindih di organisasi yang sama.

## 4. Ruang Lingkup Fitur
- Termasuk:
  - `cypher/derive/saling_kenal.cypher` (⚠️ nama berkas asumsi) dan tes derive.
  - Route handler `GET /api/graph/neighbors?id=` (⚠️ path berkas mengikuti konvensi App Router: `src/app/api/graph/neighbors/route.ts`).
  - Aksi "expand" di panel node F-12 dan interaksi klik pada dasar `SALING_KENAL`.
- Tidak termasuk:
  - Penampil subgraph, ELK, panel samping dasar → 11 (F-12); kartu bukti → 12 (F-06).
  - `readCypher` dan guardrail → 00 / 09 (F-10).
  - Visualisasi seluruh graph (X3, OUT OF SCOPE).
- Pengganti sementara: payload fixture dari 00 untuk menguji expand di UI sebelum endpoint siap (bisa paralel).

## 5. API, Data & Komponen yang Disentuh
| Jenis | Nama | Aksi | Acuan TDD |
| --- | --- | --- | --- |
| Endpoint | `GET /api/graph/neighbors?id=` | Buat | Rencana Teknis §1.3 Langkah 8 |
| Data (Cypher) | `cypher/derive/saling_kenal.cypher` | Buat | Rencana Teknis §1.3 Langkah 6 |
| Relasi | `SALING_KENAL` (Kontak — Kontak; `dasar`, `org`, `confidence`) | Buat | Rencana Teknis §1.3 Langkah 3 |
| Modul BE | `src/server/neo4j.ts` (`readCypher`) | Pakai | Rencana Teknis §1.3 Langkah 8 |
| Tipe | `GraphPayload`, `GNode`, `GEdge` (`src/types/graph.ts`) | Pakai | Rencana Teknis §1.3 Langkah 3 |
| Komponen FE | penampil subgraph + panel samping F-12 (nama komponen ⚠️ asumsi; milik 11) | Ubah | Rencana Teknis §1.3 Langkah 10 |
| Tabel (node graph) | `:Kontak`, `:Organisasi`, `:Interaksi`, `:Akun` | Pakai | Rencana Teknis §1.3 Langkah 3 |
| Relasi | `BEKERJA_DI`, `PERNAH_BEKERJA_DI`, `TERLIBAT_DI` | Pakai | Rencana Teknis §1.3 Langkah 3 |
| Env var | `NEO4J_URI`, `NEO4J_USERNAME`, `NEO4J_PASSWORD` | Pakai | Rencana Teknis §1.3 Langkah 2 |
| Script | `package.json` → `derive` | Pakai | Rencana Teknis §1.3 Langkah 4 |

## 6. Breakdown Task Implementasi
| ID | Task | Layer | Estimasi (jam) | Bergantung pada | Output terverifikasi |
| --- | --- | --- | --- | --- | --- |
| T22-01 | Derive `SALING_KENAL`: dua kontak dengan masa kerja tumpang-tindih di organisasi yang sama, plus kontak yang terlibat di interaksi yang sama; properti `dasar`, `org`, `confidence`, `derived`, `rule`. | DB | 0,5 | 03 (F-03) | `bun run derive` membuat `SALING_KENAL` bertanda `derived`/`rule`/`confidence`; rebuild dua kali → jumlah sama. |
| T22-02 | Route handler `GET /api/graph/neighbors?id=`: parameter Cypher, 1 hop, batas 120, hasil `GraphPayload`; `id` kosong/tidak dikenal → respons error terstruktur. Baca `node_modules/next/dist/docs/` sebelum menulis kode. | BE | 0,5 | T22-01 | `GET /api/graph/neighbors?id=K017` mengembalikan `GraphPayload` ≤120 node; `id` tak dikenal mengembalikan error (kode HTTP ⚠️ ASUMSI 404/400), bukan crash. |
| T22-03 | FE: aksi "expand" di panel node kontak F-12; gabung payload dengan deduplikasi `key`; pesan bila 120 tercapai. Bisa paralel dengan fixture. | FE | 0,5 | 11 (F-12), T22-02 (kontrak, bisa pakai fixture) | Klik expand pada node kontak menambahkan tetangga tanpa duplikat; total node tidak melebihi 120. |
| T22-04 | FE: klik relasi `SALING_KENAL` menampilkan dasarnya (interaksi bersama / masa kerja tumpang-tindih) dengan ID bukti. | FE | 0,25 | T22-03 | Dasar relasi tampil di panel dengan ID node yang bisa ditelusuri. |
| T22-05 | Tes: derive (`tests/golden/derive.test.ts`, tambahan), route (`neighbors` ≤120, `id` invalid), idempotensi. | Test | 0,25 | T22-02 | `bun test tests/golden` hijau untuk kasus baru; jalur error `id` invalid lulus. |
| | **Total 2,0 jam (estimasi PRD: 1,5 jam)** -- selisih +33%, lihat ⚠️ ASUMSI di section 9. | | | | |

## 7. Dependensi
- Bergantung pada fitur: 03 (F-03) -- graph dan runner `derive`; 11 (F-12) -- penampil subgraph dan panel node; (transitif) 00 untuk `readCypher`.
- Memblokir fitur: tidak ada.
- Dependensi eksternal: Aura aktif; baca `node_modules/next/dist/docs/` (AGENTS.md).
- Bisa mulai lebih dulu dengan mock: ya -- T22-03/T22-04 bisa memakai fixture `GraphPayload`; T22-01/T22-02 butuh graph.

## 8. Cara Uji
| Acceptance criteria | Cara uji | Otomatis/Manual |
| --- | --- | --- |
| Expand menambahkan tetangga 1 hop tanpa melebihi 120 node | Panggil endpoint untuk node dengan banyak tetangga; assert ≤120 node; di UI klik expand pada node kontak. Jalur error: `id` tak dikenal → error terstruktur | Otomatis (endpoint) + manual (UI) |
| Dasar `SALING_KENAL` bisa diklik | Klik relasi di UI → panel memuat dasar dan ID bukti | Manual |
| (tambahan teknis) `SALING_KENAL` turunan | Query relasi: `derived`/`rule`/`confidence` terisi; rebuild dua kali identik | Otomatis |
| (tambahan teknis) parameterisasi | `id` berisi karakter aneh tidak mengubah query | Otomatis |

## 9. Asumsi, Konflik & Risiko
- ⚠️ ASUMSI: total task 2,0 jam vs estimasi PRD 1,5 jam (+33%, >25%). Alasan: PRD tidak merinci endpoint dan tes. -- cara validasi: ukur di J14; ini fitur pertama yang dipotong.
- ⚠️ ASUMSI (A16): batas 120 node berasal dari asumsi tim. -- cara validasi: uji kenyamanan baca graph di J15.
- ⚠️ ASUMSI: nilai `dasar` dan `confidence` untuk `SALING_KENAL` (mis. `masa_kerja_tumpang_tindih`, `interaksi_bersama`) belum tertulis. -- cara validasi: sepakati dengan Tegar saat T22-04.
- ⚠️ ASUMSI: path route `src/app/api/graph/neighbors/route.ts` mengikuti konvensi App Router; Rencana Teknis hanya menyebut endpoint. -- cara validasi: baca docs Next.js di repo.
- ⛔ KONFLIK: dasar relasi -- PRD F-23: "dasar relasinya (interaksi bersama)"; Rencana Teknis Langkah 6: `SALING_KENAL` = dua kontak dengan masa kerja tumpang-tindih di organisasi yang sama -- dipakai sementara: keduanya (properti `dasar` menyimpan jenisnya).
- ⛔ KONFLIK (K-A): repo sudah punya Prisma (`prisma/schema.prisma`, `src/lib/db.ts`) dan `.env.example` berisi `DATABASE_URL`, `SUPABASE_*`; PRD §9 dan Rencana Teknis §2.3 menyatakan keduanya tidak dipakai -- dipakai sementara: hanya Neo4j; keputusan di 00.
- 🔁 USULAN PERUBAHAN: tidak ada.
- Risiko: node akun/outlet bertetangga sangat banyak (supernode) sehingga cepat melewati 120 node -- mitigasi/fallback: batasi expand ke node kontak (sesuai AC) dan pesan jelas saat batas tercapai.
- Risiko: fitur dipotong (pertama dalam urutan pemotongan PRD §7) -- mitigasi/fallback: viewer F-12 tetap berfungsi tanpa expand.

## 10. Definition of Done
- [ ] Semua acceptance criteria di section 3 lolos uji di section 8
- [ ] Semua task di section 6 selesai, atau sudah dipindah secara eksplisit
- [ ] Lint, typecheck, dan build lulus
- [ ] Tidak ada secret yang di-hardcode; konfigurasi lewat environment variable
- [ ] Implementasi sesuai kontrak dan skema TDD, tanpa perubahan yang tidak tercatat
- [ ] UI di jalur demo punya tampilan loading, kosong, dan error (expand: loading, kosong, error, dan pesan batas 120)
- [ ] Sudah dicek di lingkungan deploy (expand berfungsi di URL produksi)
- [ ] PR sudah direview dan di-merge, lalu status di header file diperbarui
- [ ] Perubahan pada komponen F-12 sudah disepakati dengan pemilik 11 (Tegar)
