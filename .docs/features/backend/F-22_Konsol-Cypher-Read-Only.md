# 21 -- Konsol Cypher read-only
> ID PRD: F-22 · Prioritas: Should #8 · Penanggung jawab: Dio (Backend & AI) · Estimasi: 0,5 jam-orang (PRD); total task 1,75 jam · Status: Belum dimulai

## 1. Ringkasan Fitur
- Apa: `POST /api/cypher` dan halaman `/explore` untuk menjalankan query Cypher read-only buatan pengguna lewat `readCypher` (F-10); hasil ditampilkan di penampil graph F-12 bila berisi node/relasi, atau sebagai tabel.
- Untuk siapa: Bima -- tetap ada jalan menjawab bila pertanyaan juri tidak tercakup tool Tanya Graph.
- Peran di ★ jalur demo utama: bukan bagian jalur demo utama; jalur cadangan dalam rantai fallback (preset → konsol Cypher → konsol Aura → video).

## 2. Acuan PRD & TDD
- PRD: §2 T3, §5 Pengganti sementara ("Cadangan demo: konsol Neo4j Aura dengan query tersimpan") dan OUT OF SCOPE X4/X7, §6 F-22 (juga F-10, F-12), §7 (J14–15; urutan pemotongan: dibuang setelah F-23), §8 risiko F-14.
- TDD (acuan sementara): Rencana Teknis §1.3 Langkah 8 (tabel: `POST /api/cypher` → `/explore` → hasil query read-only; `readCypher`), Langkah 10 (`/explore`), Langkah 13 (rantai fallback), §3.4 "F14 · Konsol Cypher & pertanyaan preset" (ID F14 milik Rencana, bukan ID PRD), §2.4 (`src/app/api/cypher/route.ts`).
- Keputusan yang dikunci:
  - Semua query lewat `readCypher` (session READ, deny-list klausa tulis, `LIMIT` paksa, timeout 5 detik) -- F-10.
  - Query tulis ditolak.
  - Hasil dirender di F-12 atau sebagai tabel.
  - Dilindungi gerbang Basic Auth `src/proxy.ts` (00).

## 3. User Stories & Acceptance Criteria
- User story: Sebagai Bima, saya ingin menjalankan query sendiri bila pertanyaan juri tidak tercakup tool, agar tetap ada jalan menjawab.
- Acceptance criteria:
  - Diberikan query tulis, ketika dikirim ke `/api/cypher`, maka query ditolak oleh F-10.
  - Diberikan query baca, ketika dijalankan, maka hasilnya dirender di F-12 atau sebagai tabel.
- Kriteria teknis tambahan:
  - (tambahan teknis) Query tidak valid (sintaks), timeout, dan query ditolak menghasilkan respons error terstruktur dengan pesan yang dapat dibaca, tanpa stack trace, kredensial, atau detail internal.
  - (tambahan teknis) Nilai `Date`/Integer Neo4j dikonversi ke string/number sebelum dikirim ke client.
  - (tambahan teknis) Endpoint berada di belakang `src/proxy.ts` (Basic Auth) -- tidak dapat diakses tanpa kredensial demo.

## 4. Ruang Lingkup Fitur
- Termasuk: route handler `POST /api/cypher`; pemetaan hasil (baris/kolom dan, bila ada node/relasi, `GraphPayload`); halaman `/explore` minimal (textarea, tombol jalankan, tabel, penampil graph F-12); pengujian.
- Tidak termasuk: pengerasan `readCypher` (09, F-10); komponen penampil graph F-12 (11); tombol pertanyaan preset dan cache (14, F-15); text-to-Cypher oleh LLM (`run_cypher`, F-28, Could); query tersimpan di konsol Aura (cadangan di luar aplikasi); autentikasi per pengguna dan rate limit (OUT OF SCOPE X4).
- Pengganti sementara: tidak ada.

## 5. API, Data & Komponen yang Disentuh
| Jenis | Nama | Aksi | Acuan TDD |
| --- | --- | --- | --- |
| Endpoint | `POST /api/cypher` (`src/app/api/cypher/route.ts`) | Buat | PRD F-22; Rencana Teknis Langkah 8, §2.4 |
| Modul BE | `src/server/neo4j.ts` (`readCypher`) | Pakai | Rencana Teknis Langkah 8 |
| Modul BE | Pemetaan hasil Neo4j → tabel / `GraphPayload` (memakai konverter dari 07/F-08) | Buat | Rencana Teknis Langkah 3, 8 |
| Tipe | `GraphPayload`, `GNode`, `GEdge` di `src/types/graph.ts` | Pakai | Rencana Teknis Langkah 3 |
| Komponen FE | Halaman `/explore` (konsol); penampil subgraph F-12 | Buat (`/explore`) / Pakai (F-12, 11) | Rencana Teknis Langkah 10 |
| Modul BE | `src/proxy.ts` (Basic Auth `DEMO_PASSWORD`) | Pakai | Rencana Teknis Langkah 12 |
| Env var | `NEO4J_URI`, `NEO4J_USERNAME`, `NEO4J_PASSWORD`, `DEMO_PASSWORD` | Pakai | Rencana Teknis Langkah 2, 12 |

## 6. Breakdown Task Implementasi
| ID | Task | Layer | Estimasi (jam) | Bergantung pada | Output terverifikasi |
| --- | --- | --- | --- | --- | --- |
| T21-01 | Pemetaan hasil `readCypher`: baris/kolom untuk tabel; bila hasil memuat node/relasi, bentuk `GraphPayload` memakai konverter dari 07 (F-08); konversi `Date`/Integer | BE | 0,5 | 09 (F-10), 07 (F-08, konverter) | Query `MATCH (a:Akun {id:'C01'}) RETURN a` menghasilkan tabel dan, bila ada relasi, `GraphPayload` tanpa duplikat |
| T21-02 | Route handler `POST /api/cypher`: validasi body `{ query }` (`zod`), panggil `readCypher`, petakan error (ditolak F-10 → 400, sintaks/timeout → status terdefinisi) tanpa detail internal | BE | 0,25 | T21-01 | `curl -X POST /api/cypher -d '{"query":"RETURN 1"}'` → 200; `CREATE (n)` → 400 dengan pesan penolakan F-10 |
| T21-03 | Halaman `/explore`: textarea, tombol jalankan, tabel hasil, penampil F-12 bila ada `GraphPayload`, state loading/kosong/error | FE | 0,5 | T21-02, 11 (F-12) -- sebelum itu **bisa paralel** dengan respons tiruan dan tabel saja | Query baca tampil sebagai tabel/graph; query tulis menampilkan pesan ditolak |
| T21-04 | Uji: query tulis ditolak, query baca (tabel & graph), sintaks salah, timeout, dan akses tanpa Basic Auth ditolak | Test | 0,5 | T21-02, T21-03, 00 (`src/proxy.ts`) | `bun test` hijau; akses tanpa kredensial → 401 |
| | **Total 1,75 jam (estimasi PRD: 0,5 jam)** | | | | |

## 7. Dependensi
- Bergantung pada fitur: 09 (F-10) -- `readCypher` terkeras dan penolakan tulis; 11 (F-12) -- penampil graph; transitif: 07 (F-08) untuk konverter `GraphPayload`, 00 untuk `src/proxy.ts`.
- Memblokir fitur: tidak ada.
- Dependensi eksternal: Aura aktif; `DEMO_PASSWORD` terpasang di Vercel.
- Bisa mulai lebih dulu dengan mock: sebagian -- route dan tabel bisa dibangun begitu 09 selesai; integrasi graph menunggu komponen F-12.

## 8. Cara Uji
| Acceptance criteria | Cara uji | Otomatis/Manual |
| --- | --- | --- |
| Query tulis (`CREATE`, `MERGE`, `DETACH DELETE`, `SET`) ditolak oleh F-10 (jalur error) | Test route: kirim tiap bentuk, harapkan 400 dan tidak ada perubahan di Aura | Otomatis |
| Query baca dirender sebagai tabel (happy path) | `RETURN 1` dan query ranking sederhana lewat UI `/explore` | Manual + otomatis (assert respons) |
| Query baca berisi node/relasi dirender di F-12 | Jalankan `MATCH p=(a:Akun {id:'C01'})-[*..2]-() RETURN p LIMIT 25` di UI | Manual |
| Jalur error: sintaks salah dan timeout | Kirim query tidak valid dan query berat; respons terstruktur tanpa stack trace | Otomatis |
| Tanpa Basic Auth ditolak | `curl` tanpa header otorisasi → 401 | Otomatis |
| Tampilan konsol (loading/kosong/error) | Uji manual di dev dan produksi | Manual |

## 9. Asumsi, Konflik & Risiko
- ⚠️ ASUMSI: Estimasi task 1,75 jam vs PRD 0,5 jam (+250%, di atas ambang 25%). PRD 0,5 jam tampak hanya menghitung route handler; pemetaan hasil, halaman `/explore`, dan pengujian tidak terhitung -- cara validasi: ukur jam nyata saat dikerjakan (J14–15); fitur ini kandidat pertama dibuang bila terlambat (urutan pemotongan PRD).
- ⚠️ ASUMSI: Halaman `/explore` tidak dimiliki file frontend mana pun di manifest; Dio membangun versi minimal di sini (T21-03) -- cara validasi: konfirmasi dengan Tegar/tech lead.
- ⚠️ ASUMSI: Body request `{ "query": string }` dan bentuk respons (kolom, baris, `graph` opsional) tidak ditetapkan di PRD/Rencana Teknis -- cara validasi: sepakati dengan Tegar sebelum T21-03.
- ⚠️ ASUMSI: Kode status error (400 untuk ditolak/sintaks, status lain untuk timeout) tidak ditetapkan di sumber -- cara validasi: sepakati saat T21-02.
- ⚠️ ASUMSI: Komponen penampil F-12 menerima `GraphPayload` ≤80 node, sedangkan batas `LIMIT` paksa F-10 belum ditetapkan; hasil lebih besar dari 80 node harus dipotong atau ditampilkan sebagai tabel -- cara validasi: uji di T21-04 setelah 11 selesai.
- ✅ KEPUTUSAN (K-A, 2026-10-09, Adrian): Prisma + Supabase dihapus dari repo; penyimpanan graph hanya Neo4j AuraDB Free (PRD §9, Rencana Teknis §2.3). Fitur ini tidak memakai Prisma/Supabase.
- 🔁 USULAN PERUBAHAN: tidak ada.
- Risiko: endpoint menerima query bebas di URL publik; satu password bersama dan tanpa rate limit (celah yang diakui Rencana Teknis Langkah 12) -- mitigasi: Basic Auth dari 00, session READ + deny-list + `LIMIT` + timeout 5 detik dari 09; data bersifat fiktif; fitur boleh dimatikan di produksi bila ada keraguan.
- Risiko: query berat menghabiskan sumber daya Aura Free -- mitigasi: timeout 5 detik dan `LIMIT` paksa dari 09.

## 10. Definition of Done
- [ ] Semua acceptance criteria di section 3 lolos uji di section 8
- [ ] Semua task di section 6 selesai, atau sudah dipindah secara eksplisit
- [ ] Lint, typecheck, dan build lulus (script `typecheck` belum ada di `package.json` saat file ini ditulis)
- [ ] Tidak ada secret yang di-hardcode; konfigurasi lewat environment variable
- [ ] Implementasi sesuai kontrak dan skema TDD, tanpa perubahan yang tidak tercatat
- [ ] UI di jalur demo punya tampilan loading, kosong, dan error (`/explore` bukan jalur demo utama tetapi mengikuti standar yang sama)
- [ ] Sudah dicek di lingkungan deploy (query baca berhasil, query tulis ditolak di URL produksi)
- [ ] PR sudah direview dan di-merge, lalu status di header file diperbarui
- [ ] Endpoint terbukti menolak akses tanpa Basic Auth
