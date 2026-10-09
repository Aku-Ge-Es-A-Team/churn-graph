# 07 -- API jalur bukti
> ID PRD: F-08 · Prioritas: Must · Penanggung jawab: Dio (Backend & AI) · Estimasi: 1 jam-orang (PRD); total task 1,75 jam · Status: Implementasi selesai dan terverifikasi (2026-10-09); menunggu review PR

## 1. Ringkasan Fitur
- Apa: `GET /api/evidence?akun=&sinyal=` dan fungsi server `getAccountEvidence(id, kode?)` yang mengembalikan `GraphPayload` berupa induced subgraph dari `bukti_ids` sinyal (tanpa node duplikat, tiap relasi membawa `source_file`).
- Untuk siapa: Laras -- setiap temuan bisa ditelusuri ke node dan relasinya, sehingga rekomendasi punya jalur bukti.
- Peran di ★ jalur demo utama: langkah 2 (subgraph bukti C01 terbuka) dan langkah 3 (data node/relasi untuk kartu F-06). Dipakai juga oleh F-14 untuk merender subgraph jawaban.

## 2. Acuan PRD & TDD
- PRD: §2 T1, §4 metrik "Sumber di jalur bukti C01 ≥4 dari 6 sumber" dan "Hitung `source_file` unik di `GraphPayload` C01", §6 F-08, §7 (J7–9), §9 jalur demo langkah 2.
- TDD (acuan sementara): Rencana Teknis §1.3 Langkah 8 (tabel fungsi/endpoint, Cypher induced subgraph, konversi tipe Neo4j), Langkah 3 (tipe `GNode`, `GEdge`, `GraphPayload`, `Sumber`; relasi `PADA`, `BUKTI`), Langkah 7 (kontrak sinyal), §3.4 "F07 · API jalur bukti" (ID F07 milik Rencana, bukan ID PRD).
- Keputusan yang dikunci:
  - Respons berupa `GraphPayload` = `{ nodes: GNode[]; edges: GEdge[]; highlight: string[] }` (Rencana Teknis Langkah 3).
  - Jalur bukti adalah induced subgraph: semua relasi di antara node `bukti_ids` (Rencana Teknis Langkah 8).
  - Setiap relasi membawa `source_file`; respons < 2 detik untuk 40 akun (PRD F-08, A16).
  - Endpoint `GET /api/evidence?akun=&sinyal=` dibuat sesuai PRD (lihat ⛔ KONFLIK K-C).

## 3. User Stories & Acceptance Criteria
- User story: Sebagai Laras, saya ingin setiap temuan punya jalur bukti di graph, agar rekomendasi bisa ditelusuri ke node dan relasinya.
- Acceptance criteria:
  - Diberikan `bukti_ids` sebuah sinyal, ketika `GET /api/evidence?akun=&sinyal=` dipanggil, maka API mengembalikan `GraphPayload` berupa induced subgraph tanpa node duplikat.
  - Diberikan setiap relasi di payload, ketika diperiksa, maka `source_file` ikut terkirim.
  - Diberikan akun mana pun dari 40 akun, ketika API dipanggil, maka respons < 2 detik (⚠️ ASUMSI A16).
- Kriteria teknis tambahan:
  - (tambahan teknis) Nilai `Date`/Integer Neo4j dikonversi ke string/number JSON sebelum dikirim ke client (Rencana Teknis Langkah 8).
  - (tambahan teknis) Untuk C01, payload memuat `source_file` unik dari ≥4 dari 6 sumber (PRD §4).
  - (tambahan teknis) Parameter tidak valid atau akun/sinyal tak dikenal menghasilkan respons error terstruktur, bukan 500.

## 4. Ruang Lingkup Fitur
- Termasuk: fungsi pembentuk induced subgraph dari daftar ID + konverter ke `GNode`/`GEdge`; `getAccountEvidence(id, kode?)`; route handler `GET /api/evidence`; caching baca; pengujian.
- Tidak termasuk: penentuan `bukti_ids` (runner sinyal, 04/F-04); viewer graph dan layout (11, F-12); kartu A vs B (12, F-06); kartu tindakan (08, F-09); expand tetangga 1 hop `GET /api/graph/neighbors` (22, F-23); batas ≤80 node di sisi render (11, F-12).
- Pengganti sementara: fixture JSON `GraphPayload` C01 dari Brief §4 dipakai Tegar sebelum endpoint ini siap (disediakan 00); tidak tampil di demo final.

## 5. API, Data & Komponen yang Disentuh
| Jenis | Nama | Aksi | Acuan TDD |
| --- | --- | --- | --- |
| Endpoint | `GET /api/evidence?akun=&sinyal=` (`src/app/api/evidence/route.ts`, path ⚠️ ASUMSI mengikuti pola `src/app/api/ask/route.ts`) | Buat | PRD F-08; Rencana Teknis Langkah 8 (K-C) |
| Modul BE | `getAccountEvidence(id, kode?)` di `src/server/queries/` (berkas `evidence.ts` sesuai struktur repo) | Buat | Rencana Teknis Langkah 8, §2.4 |
| Modul BE | Fungsi induced subgraph by ID (dipakai juga oleh 13/F-14) | Buat | Rencana Teknis Langkah 8 |
| Modul BE | `src/server/neo4j.ts` (`readCypher`) | Pakai | Rencana Teknis Langkah 8 |
| Tipe | `GNode`, `GEdge`, `GraphPayload`, `Sumber` di `src/types/graph.ts` | Pakai | Rencana Teknis Langkah 3 |
| Node/relasi | `:Sinyal`, `PADA`, `BUKTI`, `:Entitas` | Pakai | Rencana Teknis Langkah 7 |
| Env var | `NEO4J_URI`, `NEO4J_USERNAME`, `NEO4J_PASSWORD` | Pakai | Rencana Teknis Langkah 2 |

## 6. Breakdown Task Implementasi
| ID | Task | Layer | Estimasi (jam) | Bergantung pada | Output terverifikasi |
| --- | --- | --- | --- | --- | --- |
| T07-01 | Buat fungsi induced subgraph (`MATCH (x:Entitas)-[r]->(y:Entitas) WHERE x.id IN $ids AND y.id IN $ids`) + konverter ke `GNode`/`GEdge` (dedup node, `Date`→string, `derived`, `source_file`/`source_id` di props, pemetaan label/`source_file` → `Sumber`) | BE | 0,5 | 04 (F-04: `:Sinyal` & `BUKTI` termuat), 00 (`readCypher`, tipe) | Panggilan dengan daftar ID C01 mengembalikan `nodes` tanpa duplikat `key`/`id` dan `edges` yang semuanya berisi `source_file` |
| T07-02 | `getAccountEvidence(id, kode?)`: ambil `bukti_ids` dari `(:Sinyal)-[:PADA]->(:Akun)` (semua sinyal bila `kode` kosong), isi `highlight`, panggil T07-01; bungkus `'use cache'` + `cacheLife` | BE | 0,5 | T07-01 | Untuk C01 dengan kode sinyal F-04 mengembalikan `GraphPayload` berisi jalur champion → P01 dan janji FEAT-07 → `decision_log`; kode tak dikenal → hasil kosong terstruktur/error terdefinisi |
| T07-03 | Route handler `GET /api/evidence`: validasi query `akun` (wajib) & `sinyal` (opsional), 400 untuk parameter salah, 404 untuk akun/sinyal tak dikenal, 200 `GraphPayload` | BE | 0,25 | T07-02 | `curl "/api/evidence?akun=C01"` → 200 + `GraphPayload`; `?akun=` kosong → 400; `?akun=ZZZ` → 404 |
| T07-04 | Uji: tanpa node duplikat, `source_file` ada di setiap relasi, respons <2 detik untuk seluruh 40 akun, C01 ≥4 `source_file` unik, termasuk satu test jalur error | Test | 0,5 | T07-03 | `bun test` hijau; log waktu respons terbesar <2 detik |
| | **Total 1,75 jam (estimasi PRD: 1 jam)** | | | | |

## 7. Dependensi
- Bergantung pada fitur: 04 (F-04) -- sinyal `(:Sinyal)-[:PADA]->(:Akun)` dan `[:BUKTI]` termuat; 00 -- koneksi Aura, `readCypher` dasar, tipe `src/types/graph.ts`.
- Memblokir fitur: 11 (F-12), 12 (F-06), 13 (F-14).
- Dependensi eksternal: instance Aura terisi dan sinyal sudah dijalankan (`bun run rebuild`).
- Bisa mulai lebih dulu dengan mock: sebagian -- T07-01 bisa dikembangkan terhadap graph hasil F-02/F-03 dengan daftar ID manual; Tegar tetap bisa paralel memakai fixture dari 00. T07-02 dan seterusnya menunggu sinyal F-04.

## 8. Cara Uji
| Acceptance criteria | Cara uji | Otomatis/Manual |
| --- | --- | --- |
| Induced subgraph tanpa node duplikat (happy path) | Test: panggil `getAccountEvidence("C01")`, assert `nodes` unik per `id`/`key` | Otomatis |
| Setiap relasi membawa `source_file` | Test: assert semua `edges[*].props.source_file` terisi | Otomatis |
| Respons < 2 detik untuk 40 akun | Test sapuan 40 akun, ukur waktu terbesar (cold + warm) | Otomatis |
| C01: ≥4 dari 6 sumber | Test: hitung `source_file` unik pada payload C01 | Otomatis |
| `GET /api/evidence?akun=&sinyal=` benar | `curl`/fetch endpoint di dev server dan produksi | Manual |
| Jalur error: parameter kosong, akun/sinyal tak dikenal | Test route handler: 400 dan 404 | Otomatis |
| Jalur error: Aura tidak terjangkau | Jalankan dengan `NEO4J_URI` salah; respons 5xx terstruktur, tidak membocorkan kredensial | Manual |

## 9. Asumsi, Konflik & Risiko
- ⚠️ ASUMSI: Estimasi task 1,75 jam vs PRD 1 jam (+75%, di atas ambang 25%). PRD tampak tidak menghitung konverter tipe Neo4j→JSON, validasi parameter/error, dan pengujian 40 akun -- cara validasi: bandingkan jam nyata saat J9.
- ⚠️ ASUMSI: Parameter `sinyal` opsional; bila kosong, payload = gabungan bukti semua sinyal akun (mengikuti `kode?` opsional pada `getAccountEvidence`) -- cara validasi: konfirmasi dengan Tegar untuk kebutuhan F-12.
- ⚠️ ASUMSI: Nilai `sinyal` pada query string adalah `kode` sinyal F-04 (bukan ID node `:Sinyal`) -- cara validasi: cek kontrak runner F-04.
- ⚠️ ASUMSI: `highlight` berisi `bukti_ids` sinyal terpilih (atau gabungan bila tanpa `sinyal`) -- cara validasi: cek perilaku sorotan di F-12.
- ⚠️ ASUMSI: Path file route `src/app/api/evidence/route.ts` dan kode status 400/404 tidak ditetapkan di sumber -- cara validasi: sepakati dengan Tegar saat integrasi.
- ⚠️ ASUMSI: `src/server/neo4j.ts` dengan `readCypher` dasar sudah dibuat di 00 (karena `/health` perlu `RETURN 1`); hardening (LIMIT, timeout, deny-list) selesai di 09 (F-10). Karena 09 bernomor lebih besar, file ini memakai versi dasar dahulu -- cara validasi: cek 00 sebelum memulai T07-01.
- ⚠️ ASUMSI: API tidak memotong jumlah node; batas ≤80 node adalah tanggung jawab render F-12, tetapi jalur bukti yang >80 node perlu dilaporkan -- cara validasi: ukur ukuran payload 40 akun di T07-04.
- ✅ KEPUTUSAN (K-A, 2026-10-09, Adrian): Prisma + Supabase dihapus dari repo; penyimpanan graph hanya Neo4j AuraDB Free (PRD §9, Rencana Teknis §2.3). Fitur ini tidak memakai Prisma/Supabase.
- ⛔ KONFLIK (K-C): PRD F-08 menyebut `GET /api/evidence?akun=&sinyal=`; Rencana Teknis Langkah 8 memakai fungsi server `getAccountEvidence(id, kode?)` yang dibaca langsung Server Component tanpa REST -- dipakai sementara: acceptance criteria mengikuti PRD (endpoint dibuat); fungsi server tetap menjadi implementasi di baliknya dan dipakai langsung oleh Server Component `/akun/[id]`.
- 🔁 USULAN PERUBAHAN: tidak ada.
- Risiko: respons >2 detik pada cold start Aura/Vercel -- mitigasi: `'use cache'` + `cacheLife`, region Vercel disamakan dengan Aura (00), warm-up di gladi.
- Risiko: induced subgraph terlalu besar (>80 node) atau memunculkan node hub -- mitigasi: ukur di T07-04; laporkan ke Tegar/Adrian bila perlu pembatasan di sisi pembentuk `bukti_ids`.

- ✅ KEPUTUSAN (2026-10-09, Adrian): semua identifier, konten aplikasi, dan UI memakai bahasa Inggris; dokumentasi tetap Indonesia. Kosakata graph yang tersimpan di Aura (label `Akun`, `Sinyal`, ..., tipe relasi, kode sinyal, nama properti dataset) TIDAK diterjemahkan karena ditetapkan dokumen produk dan sudah ada di data; pemetaannya ada di `docs/glossary.md`. Tipe di `src/types/graph.ts` kini berbahasa Inggris (mis. `RiskRow`: `account`, `name`, `dashboard`, `level`, `score`, `diverges`, `renewalDays`, `annualValue`, `atRiskValue`, `p`, `topSignals`; level `Critical/High/Watch/Safe` = Kritis/Tinggi/Waspada/Aman, warna dashboard `Green/Yellow/Red` = Hijau/Kuning/Merah).
- ✅ KEPUTUSAN (2026-10-09, Adrian): tugas milik Dio untuk F-05 s.d. F-11 dikerjakan Adrian; pembagian penanggung jawab di header diabaikan sementara.
- ✅ HASIL: `src/server/queries/evidence.ts` (`fetchInducedSubgraph`, `fetchAccountEvidence`), `src/server/queries/index.ts` (`getAccountEvidence`, cache) dan `GET /api/evidence` di `src/app/api/evidence/route.ts`. Parameter kanonik `account` dan `signal`; `akun` dan `sinyal` dari PRD diterima sebagai alias. Respons: 200 `GraphPayload` (`nodes`, `edges`, `highlight`, `meta`), 400 parameter kosong/tidak valid, 404 `account_not_found`/`signal_not_found`, 503 `graph_unavailable` (tanpa membocorkan detail koneksi).
- ✅ HASIL UJI: C01 memuat ≥4 `source_file` berbeda (jalur champion K017 → P01 dan FEAT-07 ← D-2025-11 ← E01); node unik; semua relasi membawa `source_file`; tanggal berupa string ISO, tanpa Integer/Date mentah; properti pembukuan internal tidak bocor; 40 akun dijawab dengan akun terlambat 133 ms (< 2 detik); akun tanpa sinyal (C02) → payload kosong (200). Tes: `tests/golden/evidence.test.ts` dan `tests/server/api/evidence-route.test.ts` (400/404/503 dengan graph di-mock).
- ⚠️ ASUMSI: nama properti di dalam `props` node/relasi adalah kosakata graph (`mulai`, `selesai`, `status_janji`, ...) dan tidak diterjemahkan; label `label` juga kosakata graph (`Akun`, `Kontak`, ...).
- 🔁 USULAN PERUBAHAN: `readCypher` menerima opsi `maxLimit` agar query internal tepercaya (jalur bukti, peringkat) tidak terpotong batas 200 baris milik konsol/LLM.

## 10. Definition of Done
- [ ] Semua acceptance criteria di section 3 lolos uji di section 8
- [ ] Semua task di section 6 selesai, atau sudah dipindah secara eksplisit
- [ ] Lint, typecheck, dan build lulus (script `typecheck` belum ada di `package.json` saat file ini ditulis)
- [ ] Tidak ada secret yang di-hardcode; konfigurasi lewat environment variable
- [ ] Implementasi sesuai kontrak dan skema TDD, tanpa perubahan yang tidak tercatat
- [ ] UI di jalur demo punya tampilan loading, kosong, dan error (error 400/404/5xx endpoint ini sudah terdokumentasi untuk 11/F-12)
- [ ] Sudah dicek di lingkungan deploy (endpoint dipanggil di URL produksi untuk C01)
- [ ] PR sudah direview dan di-merge, lalu status di header file diperbarui
- [ ] Contoh respons C01 dibagikan ke Tegar dan dicocokkan dengan fixture agar kontrak tidak menyimpang
