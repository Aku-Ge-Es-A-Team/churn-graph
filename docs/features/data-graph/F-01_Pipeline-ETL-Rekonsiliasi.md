# 01 -- Pipeline ETL + rekonsiliasi
> ID PRD: F-01 · Prioritas: Must · Penanggung jawab: Adrian (Data Graph) · Estimasi: 3,5 jam-orang (PRD) · Status: Implementasi selesai dan terverifikasi lokal (typecheck, lint, bun test, next build); menunggu review PR

## 1. Ringkasan Fitur
- Apa: skrip `bun run etl` (`scripts/etl/index.ts`) membaca 14 berkas (13 wajib Brief §3.1 + `crm_deals`, lihat section 9), memvalidasi dengan `zod`, membersihkan dan merekonsiliasi nilai, mengagregasi usage harian menjadi `UsageBulan`, lalu menulis `data/build/nodes.jsonl`, `data/build/edges.jsonl`, dan `data/build/quality-report.json`.
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
$1 **Status: selesai** -- 14 berkas ada di `data/raw/`; jumlah baris per berkas tercatat di header `scripts/etl/index.ts`. |
$1 **Status: selesai** -- `extract.ts` + `schemas.ts`; 14 berkas: sumber = lolos + gagal, 0 gagal pada data asli (226.300 baris usage diproses streaming). |
$1 **Status: selesai** -- `clean.ts`; 0 konflik akun↔kontrak, 7 selisih deal↔kontrak (semua terjelaskan diskon); tes di `tests/etl/clean.test.ts`. |
$1 **Status: selesai** -- 318/350 template; 1 email tak terselesaikan (`rina.hapsari@kopilintas.co.id`, 6 interaksi). |
$1 **Status: selesai** -- 7.440 `UsageBulan`; T0531/T0600/T0636 terdeteksi (tiket 4.12, outlet offline tidak pernah 4.12 di usage); C03 offline 8.056 → 926 → 887. |
$1 **Status: selesai** -- 9.386 node, 10.266 relasi fakta; ID unik; dua run → berkas identik (diuji). |
$1 **Status: selesai** -- `quality-report.json` memuat per-berkas, konflik, template, email, versi tiket vs usage, champion usang, kecukupan jalur bukti. |
$1 **Status: selesai** -- `tests/golden/etl.test.ts` (19 tes) + `tests/etl/clean.test.ts` (22 tes); jalur error: baris rusak, kolom hilang, berkas hilang, ID ganda. |
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
- ✅ KEPUTUSAN (K-A, 2026-10-09, Adrian): Prisma + Supabase dihapus dari repo; penyimpanan graph hanya Neo4j AuraDB Free (PRD §9, Rencana Teknis §2.3). Fitur ini tidak memakai Prisma/Supabase.
- ⛔ KONFLIK: nama flag template -- PRD F-01 menulis `template=true`, Rencana Teknis Langkah 4 menulis `is_template: true` -- dipakai sementara: `template` (PRD). File lain (03, 04, 16) harus memakai nama yang sama.
- 🔁 USULAN PERUBAHAN: tidak ada.
- Risiko: data kotor yang belum terdeteksi (artefak sintetis X6) memecah validasi -- mitigasi/fallback: `zod` longgar untuk field informasional + catat ke laporan, jangan membuang baris.
- Risiko: memori laptop sempit (±1,8 GB bebas, Rencana Teknis §3.1 Langkah 13) saat memproses 226.300 baris usage -- mitigasi/fallback: agregasi streaming per outlet-bulan (file terbesar 7,7 MB, jadi risiko rendah).
- Risiko: tipe `papaparse` memerlukan paket tipe terpisah -- mitigasi/fallback: bila typecheck gagal, ajukan 🔁 USULAN PERUBAHAN (jangan menambah paket diam-diam).

- ✅ KEPUTUSAN (2026-10-09, Adrian): (1) bentuk keluaran ETL mengikuti Rencana Teknis Langkah 3 (`key`, `sumber`, `from`/`to`, `source_file`, `source_id`) dan didefinisikan sendiri di `scripts/etl/types.ts`; draf kontrak Dio di `src/types/graph.ts` TIDAK dipakai untuk keluaran ETL (adaptasi ke kontrak itu menjadi urusan loader/F-02). (2) 14 berkas diproses: 13 wajib Brief §3.1 + `crm_deals`; `feature_usage_monthly.csv` dan `decision_log.xlsx` dilewati (menutup K1). (3) `interactions.json` dibaca sebagai JSON Lines (K2); penanda template bernama `template` (K3). (4) Parsing CSV dengan `papaparse` 5.7.0 yang sudah terpasang.
- 🔁 USULAN PERUBAHAN: (a) `scripts/etl/papaparse.d.ts` -- deklarasi tipe minimal sebagai pengganti `@types/papaparse` (tanpa dependensi baru); (b) `tests/etl/clean.test.ts` selain `tests/golden/etl.test.ts`; (c) relasi `Akun-[:MEMBUKA_TIKET]->Tiket` (props `tanpa_outlet: true`) untuk 3 tiket tanpa `outlet_id` -- tabel relasi hanya menyebut Outlet/Kontak sebagai asal; tanpa ini ketiga tiket integrasi C01 terisolasi dari akunnya; (d) env opsional `SNAPSHOT_DATE` (default 2026-10-01) untuk menentukan champion usang -- dokumen menyebut ETL tanpa env var.
- ⚠️ ASUMSI: baseline `UsageBulan` = rata-rata HARIAN transaksi Okt–Des 2025 per outlet (bukan jumlah bulanan, karena panjang bulan beda); `delta_pct` = (rata harian bulan itu − baseline) / baseline × 100; offline dihitung sama dari hari yang berisi angka. Ambang anomali 25% tetap milik F-03. -- cara validasi: F-03 T03-02 mengonfirmasi −34% s.d. −36% (sudah cocok untuk 6 outlet C03).
- ⚠️ ASUMSI: ID turunan `ORG-<slug nama>` (13 organisasi) dan `KOMP-<slug nama>` (KasirPro); "PT Teknologi Kasir Prima" = KasirPro masih inferensi dan TIDAK digabung. `sumber`: `releases`, `features`, `bugs` → `tiket` (union tidak punya nilai khusus produk). `GEdge.key` = `TIPE:dari->ke` + pembeda (`mulai` untuk riwayat jabatan, `peran` untuk TERLIBAT_DI); kunci ganda menghentikan ETL.
- ⚠️ ASUMSI: `MEMBALAS` tidak di-emit (milik F-03); `membalas_id` disimpan sebagai properti Interaksi. `CHAMPION_DARI {klaim:'crm'}` apa adanya; pertentangannya dengan riwayat kerja ditandai di `champion_crm_usang` (bahan R1 di F-04), bukan dikoreksi.
- Nama berkas interaksi: dataset resmi memakai `interactions.jsonl` (sama dengan README); ETL membaca `interactions.jsonl` lebih dulu dan menerima `interactions.json` sebagai cadangan (isi keduanya identik pada dataset ini). Nama yang dipakai tercatat di `source_file` setiap node/relasi interaksi.
- Fakta hasil run (menggantikan angka lama di dokumen): selisih deal↔kontrak = 7 (bukan 8 seperti perkiraan awal); 31 tiket mencatat versi yang tidak pernah dipakai outletnya di usage, 3 di antaranya di outlet offline di luar C03/C05 (T0531, T0600, T0636); 99 tiket lain berbeda versi pada tanggal tiket (rollout bertahap) dan hanya dihitung.

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
