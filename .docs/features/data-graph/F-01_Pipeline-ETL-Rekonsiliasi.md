# 01 -- Pipeline ETL + rekonsiliasi
> ID PRD: F-01 · Prioritas: Must · Penanggung jawab: Adrian (Data Graph) · Estimasi: 3,5 jam-orang (PRD) · Status: Belum dimulai

## 1. Ringkasan Fitur
- Apa: skrip `bun run etl` (`scripts/etl/index.ts`) membaca 12 file wajib, memvalidasi dengan `zod`, membersihkan dan merekonsiliasi nilai, mengagregasi usage harian menjadi `UsageBulan`, lalu menulis `data/build/nodes.jsonl`, `data/build/edges.jsonl`, dan `data/build/quality-report.json`.
- Untuk siapa: Laras (Head of CS) -- peringkat risiko tidak dibangun di atas data yang salah; Bima (AM) -- setiap bukti bisa dilacak ke baris asal.
- Peran di ★ jalur demo utama: bukan bagian langsung; fondasi data untuk langkah 1–6 (PRD §9: F-01–F-04 melayani jalur demo secara tidak langsung).

## 2. Acuan PRD & TDD
- PRD: §1 (kualitas data: 318 dari 350 interaksi template, champion CRM usang), §5 (batasan data: 12 file wajib, `decision_log.xlsx` diabaikan, agregasi usage ±7.440 node, A9), §6 F-01, §7 (J2–5), §8 (A4, A9).
- TDD (acuan sementara = Rencana Teknis): §1.3 Langkah 4 (ETL, urutan tahap, aturan cleaning), §1.3 Langkah 3 (aturan pemodelan 1–6, tabel relasi, kontrak `Sumber`/`GNode`/`GEdge`), §2.1 (pipeline data: Bun + `papaparse` + `zod` → JSONL), §2.4 (struktur repo `scripts/etl/`, `data/raw/`, `data/build/`), §3.4 (fitur "F01 Pipeline ingestion & cleaning" di Rencana = F-01 di PRD).
- Keputusan yang dikunci:
  - ETL TypeScript yang dijalankan Bun (bukan Python); `bun add --exact <pkg>` dan `bunx --bun`.
  - File perantara JSONL + `quality-report.json`; baris gagal validasi tidak dibuang diam-diam.
  - ID global unik bertipe string (prefiks dataset; Rilis diberi prefiks `v`, mis. `v4.12`); label sekunder `:Entitas`.
  - Usage harian diagregasi menjadi `UsageBulan` (620 outlet × 12 bulan); baseline dan delta dihitung di ETL.
  - Setiap node dan relasi membawa `source_file` + `source_id`.
  - Interaksi template ditandai, tidak dibuang (tanggalnya tetap bukti kontak terakhir).
  - Versi aplikasi per outlet diambil dari data usage, bukan dari kolom tiket.

## 3. User Stories & Acceptance Criteria
- User story: Sebagai Laras, saya ingin data dari 6 sistem disatukan dengan benar, agar peringkat risiko tidak dibangun di atas data yang salah.
- Acceptance criteria:
  - Diberikan 12 file wajib, ketika `bun run etl` dijalankan, maka semua baris lolos `zod` atau tercatat alasannya di `quality-report.json`.
  - Diberikan `product_usage_daily.csv`, ketika diagregasi, maka terbentuk ±7.440 baris `UsageBulan` (620 outlet × 12 bulan).
  - Diberikan interaksi template, ketika diproses, maka flag `template=true` terpasang pada 318 baris.
  - Diberikan konflik nilai antara CRM dan kontrak, ketika direkonsiliasi, maka nilai kontrak dipakai sebagai sumber kebenaran.
- Kriteria teknis tambahan:
  - (tambahan teknis) CSV diparse dengan `dynamicTyping: false`, lalu dikonversi per kolom lewat skema `zod`; versi seperti "4.10" tetap string.
  - (tambahan teknis) `mode_offline_aktif` (`ya`/`tidak`) → boolean `mode_offline`; sel kosong `transaksi_offline_tersinkron` = `null` (bukan 0).
  - (tambahan teknis) `decision_log.nilai` diparse menurut `tipe` (persen untuk `diskon`, teks untuk `pengecualian`); `batas_outlet_paket` menerima angka atau teks "tanpa batas".
  - (tambahan teknis) Tidak ada ID ganda lintas label; ID ganda menghentikan ETL dengan error (karena `MERGE` di F-02 akan menggabungkannya diam-diam).
  - (tambahan teknis) Output deterministik (urutan stabil) sehingga dua kali `bun run etl` menghasilkan JSONL yang identik dan bisa di-diff.

## 4. Ruang Lingkup Fitur
- Termasuk:
  - Tahap extract → validasi `zod` → cleaning → rekonsiliasi → resolusi email (exact-match + baca `data/aliases.csv`) → agregasi `UsageBulan` → emit.
  - Node inti dan relasi FAKTA (non-turunan) dari tabel relasi Rencana Teknis Langkah 3: `BEKERJA_DI`, `PERNAH_BEKERJA_DI`, `CHAMPION_DARI`, `DIPEGANG_OLEH`, `MEMILIKI`, `MEMBUKA_TIKET`, `DISEBABKAN_OLEH`, `TERDAPAT_DI`, `TERKAIT`, `MENCATAT`, `TERLIBAT_DI`, `TENTANG`, `MENYETUJUI`, `DIDASARKAN_PADA`, `MENJANJIKAN`, dan `MENYEBUT` (Deal → Kompetitor dari `crm_deals.kompetitor`).
  - Penandaan `template` pada interaksi (isi identik ≥5 kali).
  - Rekonsiliasi CRM vs kontrak (nilai kontrak menang) dan pencatatan konflik di `quality-report.json`.
  - Pencatatan email yang tidak terselesaikan di `quality-report.json` sebagai masukan F-16.
- Tidak termasuk:
  - Memuat ke Neo4j, constraint, index → 02 (F-02).
  - Relasi turunan `MENJALANKAN_VERSI`, `Anomali`, `MEMBALAS`, `MENYEBUT` (Interaksi → Kompetitor), `KANDIDAT_DISEBABKAN_OLEH` → 03 (F-03).
  - Resolusi email lama berbasis nama/domain dan `ALAMAT_EMAIL_DARI` → 15 (F-16).
  - Node `Sinyal` → 04 (F-04); node `Klaim` → 16 (F-17).
  - Halaman laporan kualitas (F-26, Could, tidak dibuatkan file).
  - `decision_log.xlsx` (diabaikan, PRD §5) dan 2 file opsional (Rencana Teknis Langkah 4 menyebut "+2 opsional"; di luar 12 file wajib).
- Pengganti sementara: `data/aliases.csv` diisi manual bila F-16 dipotong (PRD §5); fixture JSON untuk UI sebelum J9 ditangani 00.

## 5. API, Data & Komponen yang Disentuh
| Jenis | Nama | Aksi | Acuan TDD |
| --- | --- | --- | --- |
| Modul BE | `scripts/etl/index.ts` (+ submodul extract, clean, resolve, aggregate, emit) | Buat | Rencana Teknis §1.3 Langkah 4, §2.4 |
| Data (file) | `data/raw/*` (salinan 12 file wajib, read-only) | Buat | Rencana Teknis §2.4 |
| Data (file) | `data/build/nodes.jsonl`, `data/build/edges.jsonl`, `data/build/quality-report.json` | Buat | Rencana Teknis §1.3 Langkah 4 |
| Data (file) | `data/aliases.csv` (⚠️ path persis tidak ditetapkan) | Pakai | PRD §5, Rencana Teknis §3.4 (F02 Rencana) |
| Komponen/Tipe | `src/types/graph.ts` (`Sumber`, `GNode`, `GEdge`) | Pakai | Rencana Teknis §1.3 Langkah 3 |
| Library | `papaparse`, `zod` (`bun add --exact`) | Pakai | Rencana Teknis §2.1 |
| Script | `package.json` → `etl` (`bun scripts/etl/index.ts`) | Buat bila belum ada dari 00 | Rencana Teknis §1.3 Langkah 4 |
| Env var | tidak ada (ETL tidak menyentuh database) | -- | -- |

## 6. Breakdown Task Implementasi
| ID | Task | Layer | Estimasi (jam) | Bergantung pada | Output terverifikasi |
| --- | --- | --- | --- | --- | --- |
| T01-01 | Salin 12 file wajib dari `dump/dataset_kasirnusa` ke `data/raw/` (read-only; `decision_log.xlsx` tidak disalin). | BE | 0,25 | 00 (repo + Bun siap) | `data/raw/` berisi 12 file; jumlah baris per file dicatat di komentar header `scripts/etl/index.ts`. |
| T01-02 | Tahap extract + skema `zod` untuk 12 file (`papaparse`, `dynamicTyping: false`); baris gagal ditulis ke `quality-report.json` dengan alasan. Pasang dependensi dengan `bun add --exact papaparse zod` bila belum ada. | BE | 1,0 | T01-01 | `bun run etl` (tahap extract) melaporkan per file: baris sumber = lolos + gagal; tidak ada baris hilang tanpa alasan. |
| T01-03 | Cleaning + rekonsiliasi: tanggal, `mode_offline`, `transaksi_offline_tersinkron` null, versi sebagai string, `nilai` menurut `tipe`, `batas_outlet_paket`; konflik CRM vs kontrak diselesaikan dengan nilai kontrak dan dicatat. | BE | 0,75 | T01-02 | Tes unit `bun test` untuk tiap normalizer lulus; `quality-report.json` memuat daftar konflik CRM-vs-kontrak beserta nilai yang dipakai. |
| T01-04 | Tandai `template=true` (isi identik ≥5 kali); bangun indeks email (exact-match ke Kontak/Karyawan) + baca `data/aliases.csv` bila ada; email tak terselesaikan dicatat di `quality-report.json`. | BE | 0,5 | T01-02 | Jumlah interaksi `template=true` = 318 dari 350; daftar email tak terselesaikan muncul di laporan (masukan F-16). |
| T01-05 | Agregasi `product_usage_daily` → `UsageBulan` (620 outlet × 12 bulan) lengkap dengan baseline dan delta; versi aplikasi per outlet dari usage. | BE | 0,75 | T01-02 | `nodes.jsonl` berisi ±7.440 node `UsageBulan`; outlet T0531/T0600/T0636 tidak punya versi 4.12 dari sisi usage. |
| T01-06 | Emit `nodes.jsonl` + `edges.jsonl` (node inti, relasi fakta, label `:Entitas`, `sumber` untuk `GNode`, `source_file` + `source_id`); cek keunikan ID global. | BE | 1,0 | T01-03, T01-04, T01-05 | Setiap record punya `source_file` dan `source_id`; ID ganda menghentikan ETL dengan pesan error; dua kali run → JSONL identik. |
| T01-07 | Finalisasi `quality-report.json` (per file: sumber/lolos/gagal, konflik, template, email tak terselesaikan, anomali data) + hitung jumlah node per label. | BE | 0,5 | T01-06 | `quality-report.json` terbaca manusia dan memuat jumlah node per label yang akan dibandingkan di 02. |
| T01-08 | Tes: normalizer + assertion hitungan (`tests/golden/etl.test.ts`, ⚠️ nama berkas asumsi): UsageBulan ±7.440, template 318, kasus null offline, ID ganda → error. | Test | 0,5 | T01-07 | `bun test tests/golden/etl.test.ts` hijau; satu tes jalur error (ID ganda / baris gagal zod) lulus. |
| | **Total 5,25 jam (estimasi PRD: 3,5 jam)** -- selisih +50%, lihat ⚠️ ASUMSI di section 9. | | | | |

## 7. Dependensi
- Bergantung pada fitur: 00 (Fondasi) -- repo Bun, struktur `scripts/`, `data/`, dan `package.json`.
- Memblokir fitur: 02 (F-02, input JSONL), 03 (F-03, lewat 02), 15 (F-16, memperluas langkah resolve), dan seluruh fitur hilir yang membaca graph.
- Dependensi eksternal: akses ke `dump/dataset_kasirnusa` (12 file wajib); Bun; tidak butuh Aura, API key, atau internet.
- Bisa mulai lebih dulu dengan mock: ya -- ETL hanya membaca file lokal, jadi bisa mulai sejak repo siap (J2) tanpa menunggu Aura.

## 8. Cara Uji
| Acceptance criteria | Cara uji | Otomatis/Manual |
| --- | --- | --- |
| 12 file → semua baris lolos `zod` atau tercatat alasannya | Jalankan `bun run etl`; cek untuk tiap file sumber = lolos + gagal di `quality-report.json`. Jalur error: sisipkan baris rusak di salinan uji → muncul di laporan, ETL tidak crash. | Otomatis (`bun test`) + manual baca laporan |
| ±7.440 `UsageBulan` | Hitung baris `UsageBulan` di `nodes.jsonl` | Otomatis |
| `template=true` pada 318 baris | Hitung interaksi `template=true` di `nodes.jsonl` (harus 318 dari 350) | Otomatis |
| Konflik CRM vs kontrak → nilai kontrak | Tes unit pada fungsi rekonsiliasi dengan sepasang nilai berbeda; periksa daftar konflik di laporan | Otomatis |
| (tambahan teknis) ID unik global | Gandakan satu ID di fixture → ETL berhenti dengan error | Otomatis |
| (tambahan teknis) Deterministik | Jalankan ETL dua kali, `diff` JSONL kosong | Manual |

## 9. Asumsi, Konflik & Risiko
- ⚠️ ASUMSI: total task 5,25 jam vs estimasi PRD 3,5 jam (+50%, >25%). Alasan: 12 sumber + zod + emit sekitar 16 tipe relasi fakta + laporan kualitas lebih besar dari 3,5 jam; PRD A4 sendiri menyebut effort nyata bisa 1,5–2×. -- cara validasi: bandingkan jam nyata di J5 (PRD §8 A4); bila meleset, pangkas T01-07/T01-08 menjadi minimum.
- ⚠️ ASUMSI: daftar 12 file wajib disusun dari nama yang disebut di Rencana Teknis (`crm_accounts`, `crm_contacts`, `contact_employment_history`, `employees`, `outlets`, `product_usage_daily`, `interactions`, `support_tickets`, `bugs`, `contracts_billing`, `crm_deals`, `decision_log`); Brief §3.3 tidak tersedia untuk saya. -- cara validasi: cocokkan dengan isi `dump/dataset_kasirnusa` di T01-01.
- ⚠️ ASUMSI: nama kolom dan tipe (`mode_offline_aktif`, `transaksi_offline_tersinkron`, `batas_outlet_paket`, `membalas_id`, `fitur_terkait`, `versi_terdampak`) diambil dari sketsa Rencana Teknis yang belum dijalankan. -- cara validasi: periksa header CSV di T01-02.
- ⚠️ ASUMSI: Rencana Teknis Langkah 5 menyebut "45 akun", sedangkan PRD menyebut 40 akun (+ prospek P01–P05 mungkin ada di `crm_accounts`). Diasumsikan 45 = 40 pelanggan + 5 prospek. -- cara validasi: hitung baris `crm_accounts` dan pisahkan menurut tipe di T01-02; teruskan angka final ke 02.
- ⚠️ ASUMSI: pemetaan `GNode.sumber` (`crm`/`interaksi`/`usage`/`tiket`/`kontrak`/`keputusan`/`turunan`) per file belum tertulis (mis. `outlets`, `bugs`). Dipakai: `crm_*`, `employees`, `contact_employment_history`, `outlets` → `crm`; `bugs` → `tiket`; `crm_deals` → `crm`. -- cara validasi: konfirmasi dengan Tegar saat fixture F-12 dicocokkan (warna node per sumber).
- ⚠️ ASUMSI: aturan "isi identik ≥5 kali" (Rencana) menghasilkan tepat 318 baris template seperti angka PRD. -- cara validasi: hitung di T01-04; bila beda, selidiki normalisasi spasi/huruf sebelum menyesuaikan ambang.
- ⚠️ ASUMSI: rekonsiliasi CRM vs kontrak mencakup field yang sama-sama ada di `crm_accounts` dan `contracts_billing` (mis. nilai tahunan, tanggal renewal); daftar field belum tertulis. -- cara validasi: inventaris field bersama di T01-03.
- ⛔ KONFLIK (K-A): repo sudah punya Prisma (`prisma/schema.prisma`, `prisma.config.ts`, `src/lib/db.ts`; commit a5d933a) dan `.env.example` berisi `DATABASE_URL`, `DIRECT_URL`, `SUPABASE_*`; PRD §9 dan Rencana Teknis §2.3 menyatakan Prisma/Supabase tidak dipakai -- dipakai sementara: ikuti PRD (ETL tidak menyentuh Prisma/Supabase); keputusan menghapus/mempertahankan file Prisma ada di 00.
- ⛔ KONFLIK: nama flag template -- PRD F-01 menulis `template=true`, Rencana Teknis Langkah 4 menulis `is_template: true` -- dipakai sementara: `template` (PRD). File lain (03, 04, 16) harus memakai nama yang sama.
- 🔁 USULAN PERUBAHAN: tidak ada.
- Risiko: data kotor yang belum terdeteksi (artefak sintetis X6) memecah validasi -- mitigasi/fallback: `zod` longgar untuk field informasional + catat ke laporan, jangan membuang baris.
- Risiko: memori laptop sempit (±1,8 GB bebas, Rencana Teknis §3.1 Langkah 13) saat memproses 226.300 baris usage -- mitigasi/fallback: agregasi streaming per outlet-bulan (file terbesar 7,7 MB, jadi risiko rendah).
- Risiko: tipe `papaparse` memerlukan paket tipe terpisah -- mitigasi/fallback: bila typecheck gagal, ajukan 🔁 USULAN PERUBAHAN (jangan menambah paket diam-diam).

## 10. Definition of Done
- [ ] Semua acceptance criteria di section 3 lolos uji di section 8
- [ ] Semua task di section 6 selesai, atau sudah dipindah secara eksplisit
- [ ] Lint, typecheck, dan build lulus (script `typecheck` belum ada di `package.json` -- ditambahkan oleh 00)
- [ ] Tidak ada secret yang di-hardcode; konfigurasi lewat environment variable (fitur ini tidak memakai env var)
- [ ] Implementasi sesuai kontrak dan skema TDD, tanpa perubahan yang tidak tercatat
- [ ] UI di jalur demo punya tampilan loading, kosong, dan error (tidak berlaku: fitur non-UI)
- [ ] Sudah dicek di lingkungan deploy (tidak berlaku: ETL dijalankan dari laptop, bukan di Vercel)
- [ ] PR sudah direview dan di-merge, lalu status di header file diperbarui
- [ ] `quality-report.json` sudah dibaca Adrian dan tidak ada baris hilang tanpa alasan; JSONL deterministik (dua run identik)
