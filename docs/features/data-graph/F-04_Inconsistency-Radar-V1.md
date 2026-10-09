# 04 -- Inconsistency Radar: mesin aturan v1
> ID PRD: F-04 · Prioritas: Must · Penanggung jawab: Adrian (Data Graph) + Dio (Backend) · Estimasi: 3,5 jam-orang (PRD) · Status: Implementasi selesai; golden hijau terhadap Aura (gerbang J8 lolos untuk sisi data-graph); kode/bobot menunggu konfirmasi Dio (A13)

## 1. Ringkasan Fitur
- Apa: runner `scripts/signals.ts` menjalankan satu file Cypher per aturan di `cypher/signals/*.cypher` (8 aturan + penekan Z1–Z3, generik untuk 40 akun) dan menulis hasilnya sebagai `(:Sinyal)-[:PADA]->(:Akun)` dan `(:Sinyal)-[:BUKTI]->(:Entitas)` dengan kontrak `{akun, kode, bobot, bukti_ids, fakta, sejak}`.
- Untuk siapa: Laras -- risiko yang disembunyikan health score terlihat; Bima -- tiap temuan punya jalur bukti.
- Peran di ★ jalur demo utama: langkah 1–2 (C01 Kritis dengan jalur champion → P01, CFO baru menyebut KasirPro, janji FEAT-07) dan langkah 5 (C02 "konsisten", C03 bug bukan churn). Gerbang J8: golden test lulus.

## 2. Acuan PRD & TDD
- PRD: §1 (bukti per akun C01–C06), §4 (golden test peringkat), §5 (IN SCOPE: 8 aturan + Z1–Z3 generik), §6 F-04, §7 (J6–9, gerbang J8), §8 (A13 pemetaan S1–S8/Z1–Z3, pertanyaan 3 dan 4).
- TDD (acuan sementara = Rencana Teknis): §1.3 Langkah 7 (kontrak detektor, `cypher/signals/champion_keluar.cypher`, runner, golden test, uji 40 akun), §2.4 (`cypher/signals/*.cypher`, `scripts/signals.ts`), §3.4 ("F05 Detektor sinyal churn" di Rencana = F-04 di PRD), §3.6 (garis potong J8).
- Keputusan yang dikunci:
  - Satu file `.cypher` = satu aturan; tidak ada ID akun yang di-hardcode; parameter `$snapshot` dari `SNAPSHOT_DATE` (`2026-10-01`).
  - Kontrak output: `{akun, kode, bobot, bukti_ids, fakta, sejak}`; `bukti_ids` memuat semua node di pola, termasuk akun.
  - Hasil disimpan sebagai `(:Sinyal)-[:PADA]->(:Akun)` dan `(:Sinyal)-[:BUKTI]->(:Entitas)` agar UI dan Q&A membaca hasil yang sama.
  - Tiket `permintaan_fitur` tidak dihitung sebagai sinyal negatif (Z1).
  - Kode sinyal didefinisikan di file ini saja (tabel di section 4); file lain merujuk "kode sinyal F-04".
  - Skoring/level/rupiah di 05 (F-05), bukan di sini.

## 3. User Stories & Acceptance Criteria
- User story: Sebagai Laras, saya ingin sistem menandai titik di mana sumber-sumber saling bertentangan, agar risiko yang disembunyikan health score terlihat.
- Acceptance criteria:
  - Diberikan 40 akun, ketika runner aturan dijalankan, maka setiap sinyal mengikuti kontrak `{akun, kode, bobot, bukti_ids, fakta, sejak}` dan tidak ada ID akun yang di-hardcode.
  - Diberikan 8 aturan + Z1–Z3, ketika golden test dijalankan, maka C01 terpicu R1 (Orang), R2 (Janji), dan kompetitor disebut; C04 terpicu outreach tak berbalas dan risiko pembayaran.
  - Diberikan tiket `permintaan_fitur` C02, ketika Z1–Z3 diterapkan, maka tiket itu tidak menghasilkan sinyal negatif.
  - Gerbang J8: golden test lulus. Bila tidak, D berhenti di F-03 dan F-17 batal.
- Kriteria teknis tambahan:
  - (tambahan teknis) Runner idempoten: dijalankan dua kali menghasilkan jumlah `Sinyal` yang sama; runner hanya menghapus `Sinyal` miliknya sendiri (berkas di `cypher/signals/`), tidak menyentuh sinyal dari 16 (F-17).
  - (tambahan teknis) Properti `fakta` disimpan sebagai string JSON (properti Neo4j tidak boleh berupa map) -- ⚠️ ASUMSI.
  - (tambahan teknis) Setiap `Sinyal` membawa `kode`, `bobot`, `sejak`, `fakta`, `source_file` (berkas aturan), `source_id`.
  - (tambahan teknis) Runner gagal jelas bila baris hasil melanggar kontrak (kolom hilang, `bukti_ids` memuat ID yang tidak ada di graph).

## 4. Ruang Lingkup Fitur
- Termasuk:
  - Runner `scripts/signals.ts` (baca berkas aturan, jalankan dengan `$snapshot`, validasi kontrak, tulis `Sinyal`, `PADA`, `BUKTI`).
  - 8 aturan v1 + penekan Z1–Z3 (tabel di bawah) dan kalibrasi bobot awal dengan golden test.
  - Golden test sinyal (`tests/golden/signals.test.ts`, ⚠️ nama berkas asumsi) yang ditulis sebelum aturan.
- Tidak termasuk:
  - Skor, level, rupiah, divergensi dashboard, peringkat (`getRanking`, assertion peringkat C01 = 1) → 05 (F-05).
  - Aturan lanjutan R5/R6/decision maker baru → 20 (F-21); sinyal "Janji internal vs eksternal" → 16 (F-17); sinyal kontak tunggal S7 (F-27, Could, tidak dibuatkan file).
  - API/UI jalur bukti → 07 (F-08), 10 dan 11.
- Pengganti sementara: tidak ada (UI memakai fixture dari 00 sebelum data nyata).

**Daftar kode sinyal F-04 (sumber tunggal; ⚠️ ASUMSI A13: pemetaan ke S1–S8/R1–R8 Dio belum dikonfirmasi):**

| # | Kode | Aturan (label PRD bila ada) | Pola graph ringkas | Bobot awal (⚠️ ASUMSI, dikalibrasi) |
| --- | --- | --- | --- | --- |
| 1 | `CHAMPION_KELUAR` | R1 (Orang) | `(Kontak)-[:CHAMPION_DARI]->(Akun)`, `PERNAH_BEKERJA_DI` dengan `selesai <= $snapshot`, tanpa `BEKERJA_DI` aktif ke akun yang sama; `OPTIONAL MATCH` organisasi tujuan dan interaksi pamit kontak → akun | 3 (Rencana Teknis Langkah 7) |
| 2 | `JANJI_DILANGGAR` | R2 (Janji) | `(Karyawan)-[:MENYETUJUI]->(Keputusan)-[:MENJANJIKAN {status_janji}]->(Fitur)` dengan Kontrak `DIDASARKAN_PADA` keputusan; janji belum ditepati | 3 |
| 3 | `KOMPETITOR_DISEBUT` | -- | `(Interaksi {template: false})-[:MENYEBUT]->(Kompetitor)` dan `-[:TENTANG]->(Akun)` | 2 |
| 4 | `OUTREACH_TAK_BERBALAS` | -- | interaksi keluar ke kontak akun tanpa `MEMBALAS` dalam jendela waktu (tanggal interaksi template tetap dihitung sebagai bukti kontak) | 2 |
| 5 | `RISIKO_PEMBAYARAN` | -- | Kontrak/billing dengan keterlambatan bayar berulang | 2 |
| 6 | `TIKET_BUG_TAK_TERTAUT` | R3 (kamus gejala) | tiket dengan `KANDIDAT_DISEBABKAN_OLEH` per akun melewati ambang | 1 |
| 7 | `ANOMALI_USAGE_RILIS_BUG` | -- | `(Akun)-[:MEMILIKI]->(Outlet)-[:MENGALAMI]->(Anomali)-[:BERTEPATAN_DENGAN]->(Rilis)` dengan `(Bug)-[:TERDAPAT_DI]->(Rilis)` | 2 |
| 8 | `TIKET_TAK_DIREPRODUKSI` | -- (⚠️ slot ke-8 belum terpetakan ke teks PRD/Rencana) | tiket bergejala sinkronisasi yang ditutup "tidak dapat direproduksi" (PRD §1: 4 dari 14 tiket) | 1 |

Penekan: Z1 = tiket `permintaan_fitur` tidak menghasilkan sinyal negatif (PRD F-04/F-07); Z2 (⚠️ draf) = penurunan usage yang bertepatan dengan rilis ber-bug diberi label "bug, bukan churn" dan tidak dihitung sebagai churn usage; Z3 (⚠️ draf) = interaksi `template=true` tidak dihitung sebagai bukti isi (janji/kompetitor), hanya sebagai tanggal kontak.

Kode cadangan (ditetapkan di sini, diimplementasikan file lain, tidak dibuat oleh runner Cypher F-04): `JANJI_INTERNAL_VS_EKSTERNAL` (16, F-17); `ANGKA_TAK_SESUAI` (R5, 20/F-21), `NILAI_TAK_SESUAI` (R6, 20/F-21), `DECISION_MAKER_BARU` (20/F-21). Semua ⚠️ ASUMSI (A13).

## 5. API, Data & Komponen yang Disentuh
| Jenis | Nama | Aksi | Acuan TDD |
| --- | --- | --- | --- |
| Modul BE | `scripts/signals.ts` (runner aturan) | Buat | Rencana Teknis §1.3 Langkah 7, §2.4 |
| Data (Cypher) | `cypher/signals/*.cypher` (satu berkas per aturan di tabel section 4) | Buat | Rencana Teknis §1.3 Langkah 7 |
| Tabel (node graph) | `:Sinyal` | Buat | Rencana Teknis §1.3 Langkah 7 |
| Relasi | `PADA` (Sinyal → Akun), `BUKTI` (Sinyal → Entitas) | Buat | Rencana Teknis §1.3 Langkah 3 |
| Tabel (node graph) | `:Akun`, `:Kontak`, `:Interaksi`, `:Tiket`, `:Outlet`, `:Anomali`, `:Rilis`, `:Bug`, `:Keputusan`, `:Fitur`, `:Kompetitor` | Pakai | Rencana Teknis §1.3 Langkah 3 |
| Modul BE | `src/server/neo4j.ts` (`readCypher`) | Pakai (tes) | Rencana Teknis §1.3 Langkah 8 |
| Env var | `NEO4J_URI`, `NEO4J_USERNAME`, `NEO4J_PASSWORD`, `SNAPSHOT_DATE` | Pakai | Rencana Teknis §1.3 Langkah 2, 12; §2.4 |
| Script | `package.json` → `signals` (`bun scripts/signals.ts`), `test:golden` | Buat | Rencana Teknis §1.3 Langkah 4 |
| Tes | `tests/golden/signals.test.ts` | Buat | Rencana Teknis §1.3 Langkah 7 |

## 6. Breakdown Task Implementasi
| ID | Task | Layer | Estimasi (jam) | Bergantung pada | Output terverifikasi |
| --- | --- | --- | --- | --- | --- |
$1 **Status: selesai** -- `tests/golden/signals.test.ts` ditulis dulu (gagal "Sinyal belum ada" sebelum aturan); konfirmasi kode/bobot ke Dio **belum** (A13). |
$1 **Status: selesai** (dikerjakan Adrian; PIC dokumen = Dio -- perlu ditinjau Dio) -- `scripts/signals.ts`: validasi kontrak sebelum menulis, ID `SIG-<akun>-<kode>-<n>`, hapus hanya Sinyal milik `cypher/signals/`; dua run → jumlah sama. |
$1 **Status: selesai** -- C01: `CHAMPION_KELUAR` (K017 → P01, bukti I0290), `JANJI_DILANGGAR` (FEAT-07, D-2025-11), `KOMPETITOR_DISEBUT` (KasirPro, K134). |
$1 **Status: selesai** -- C04: `OUTREACH_TAK_BERBALAS` (I0288, I0319, I0339) dan `RISIKO_PEMBAYARAN` (2× telat, D-2026-03, T0420). |
$1 **Status: selesai** -- C03 dan C05: `ANOMALI_USAGE_RILIS_BUG`, `TIKET_BUG_TAK_TERTAUT` (8 dan 6 tiket), `TIKET_TAK_DIREPRODUKSI` (2 tiket masing-masing). |
$1 **Status: selesai** -- Z1 di aturan 6 dan 8 (`kategori <> 'permintaan_fitur'`), Z2 sebagai `tafsir: 'bug, bukan churn'` di aturan 7, Z3 lewat `template = false`; C02 dan C06 tanpa sinyal. |
$1 **Status: selesai** -- sapuan 40 pelanggan: hanya C01, C03, C04, C05 bersinyal; 0 akun non-fokus tersorot. Bobot awal dipertahankan (tidak perlu kalibrasi). |
| | **Total 5,0 jam (estimasi PRD: 3,5 jam)** -- selisih +43%, lihat ⚠️ ASUMSI di section 9. | | | | |

## 7. Dependensi
- Bergantung pada fitur: 03 (F-03) -- Anomali, `MENJALANKAN_VERSI`, `MEMBALAS`, `MENYEBUT`, `KANDIDAT_DISEBABKAN_OLEH`; (transitif) 02, 01; 00 untuk `readCypher` dan env `SNAPSHOT_DATE`.
- Memblokir fitur: 05 (F-05), 06 (F-07), 07 (F-08), 08 (F-09), 16 (F-17, gerbang J8), 18 (F-19), 19 (F-20), 20 (F-21).
- Dependensi eksternal: Aura aktif; konfirmasi Dio atas kode/bobot (A13); keputusan kamus R3 (7 + 4 vs 8 + 6).
- Bisa mulai lebih dulu dengan mock: sebagian -- T04-01 (tes dan kontrak) bisa mulai sebelum 03; aturan perlu graph hasil 03.

## 8. Cara Uji
| Acceptance criteria | Cara uji | Otomatis/Manual |
| --- | --- | --- |
| Kontrak `{akun, kode, bobot, bukti_ids, fakta, sejak}`; tanpa ID akun hard-coded | Tes membaca semua `Sinyal` dan memeriksa bentuknya; tes memindai `cypher/signals/*.cypher` dengan regex literal ID (mis. `'C0\d'`, `'K\d{3}'`) → harus kosong. Jalur error: aturan yang mengembalikan kolom kurang membuat runner gagal | Otomatis (`bun test tests/golden`) |
| C01: R1, R2, kompetitor; C04: outreach tak berbalas dan risiko pembayaran | `getSignals`-setara: query `Sinyal` per akun lewat `readCypher`; assert kode dan `fakta.kontak = K017` | Otomatis |
| Tiket `permintaan_fitur` C02 tidak menghasilkan sinyal negatif | Assert C02 tidak punya sinyal negatif; C06 tanpa sinyal | Otomatis |
| Gerbang J8 | `bun run test:golden` hijau penuh | Otomatis |
| (tambahan teknis) idempotensi | Jalankan `bun run signals` dua kali → jumlah `Sinyal` sama | Otomatis |
| Uji 40 akun | Baca manual daftar sinyal akun non-fokus; bila alasan tak masuk akal, aturan terlalu longgar (Rencana Teknis Langkah 7) | Manual |

## 9. Asumsi, Konflik & Risiko
- ⚠️ ASUMSI: total task 5,0 jam vs estimasi PRD 3,5 jam (+43%, >25%). Alasan: delapan berkas Cypher + runner + Z1–Z3 + kalibrasi; PRD A4 sendiri menyebut effort nyata bisa 1,5–2×. -- cara validasi: bandingkan jam nyata di J8; bila terlambat, gerbang J8 memotong F-17.
- ⚠️ ASUMSI (A13): kode, urutan, dan arti aturan ke-3 sampai ke-8 serta Z2/Z3 disusun dari teks PRD dan daftar detektor Rencana Teknis §3.4; hanya R1 (Orang), R2 (Janji), R3 (kamus gejala), dan Z1 yang bernama di PRD. Slot ke-8 (`TIKET_TAK_DIREPRODUKSI`) adalah kandidat dari PRD §1 (4 tiket "tidak dapat direproduksi"). -- cara validasi: konfirmasi ke Dio di T04-01.
- ⚠️ ASUMSI: bobot awal selain `CHAMPION_KELUAR` = 3 (Rencana) adalah tebakan; ambang level ada di 05. -- cara validasi: kalibrasi T04-07 terhadap golden peringkat di 05.
- ⚠️ ASUMSI: properti Kontrak/billing (keterlambatan bayar), `status_janji`/status fitur, kategori tiket (`permintaan_fitur`), dan field direksi interaksi belum tertulis di Rencana Teknis. -- cara validasi: cek header CSV dan `nodes.jsonl` di T04-03 s.d. T04-05.
- ⚠️ ASUMSI: golden F-04 membaca `Sinyal` langsung lewat `readCypher`; `getSignals`/`getRanking` di `src/server/queries/risk.ts` dimiliki 05 (F-05) agar tidak ada dependensi mundur. Assertion peringkat (C01 = 1, level Kritis/Tinggi/Waspada/Aman) dipindah ke 05. -- cara validasi: sepakati dengan Dio.
- ⚠️ ASUMSI: ID `Sinyal` deterministik (mis. `SIG-<akun>-<kode>-<n>`); format belum tertulis. -- cara validasi: sepakati dengan Dio sebelum T04-02.
- ⛔ KONFLIK (K-F): Rencana Teknis §3.4 F05 v1 = 6 detektor; PRD = 8 aturan + Z1–Z3 -- dipakai sementara: PRD (8 aturan).
- ⛔ KONFLIK (K-D): PRD menaruh `KANDIDAT_DISEBABKAN_OLEH` di F-03 v1; Rencana Teknis menaruhnya di "lanjutan" -- dipakai sementara: PRD; aturan 6 bergantung padanya.
- ⛔ KONFLIK: kontrak output -- PRD: `{akun, kode, bobot, bukti_ids, fakta, sejak}`; Rencana Teknis Langkah 7: tanpa `sejak` -- dipakai sementara: PRD (dengan `sejak`, dipakai F-19).
- ⛔ KONFLIK: jumlah tiket kandidat R3 -- Rencana Teknis/PRD §1: 14 (C03 8 + C05 6); versi Tegar: 7 + 4 (PRD §8 pertanyaan 3) -- dipakai sementara: 14; assertion jumlah memakai konstanta yang sama dengan 03.
- ✅ KEPUTUSAN (K-A, 2026-10-09, Adrian): Prisma + Supabase dihapus dari repo; penyimpanan graph hanya Neo4j AuraDB Free (PRD §9, Rencana Teknis §2.3). Fitur ini tidak memakai Prisma/Supabase.
- 🔁 USULAN PERUBAHAN: tidak ada.
- Risiko: golden test tidak lulus di J8 (aturan generik salah tangkap, kamus R3 belum disepakati) -- mitigasi/fallback: kunci kamus di J0,5, tulis golden sebelum aturan (T04-01); gerbang J8: D berhenti di F-03 dan F-17 batal.
- Risiko: aturan terlalu longgar menyorot akun non-fokus -- mitigasi/fallback: uji 40 akun di T04-07 (uji termurah di Brief §5).
- Risiko: aturan berbasis template (janji/kompetitor) tertipu 318 interaksi template -- mitigasi/fallback: Z3 dan `template=false`.

- ✅ HASIL T04-07 (uji 40 akun): 11 Sinyal -- C01 ×3 (bobot 8), C03 ×3 (4), C04 ×2 (4), C05 ×3 (4); 36 pelanggan lain tanpa sinyal, termasuk C02 dan C06. Tidak ada akun non-fokus yang tersorot, jadi aturan tidak terlalu longgar. Catatan untuk F-05: C03 dan C05 bersinyal sama (jumlah bobot 4 masing-masing); selisih level Tinggi vs Waspada di golden PRD harus datang dari faktor renewal (C03 H-111, C05 H-191) atau ambang level -- keputusan Dio.
- ⚠️ ASUMSI (kontrak `fakta`): disimpan sebagai string JSON (sesuai ⚠️ ASUMSI di section 3). Cocok dengan `SinyalSchema.fakta: z.string()` di `src/types/graph.ts` milik Dio; golden membaca `JSON.parse(fakta).kontak`. `sejak` disimpan sebagai `date` Neo4j -- pembaca TypeScript harus mengubahnya ke string ISO (lihat `keJson` di `scripts/signals.ts`).
- ⚠️ ASUMSI (ambang yang saya pilih, belum disepakati): `OUTREACH_TAK_BERBALAS` ≥ 2 email non-template tak berbalas dan klien tidak mengirim email sesudah yang pertama; `RISIKO_PEMBAYARAN` keterlambatan ≥ 2 (data: hanya C04; C07, C20, C29, C32, C35 = 1); `TIKET_BUG_TAK_TERTAUT` ≥ 3 tiket; `sejak` untuk risiko pembayaran = keputusan terkait tertua, atau snapshot − 12 bulan. Pamit CHAMPION_KELUAR dikenali lewat heuristik nama-email (sampai F-16 menyelesaikan email lama).
- ⚠️ ASUMSI: hanya akun `tipe = 'pelanggan'` yang dinilai (prospek P02 menyebut KasirPro di I0296/I0348 tetapi bukan target peringkat churn).
- 🔁 USULAN PERUBAHAN: `scripts/demo-radar.ts` (alat bantu baca-saja untuk validasi manual); konstruksi ID Sinyal `SIG-<akun>-<kode>-<n>` dipakai sebagai ID deterministik (⚠️ ASUMSI tertulis, belum disepakati dengan Dio); T04-02 dikerjakan Adrian padahal PIC di dokumen = Dio.
- Titik koordinasi dengan Dio: (1) kode/bobot A13; (2) `fakta` string JSON; (3) `sejak` bertipe date; (4) F-05 membaca `(:Sinyal)-[:PADA]->(:Akun)` dan `[:BUKTI]` -- belum ada `getSignals`; (5) F-08 `getAccountEvidence` dapat memakai `BUKTI` + induced subgraph; (6) `readCypher` belum memakai `cypher-guard.ts` (milik F-10).

## 10. Definition of Done
- [ ] Semua acceptance criteria di section 3 lolos uji di section 8
- [ ] Semua task di section 6 selesai, atau sudah dipindah secara eksplisit
- [ ] Lint, typecheck, dan build lulus
- [ ] Tidak ada secret yang di-hardcode; konfigurasi lewat environment variable
- [ ] Implementasi sesuai kontrak dan skema TDD, tanpa perubahan yang tidak tercatat
- [ ] UI di jalur demo punya tampilan loading, kosong, dan error (tidak berlaku: fitur non-UI)
- [ ] Sudah dicek di lingkungan deploy (dijalankan terhadap Aura sebenarnya)
- [ ] PR sudah direview dan di-merge, lalu status di header file diperbarui
- [ ] Gerbang J8 lolos (golden test hijau) dan tabel kode sinyal di section 4 disetujui Dio serta dicantumkan di 05/07/08
