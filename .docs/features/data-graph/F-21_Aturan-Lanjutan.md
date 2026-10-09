# 20 -- Aturan lanjutan R5/R6 dll.
> ID PRD: F-21 · Prioritas: Should #7 · Penanggung jawab: Adrian (Data Graph) · Estimasi: 2 jam-orang (PRD) · Status: Belum dimulai

## 1. Ringkasan Fitur
- Apa: menambah aturan sinyal di luar v1 sebagai berkas `cypher/signals/*.cypher` baru yang memakai runner dan kontrak F-04: R5 (Angka), R6 (Nilai), dan decision maker baru (K134 Yoga), tanpa merusak golden test F-04.
- Untuk siapa: Laras -- penilaian risiko lebih lengkap (decision maker baru, diskon yang tak sesuai kontrak).
- Peran di ★ jalur demo utama: bukan bagian jalur demo; memperkaya sinyal di Radar dan jalur bukti.

## 2. Acuan PRD & TDD
- PRD: §6 F-21 (Should #7), §7 (J13–14,5), §8 (A13 pemetaan kode sinyal), urutan pemotongan §7 butir 2.
- TDD (acuan sementara = Rencana Teknis): §1.3 Langkah 7 (kontrak detektor, runner, golden test), §3.4 (daftar "lanjutan" F05 Rencana: decision maker baru, klaster tiket tanpa bug, informasi internal yang tidak mengalir).
- Keputusan yang dikunci:
  - Aturan baru mengikuti kontrak F-04 `{akun, kode, bobot, bukti_ids, fakta, sejak}` dan runner `scripts/signals.ts`.
  - Kode sinyal ditetapkan di 04 (F-04); fitur ini tidak mengarang kode baru: `ANGKA_TAK_SESUAI` (R5), `NILAI_TAK_SESUAI` (R6), `DECISION_MAKER_BARU`.
  - Golden test F-04 harus tetap lulus.
  - Tidak ada ID akun yang di-hardcode (K134 hanya muncul di tes, bukan di Cypher).

## 3. User Stories & Acceptance Criteria
- User story: Sebagai Laras, saya ingin sinyal tambahan seperti decision maker baru dan diskon yang tak sesuai kontrak, agar penilaian risiko lebih lengkap.
- Acceptance criteria:
  - Diberikan R5 (Angka) dan R6 (Nilai), ketika dijalankan, maka sinyalnya mengikuti kontrak F-04 dan golden test tetap lulus.
  - Diberikan K134 Yoga, ketika aturan decision maker baru dijalankan, maka sinyal muncul di akun terkait.
- Kriteria teknis tambahan:
  - (tambahan teknis) Setiap aturan satu berkas `.cypher` dengan `$snapshot`; `bukti_ids` memuat akun dan semua node di pola.
  - (tambahan teknis) Golden regresi: C01 peringkat/sinyal v1, C02 dan C06 tanpa sinyal negatif, tidak berubah setelah aturan baru ditambahkan.
  - (tambahan teknis) Pindai berkas baru: tidak ada literal ID akun (tes F-04 yang sama).

## 4. Ruang Lingkup Fitur
- Termasuk:
  - Penetapan definisi R5 (Angka), R6 (Nilai), dan "decision maker baru" bersama Dio (T20-01).
  - Tiga berkas aturan baru di `cypher/signals/` dan tes tambahan di `tests/golden/signals.test.ts`.
  - Kalibrasi bobot dan regresi golden.
- Tidak termasuk:
  - Runner, kontrak, 8 aturan v1, Z1–Z3 → 04 (F-04).
  - "Klaster tiket tanpa bug" dan "informasi internal yang tidak mengalir" dari daftar lanjutan Rencana Teknis: yang pertama sudah masuk v1 (`TIKET_BUG_TAK_TERTAUT`, R3), yang kedua ditangani 16 (F-17, `JANJI_INTERNAL_VS_EKSTERNAL`).
  - Skor/level → 05 (F-05); UI → 10 dan 11.
- Pengganti sementara: tidak ada.

## 5. API, Data & Komponen yang Disentuh
| Jenis | Nama | Aksi | Acuan TDD |
| --- | --- | --- | --- |
| Data (Cypher) | `cypher/signals/*.cypher` (3 berkas baru: angka, nilai, decision maker baru) | Buat | Rencana Teknis §1.3 Langkah 7 |
| Modul BE | `scripts/signals.ts` | Pakai | Rencana Teknis §1.3 Langkah 7 |
| Tabel (node graph) | `:Sinyal`, `PADA`, `BUKTI` | Pakai | Rencana Teknis §1.3 Langkah 7 |
| Tabel (node graph) | `:Kontak`, `:Akun`, `:Outlet`, `:Kontrak`, `:Keputusan` | Pakai | Rencana Teknis §1.3 Langkah 3 |
| Relasi | `BEKERJA_DI`, `MEMILIKI`, `DIDASARKAN_PADA`, `MENYETUJUI` | Pakai | Rencana Teknis §1.3 Langkah 3 |
| Env var | `NEO4J_URI`, `NEO4J_USERNAME`, `NEO4J_PASSWORD`, `SNAPSHOT_DATE` | Pakai | Rencana Teknis §1.3 Langkah 2, 12 |
| Tes | `tests/golden/signals.test.ts` | Ubah | Rencana Teknis §1.3 Langkah 7 |

## 6. Breakdown Task Implementasi
| ID | Task | Layer | Estimasi (jam) | Bergantung pada | Output terverifikasi |
| --- | --- | --- | --- | --- | --- |
| T20-01 | Kunci definisi R5 (Angka), R6 (Nilai), dan decision maker baru (jabatan, batas "baru") bersama Dio; tulis tes merah untuk K134. | Test | 0,25 | 04 (F-04) | Tiga definisi tertulis di komentar berkas aturan; tes K134 ada dan gagal. |
| T20-02 | Aturan R5 `ANGKA_TAK_SESUAI`: angka yang tidak cocok antar sumber (mis. outlet aktif vs `batas_outlet_paket`; definisi di T20-01). | DB | 0,5 | T20-01 | `bun run signals` menghasilkan sinyal sesuai kontrak; tidak ada ID hard-coded. |
| T20-03 | Aturan R6 `NILAI_TAK_SESUAI`: nilai diskon/kontrak yang tidak sesuai keputusan di `decision_log` (mis. diskon di atas batas 15%, D-2025-02). | DB | 0,5 | T20-01 | Sinyal terbentuk untuk kasus yang disepakati di T20-01 dengan `bukti_ids` memuat Kontrak + Keputusan. |
| T20-04 | Aturan `DECISION_MAKER_BARU`: kontak berjabatan decision maker yang mulai `BEKERJA_DI` akun dalam jendela terbaru. | DB | 0,5 | T20-01 | Sinyal muncul di akun K134 Yoga; akun tanpa decision maker baru tidak mendapat sinyal. |
| T20-05 | Regresi dan kalibrasi: jalankan seluruh golden F-04, periksa akun non-fokus yang ikut tersorot, sesuaikan bobot/jendela. | Test | 0,5 | T20-02, T20-03, T20-04 | `bun run test:golden` hijau; C02 dan C06 tetap tanpa sinyal negatif. |
| | **Total 2,25 jam (estimasi PRD: 2 jam)** -- selisih +12,5%, di bawah ambang 25%. | | | | |

## 7. Dependensi
- Bergantung pada fitur: 04 (F-04) -- runner, kontrak, golden, dan tabel kode sinyal.
- Memblokir fitur: tidak ada.
- Dependensi eksternal: Aura aktif; konfirmasi Dio atas definisi R5/R6 (A13).
- Bisa mulai lebih dulu dengan mock: tidak -- aturan membutuhkan graph dan runner F-04.

## 8. Cara Uji
| Acceptance criteria | Cara uji | Otomatis/Manual |
| --- | --- | --- |
| R5 dan R6 mengikuti kontrak F-04 dan golden tetap lulus | Tes bentuk kontrak untuk sinyal baru; jalankan seluruh `tests/golden`. Jalur error: aturan yang mengembalikan kolom kurang membuat runner gagal | Otomatis |
| K134 Yoga → sinyal di akun terkait | Assert sinyal `DECISION_MAKER_BARU` pada akun tempat K134 bekerja; jalur error: akun tanpa decision maker baru tidak mendapat sinyal | Otomatis |
| (tambahan teknis) tanpa ID hard-coded | Pindai `cypher/signals/*.cypher` | Otomatis |

## 9. Asumsi, Konflik & Risiko
- ⚠️ ASUMSI (A13): arti R5 (Angka) dan R6 (Nilai) tidak didefinisikan di PRD/Rencana Teknis. Tebakan dari cerita F-21 ("diskon yang tak sesuai kontrak") dan Rencana Teknis pertanyaan 12 (batas outlet paket): R6 = nilai diskon/kontrak tidak sesuai keputusan; R5 = angka antar sumber tidak sesuai. -- cara validasi: konfirmasi ke Dio di T20-01.
- ⚠️ ASUMSI: pengertian "decision maker" dan "baru" (jabatan dan jendela hari) belum tertulis; K134 Yoga diasumsikan CFO baru C01 (PRD §1). -- cara validasi: periksa data K134 di T20-01.
- ⚠️ ASUMSI: total 2,25 jam vs PRD 2 jam (+12,5%, di bawah ambang). -- cara validasi: ukur di J13.
- ⛔ KONFLIK: daftar aturan lanjutan -- Rencana Teknis §3.4: decision maker baru, klaster tiket tanpa bug, informasi internal yang tidak mengalir; PRD F-21: R5, R6, decision maker baru -- dipakai sementara: PRD; dua item Rencana sudah dicakup 04 (R3) dan 16 (F-17).
- ✅ KEPUTUSAN (K-A, 2026-10-09, Adrian): Prisma + Supabase dihapus dari repo; penyimpanan graph hanya Neo4j AuraDB Free (PRD §9, Rencana Teknis §2.3). Fitur ini tidak memakai Prisma/Supabase.
- 🔁 USULAN PERUBAHAN: tidak ada.
- Risiko: aturan baru mengubah peringkat golden (C02/C06 tersorot) -- mitigasi/fallback: T20-05; bila mengganggu, nonaktifkan berkas aturan (pindahkan keluar `cypher/signals/`) dan jadikan fitur ini dipotong (PRD §7).
- Risiko: definisi R5/R6 meleset dari maksud Dio -- mitigasi/fallback: konfirmasi T20-01 sebelum menulis Cypher.

## 10. Definition of Done
- [ ] Semua acceptance criteria di section 3 lolos uji di section 8
- [ ] Semua task di section 6 selesai, atau sudah dipindah secara eksplisit
- [ ] Lint, typecheck, dan build lulus
- [ ] Tidak ada secret yang di-hardcode; konfigurasi lewat environment variable
- [ ] Implementasi sesuai kontrak dan skema TDD, tanpa perubahan yang tidak tercatat
- [ ] UI di jalur demo punya tampilan loading, kosong, dan error (tidak berlaku: fitur non-UI)
- [ ] Sudah dicek di lingkungan deploy (dijalankan terhadap Aura sebenarnya)
- [ ] PR sudah direview dan di-merge, lalu status di header file diperbarui
- [ ] Golden test F-04 tetap hijau dan definisi R5/R6 dicatat di tabel kode sinyal 04
