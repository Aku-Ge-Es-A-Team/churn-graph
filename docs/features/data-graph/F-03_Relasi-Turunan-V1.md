# 03 -- Relasi turunan v1
> ID PRD: F-03 · Prioritas: Must · Penanggung jawab: Adrian (Data Graph) · Estimasi: 2,5 jam-orang (PRD) · Status: Belum dimulai

## 1. Ringkasan Fitur
- Apa: membuat relasi yang tidak ada di file mana pun: `MENJALANKAN_VERSI`, `Anomali` (`MENGALAMI` → `BERTEPATAN_DENGAN` ke Rilis), `MEMBALAS`, `MENYEBUT` (Interaksi → Kompetitor), dan `KANDIDAT_DISEBABKAN_OLEH`, semuanya bertanda `derived`, `rule`, `confidence`.
- Untuk siapa: Laras -- melihat hubungan yang tidak tercatat di satu sistem (penurunan usage C03 = bug, bukan churn) -- nilai: tidak salah memberi diskon.
- Peran di ★ jalur demo utama: tidak langsung; mendasari langkah 2 (kompetitor disebut) dan langkah 5 (C03 = bug, bukan churn).

## 2. Acuan PRD & TDD
- PRD: §1 (C03 BUG-412 v4.12, 14 tiket tak tertaut), §6 F-03, §7 (J5,5–8), §8 pertanyaan 3 (kamus gejala R3).
- TDD (acuan sementara = Rencana Teknis): §1.3 Langkah 6 (tabel relasi turunan, contoh `cypher/derive/kandidat_bug412.cypher`), §1.3 Langkah 3 (tabel relasi, aturan 3: fakta vs turunan), §1.3 Langkah 4 (versi aplikasi dari usage), §3.4 ("F04 Relasi turunan" di Rencana = F-03 di PRD).
- Keputusan yang dikunci:
  - Versi per outlet diambil dari data usage, bukan kolom tiket (T0531, T0600, T0636).
  - `MENJALANKAN_VERSI`, Anomali, `MEMBALAS`, `MENYEBUT` dihitung di ETL; `KANDIDAT_DISEBABKAN_OLEH` dihitung dengan Cypher setelah load.
  - Anomali: rata-rata transaksi Agu–Sep 2026 vs baseline Okt–Des 2025, turun ≥25% (ambang = parameter).
  - Tiket kandidat tidak difilter menurut kategori tiket (gejala yang sama tercatat sebagai `bug` maupun `pertanyaan`).
  - Semua relasi turunan membawa `derived: true`, `rule`, `confidence`.

## 3. User Stories & Acceptance Criteria
- User story: Sebagai Laras, saya ingin melihat hubungan yang tidak tercatat di sistem mana pun, misalnya penurunan usage yang disebabkan bug, agar saya tidak salah membaca bug sebagai churn.
- Acceptance criteria:
  - Diberikan graph termuat, ketika derive dijalankan, maka relasi `MENJALANKAN_VERSI`, `Anomali`, `MEMBALAS`, `MENYEBUT`, dan `KANDIDAT_DISEBABKAN_OLEH` terbentuk dengan properti `derived`, `rule`, dan `confidence`.
  - Diberikan 6 outlet C03, ketika anomali dihitung, maka penurunannya −34 s.d. −36% dan bertepatan dengan v4.12.
  - Diberikan versi outlet, ketika dipakai untuk aturan bug, maka versi diambil dari data usage, bukan dari kolom tiket (kasus T0531, T0600, T0636).
- Kriteria teknis tambahan:
  - (tambahan teknis) `Anomali` menyimpan `metrik`, `baseline`, `terkini`, `delta_pct` dan terhubung `Outlet -[:MENGALAMI]-> Anomali -[:BERTEPATAN_DENGAN]-> Rilis`.
  - (tambahan teknis) `MENYEBUT` hanya dari interaksi non-template (`template=false`); kamus kompetitor berasal dari `crm_deals.kompetitor`.
  - (tambahan teknis) `KANDIDAT_DISEBABKAN_OLEH` hanya untuk tiket tanpa `DISEBABKAN_OLEH`, outlet `mode_offline=true`, tiket dibuat pada/setelah `MENJALANKAN_VERSI.sejak`, dan judul cocok kamus gejala dari judul tiket nyata di dataset.
  - (tambahan teknis) Golden: jumlah tiket kandidat = 14 (C03: 8, C05: 6) -- lihat ⛔ KONFLIK di section 9.

## 4. Ruang Lingkup Fitur
- Termasuk:
  - Modul derivasi di ETL (`scripts/etl/`) untuk `MENJALANKAN_VERSI`, Anomali, `MEMBALAS`, `MENYEBUT`; node `:Rilis` per versi (ID berprefiks `v`).
  - `scripts/run-cypher.ts` + `cypher/derive/kandidat_bug412.cypher` + kamus gejala, serta script `derive`.
  - Tes golden untuk relasi turunan.
- Tidak termasuk:
  - Relasi fakta dan JSONL dasar → 01; loader → 02.
  - `SALING_KENAL` → 22 (F-23); `ALAMAT_EMAIL_DARI` → 15 (F-16).
  - Detektor sinyal dan skoring → 04 (F-04) / 05 (F-05).
  - Penggabungan `:Organisasi` dengan `:Kompetitor` KasirPro (Inferensi di Rencana Teknis Langkah 3) -- hanya diperiksa saat mencocokkan kamus kompetitor, tidak digabung tanpa verifikasi.
- Pengganti sementara: tidak ada.

## 5. API, Data & Komponen yang Disentuh
| Jenis | Nama | Aksi | Acuan TDD |
| --- | --- | --- | --- |
| Modul BE | `scripts/etl/` (modul derivasi baru, ⚠️ nama berkas asumsi) | Ubah | Rencana Teknis §1.3 Langkah 6 |
| Modul BE | `scripts/run-cypher.ts` | Buat | Rencana Teknis §1.3 Langkah 4 (script `derive`) |
| Data (Cypher) | `cypher/derive/kandidat_bug412.cypher` | Buat | Rencana Teknis §1.3 Langkah 6 |
| Tabel (node graph) | `:Outlet`, `:UsageBulan`, `:Rilis`, `:Anomali`, `:Interaksi`, `:Kompetitor`, `:Tiket`, `:Bug` | Pakai / Buat (`:Rilis`, `:Anomali`) | Rencana Teknis §1.3 Langkah 3 |
| Relasi | `MENJALANKAN_VERSI`, `MENGALAMI`, `BERTEPATAN_DENGAN`, `MEMBALAS`, `MENYEBUT`, `KANDIDAT_DISEBABKAN_OLEH` | Buat | Rencana Teknis §1.3 Langkah 3, 6 |
| Env var | `NEO4J_URI`, `NEO4J_USERNAME`, `NEO4J_PASSWORD` | Pakai | Rencana Teknis §1.3 Langkah 2 |
| Script | `package.json` → `derive` (`bun scripts/run-cypher.ts cypher/derive`) | Buat | Rencana Teknis §1.3 Langkah 4 |
| Tes | `tests/golden/derive.test.ts` (⚠️ nama berkas asumsi) | Buat | Rencana Teknis §1.3 Langkah 7 |

## 6. Breakdown Task Implementasi
| ID | Task | Layer | Estimasi (jam) | Bergantung pada | Output terverifikasi |
| --- | --- | --- | --- | --- | --- |
| T03-01 | ETL: `MENJALANKAN_VERSI` (tanggal pertama sebuah versi muncul di usage per outlet, properti `sejak`) + node `:Rilis` (`v4.11`, `v4.12`, ...), dengan `derived`/`rule`/`confidence`. | BE | 0,75 | 02 (F-02) | `edges.jsonl` memuat `MENJALANKAN_VERSI`; outlet T0531/T0600/T0636 tidak punya relasi ke `v4.12`. |
| T03-02 | ETL: Anomali (Agu–Sep 2026 vs baseline Okt–Des 2025, ambang 25% sebagai parameter) + `MENGALAMI` → `Anomali` → `BERTEPATAN_DENGAN` → Rilis. | BE | 0,5 | T03-01 | 6 outlet C03 punya `Anomali` dengan `delta_pct` di rentang −36 s.d. −34 dan terhubung ke `v4.12`. |
| T03-03 | ETL: `MEMBALAS` (dari `membalas_id`) dan `MENYEBUT` (kamus kompetitor dari `crm_deals.kompetitor` dicocokkan ke interaksi non-template). | BE | 0,5 | 02 (F-02) | Jumlah `MEMBALAS` = jumlah `membalas_id` terisi; tidak ada `MENYEBUT` dari interaksi `template=true`. |
| T03-04 | Tulis `scripts/run-cypher.ts` (jalankan semua `.cypher` di sebuah folder, urut nama) + `cypher/derive/kandidat_bug412.cypher` (kamus gejala dari judul tiket nyata); script `derive`. | DB | 1,0 | T03-01, T03-03 | `bun run derive` membuat relasi `KANDIDAT_DISEBABKAN_OLEH` dengan `derived=true`, `rule`, `confidence`; T0531/T0600/T0636 tidak mendapat relasi. |
| T03-05 | Tes golden `tests/golden/derive.test.ts`: properti `derived`/`rule`/`confidence`, anomali C03 (6 outlet, −34 s.d. −36%), versi dari usage, jumlah kandidat (konstanta tunggal), idempotensi `rebuild`. | Test | 0,5 | T03-02, T03-04 | `bun test tests/golden/derive.test.ts` hijau; jalur error: tiket di luar kamus/outlet non-offline tidak mendapat relasi. |
| | **Total 3,25 jam (estimasi PRD: 2,5 jam)** -- selisih +30%, lihat ⚠️ ASUMSI di section 9. | | | | |

## 7. Dependensi
- Bergantung pada fitur: 02 (F-02) -- graph termuat, loader mengizinkan tipe relasi baru; (transitif) 01 (F-01) -- modul ETL yang diperluas.
- Memblokir fitur: 04 (F-04, aturan memakai Anomali/`KANDIDAT_...`/`MENYEBUT`/`MEMBALAS`), 17 (F-18, grafik usage), 19 (F-20), 22 (F-23).
- Dependensi eksternal: instance Aura aktif; kamus gejala R3 disepakati tim (PRD §8 pertanyaan 3).
- Bisa mulai lebih dulu dengan mock: sebagian -- T03-01–T03-03 hanya butuh JSONL (tanpa Aura); T03-04–T03-05 butuh graph termuat.

## 8. Cara Uji
| Acceptance criteria | Cara uji | Otomatis/Manual |
| --- | --- | --- |
| Lima relasi terbentuk dengan `derived`, `rule`, `confidence` | Query tiap tipe relasi: tidak ada yang `derived IS NULL`/`rule IS NULL`/`confidence IS NULL` | Otomatis (`bun test`) |
| 6 outlet C03 turun −34 s.d. −36% dan bertepatan v4.12 | Query `Anomali` untuk outlet milik C03; periksa `delta_pct` dan relasi ke `v4.12`. Jalur error: outlet non-C03/C05 offline tidak beranomali | Otomatis |
| Versi dari usage, bukan kolom tiket (T0531, T0600, T0636) | Periksa ketiga tiket tidak memiliki `KANDIDAT_DISEBABKAN_OLEH` ke BUG-412 | Otomatis |
| (tambahan teknis) jumlah kandidat | Bandingkan jumlah relasi dengan konstanta golden (14 = 8 + 6) | Otomatis |
| Idempotensi | `bun run rebuild` dua kali → jumlah relasi turunan sama | Otomatis |

## 9. Asumsi, Konflik & Risiko
- ⚠️ ASUMSI: total task 3,25 jam vs estimasi PRD 2,5 jam (+30%, >25%). Alasan: PRD tidak memisahkan runner Cypher dan modul ETL derivasi. -- cara validasi: ukur di J7; bila lambat, tunda `MENYEBUT` ke akhir (hanya dibutuhkan oleh aturan kompetitor di 04).
- ⚠️ ASUMSI: nama kolom usage untuk versi aplikasi dan properti tiket/outlet (`mode_offline`, `dibuat`, `judul`) mengikuti sketsa Rencana Teknis yang belum dijalankan. -- cara validasi: cek header CSV dan properti `nodes.jsonl` di T03-01.
- ⚠️ ASUMSI: modul derivasi diletakkan di `scripts/etl/` (nama berkas belum ditetapkan Rencana Teknis). -- cara validasi: sepakati dengan modul 01.
- ⚠️ ASUMSI: penurunan −34 s.d. −36% dihitung terhadap rata-rata `jumlah_transaksi`/`transaksi_offline_tersinkron` per outlet pada jendela Agu–Sep vs Okt–Des; metrik pasti belum tertulis. -- cara validasi: cocokkan dengan Brief §4 (rentang −34 s.d. −36%); selisih berarti metrik/jendela salah.
- ⛔ KONFLIK (K-D): PRD F-03 menaruh `KANDIDAT_DISEBABKAN_OLEH` di v1; Rencana Teknis §3.4 (F04) menaruhnya di "lanjutan" -- dipakai sementara: v1 di fitur ini (PRD).
- ⛔ KONFLIK: jumlah tiket kandidat -- Rencana Teknis Langkah 6 dan PRD §1: 14 tiket (C03: 8, C05: 6); versi Tegar: 7 + 4 (PRD §8 pertanyaan 3 belum dijawab) -- dipakai sementara: 14, disimpan sebagai konstanta tunggal di tes sehingga mudah diganti.
- ✅ KEPUTUSAN (K-A, 2026-10-09, Adrian): Prisma + Supabase dihapus dari repo; penyimpanan graph hanya Neo4j AuraDB Free (PRD §9, Rencana Teknis §2.3). Fitur ini tidak memakai Prisma/Supabase.
- 🔁 USULAN PERUBAHAN: tidak ada.
- Risiko: kamus gejala terlalu longgar/ketat sehingga jumlah kandidat meleset dari 14 -- mitigasi/fallback: ambil kata dari judul tiket nyata; bila beda, cek tanggal tiket terhadap `MENJALANKAN_VERSI.sejak` (Rencana Teknis Langkah 6).
- Risiko: gejala sama tercatat sebagai `permintaan_fitur` (Z1 di 04 mengecualikan kategori ini dari sinyal negatif) -- mitigasi/fallback: kategori tidak dipakai sebagai filter di sini; Z1 menyaring di sisi sinyal.
- Risiko: golden test Wajib lulus di gerbang J8 (PRD §7) -- mitigasi/fallback: bila terlambat, D berhenti menambah relasi turunan dan fokus ke F-04.

## 10. Definition of Done
- [ ] Semua acceptance criteria di section 3 lolos uji di section 8
- [ ] Semua task di section 6 selesai, atau sudah dipindah secara eksplisit
- [ ] Lint, typecheck, dan build lulus
- [ ] Tidak ada secret yang di-hardcode; konfigurasi lewat environment variable
- [ ] Implementasi sesuai kontrak dan skema TDD, tanpa perubahan yang tidak tercatat
- [ ] UI di jalur demo punya tampilan loading, kosong, dan error (tidak berlaku: fitur non-UI)
- [ ] Sudah dicek di lingkungan deploy (dijalankan terhadap Aura sebenarnya)
- [ ] PR sudah direview dan di-merge, lalu status di header file diperbarui
- [ ] Anomali 6 outlet C03 (−34 s.d. −36%) muncul setelah `bun run rebuild`; konstanta golden kandidat disepakati
