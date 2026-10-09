# 15 -- Resolver email lama → kontak
> ID PRD: F-16 · Prioritas: Should #2 · Penanggung jawab: Adrian (Data Graph) · Estimasi: 1,5 jam-orang (PRD) · Status: Belum dimulai

## 1. Ringkasan Fitur
- Apa: memetakan alamat email di interaksi yang tidak cocok exact-match ke Kontak/Karyawan yang benar pada tanggal interaksi, membentuk `ALAMAT_EMAIL_DARI {berlaku_sampai, metode, confidence}`, dan menaruh yang ambigu di `data/aliases.csv` tanpa menebak.
- Untuk siapa: Bima -- email pamit champion tersambung ke akunnya sehingga jalur bukti C01 lengkap.
- Peran di ★ jalur demo utama: mendukung langkah 2 (jalur bukti C01: champion pindah ke P01); I0290 masuk jalur bukti.

## 2. Acuan PRD & TDD
- PRD: §5 (pengganti sementara: `aliases.csv` manual bila F-16 dipotong), §6 F-16 (Should #2), §7 (urutan pemotongan: F-16 dipotong paling akhir kedua sebelum F-15).
- TDD (acuan sementara = Rencana Teknis): §1.3 Langkah 4 (resolusi email sadar waktu), §3.4 ("F02 Resolusi identitas temporal" di Rencana = F-16 di PRD), §1.3 Langkah 3 (tabel relasi `ALAMAT_EMAIL_DARI`, `TERLIBAT_DI`).
- Keputusan yang dikunci:
  - Indeks email dibangun dari `crm_contacts` + `employees`; resolusi sadar waktu.
  - Email tak dikenal: local-part dicocokkan ke nama kontak, domain dicocokkan ke akun tempat kontak itu bekerja pada tanggal tersebut (domain akun diturunkan dari email kontak aktifnya).
  - Relasi `ALAMAT_EMAIL_DARI {berlaku_sampai, metode, confidence}` (turunan, `derived: true`).
  - Yang ambigu tidak ditebak: masuk `data/aliases.csv` untuk dicek manual.

## 3. User Stories & Acceptance Criteria
- User story: Sebagai Bima, saya ingin email dari alamat lama dikenali sebagai kontak yang benar, agar email pamit champion tersambung ke akunnya.
- Acceptance criteria:
  - Diberikan email `@kopilintas.co.id` milik Rina, ketika diresolusi, maka terbentuk `ALAMAT_EMAIL_DARI {confidence}` ke K017 dan I0290 masuk jalur bukti C01.
  - Diberikan email yang ambigu, ketika diproses, maka email itu masuk `aliases.csv` dan tidak ditebak.
- Kriteria teknis tambahan:
  - (tambahan teknis) Contoh Rencana: `rina.hapsari@kopilintas.co.id` → K017 sehingga email pamit I0290 tersambung ke jalur C01.
  - (tambahan teknis) Email yang berhasil diresolusi menghasilkan `TERLIBAT_DI` (peran pengirim/penerima/peserta) dari Kontak/Karyawan ke Interaksi.
  - (tambahan teknis) `metode` dan `confidence` terisi untuk setiap `ALAMAT_EMAIL_DARI`; hasil deterministik antar-run.

## 4. Ruang Lingkup Fitur
- Termasuk:
  - Inventaris email interaksi yang gagal exact-match (dari `quality-report.json` F-01).
  - Resolver di langkah `resolve` ETL (`scripts/etl/`): kecocokan nama + domain-pada-tanggal, `metode`, `confidence`.
  - Output `ALAMAT_EMAIL_DARI`, `TERLIBAT_DI`, dan `data/aliases.csv` untuk yang ambigu; integrasi ke `bun run etl`.
  - Tes bahwa I0290 terhubung ke K017 dan tampil di jalur bukti C01 setelah rebuild.
- Tidak termasuk:
  - Exact-match email dan pembacaan `aliases.csv` dasar → 01 (F-01).
  - Aturan `CHAMPION_KELUAR` → 04 (F-04); aturan itu memakai `OPTIONAL MATCH` interaksi sehingga I0290 muncul di `bukti_ids` tanpa perubahan aturan.
  - API/UI jalur bukti → 07 (F-08), 11 (F-12).
- Pengganti sementara: `data/aliases.csv` diisi manual bila F-16 dipotong (PRD §5).

## 5. API, Data & Komponen yang Disentuh
| Jenis | Nama | Aksi | Acuan TDD |
| --- | --- | --- | --- |
| Modul BE | `scripts/etl/` (langkah `resolve`) | Ubah | Rencana Teknis §1.3 Langkah 4, §2.4 |
| Data (file) | `data/aliases.csv` (⚠️ path persis tidak ditetapkan) | Buat / Ubah | PRD §5 |
| Data (file) | `data/build/nodes.jsonl`, `data/build/edges.jsonl`, `data/build/quality-report.json` | Ubah | Rencana Teknis §1.3 Langkah 4 |
| Tabel (node graph) | node alamat email (label `:Email`, lihat 🔁 USULAN PERUBAHAN) | Buat | Rencana Teknis §1.3 Langkah 3 (tabel relasi) |
| Relasi | `ALAMAT_EMAIL_DARI`, `TERLIBAT_DI` | Buat | Rencana Teknis §1.3 Langkah 3 |
| Tabel (node graph) | `:Kontak`, `:Karyawan`, `:Interaksi`, `:Akun` | Pakai | Rencana Teknis §1.3 Langkah 3 |
| Tes | `tests/golden/resolver.test.ts` (⚠️ nama berkas asumsi) | Buat | Rencana Teknis §1.3 Langkah 7 |

## 6. Breakdown Task Implementasi
| ID | Task | Layer | Estimasi (jam) | Bergantung pada | Output terverifikasi |
| --- | --- | --- | --- | --- | --- |
| T15-01 | Inventaris email di interaksi (`dari`/`ke`/`peserta`) yang gagal exact-match; kelompokkan per domain; rancang `metode` dan skala `confidence`. | BE | 0,5 | 01 (F-01) | Daftar email tak terselesaikan per domain + tabel `metode` → `confidence` di komentar modul resolver. |
| T15-02 | Resolver: cocokkan local-part ke nama kontak dan domain ke akun tempat kontak bekerja pada tanggal interaksi; hasilkan `ALAMAT_EMAIL_DARI {berlaku_sampai, metode, confidence}` dan `TERLIBAT_DI`. **Terblokir** sampai 🔁 USULAN PERUBAHAN (label node email) disetujui. | BE | 0,75 | T15-01 | `rina.hapsari@kopilintas.co.id` → K017 dengan `confidence`; `edges.jsonl` memuat `TERLIBAT_DI` K017 → I0290. |
| T15-03 | Tulis email ambigu ke `data/aliases.csv` (tidak ditebak) dan pastikan F-01 membacanya pada run berikutnya sebagai override manual. | BE | 0,25 | T15-02 | Email ambigu muncul di `aliases.csv`; tidak ada `ALAMAT_EMAIL_DARI` untuknya; isi manual di CSV terpakai pada run berikutnya. |
| T15-04 | Integrasi + tes: wire ke `bun run etl`; tes `resolver.test.ts` (K017/I0290, email ambigu tidak ditebak, deterministik); setelah `rebuild` pastikan `CHAMPION_KELUAR` C01 memuat I0290 di `bukti_ids`. **Terblokir** sama seperti T15-02. | Test | 0,5 | T15-03 | `bun test tests/golden/resolver.test.ts` hijau; setelah `bun run rebuild`, `bukti_ids` `CHAMPION_KELUAR` C01 memuat I0290. |
| | **Total 2,0 jam (estimasi PRD: 1,5 jam)** -- selisih +33%, lihat ⚠️ ASUMSI di section 9. | | | | |

## 7. Dependensi
- Bergantung pada fitur: 01 (F-01) -- indeks email dan `quality-report.json`.
- Memblokir fitur: 16 (F-17) -- `TERLIBAT_DI` dan klaim bergantung pada identitas yang benar.
- Dependensi eksternal: tidak ada API key. Uji integrasi akhir (K017/I0290 di `bukti_ids` C01) memerlukan 02, 03, 04 sudah berjalan (nomor lebih kecil, bukan pelanggaran urutan).
- Bisa mulai lebih dulu dengan mock: ya -- resolver diuji terhadap JSONL (tanpa Aura); hanya uji integrasi yang butuh graph.

## 8. Cara Uji
| Acceptance criteria | Cara uji | Otomatis/Manual |
| --- | --- | --- |
| Email `@kopilintas.co.id` Rina → K017, I0290 masuk jalur bukti C01 | Tes pada `edges.jsonl`: `ALAMAT_EMAIL_DARI` ke K017 dengan `confidence`; setelah rebuild, `bukti_ids` `CHAMPION_KELUAR` C01 memuat I0290 | Otomatis (`bun test`) |
| Email ambigu → `aliases.csv`, tidak ditebak | Sediakan email dengan dua kandidat kontak; pastikan masuk CSV dan tidak ada relasi | Otomatis |
| Jalur error: email tanpa kandidat sama sekali | Tidak membuat relasi, dicatat di `quality-report.json`, ETL tidak crash | Otomatis |
| (tambahan teknis) deterministik | Jalankan ETL dua kali → relasi identik | Manual |

## 9. Asumsi, Konflik & Risiko
- ⚠️ ASUMSI: total task 2,0 jam vs estimasi PRD 1,5 jam (+33%, >25%). Alasan: inventaris dan integrasi/tes belum dihitung eksplisit di PRD. -- cara validasi: ukur di J7; pangkas T15-01 bila ketat.
- ⚠️ ASUMSI: pola alamat lama dibentuk dari nama kontak + domain organisasi lama (contoh `rina.hapsari@kopilintas.co.id`); variasi lain di dataset belum diketahui. -- cara validasi: inventaris T15-01.
- ⚠️ ASUMSI: `confidence` berskala 0–1 seperti `0.8` di contoh `KANDIDAT_DISEBABKAN_OLEH`. -- cara validasi: sepakati dengan 03.
- ⚠️ ASUMSI: `TERLIBAT_DI` yang dibentuk dari email teresolusi memakai `peran` yang sama dengan relasi fakta (pengirim/penerima/peserta). -- cara validasi: cek konsistensi dengan F-01.
- ⛔ KONFLIK (K-A): repo sudah punya Prisma (`prisma/schema.prisma`, `src/lib/db.ts`) dan `.env.example` berisi `DATABASE_URL`, `SUPABASE_*`; PRD §9 dan Rencana Teknis §2.3 menyatakan keduanya tidak dipakai -- dipakai sementara: tidak memakai Prisma/Supabase; keputusan di 00.
- 🔁 USULAN PERUBAHAN: tambahkan label node alamat email (usul: `:Email`, `id` = alamat huruf kecil) ke daftar node Rencana Teknis Langkah 3 -- alasan: tabel relasi menyebut `ALAMAT_EMAIL_DARI` "Email lama → Kontak" tetapi label node asalnya tidak ditetapkan di Rencana Teknis maupun daftar label manifest. Task terblokir: T15-02, T15-04.
- Risiko: resolver menebak salah kontak -- mitigasi/fallback: ambigu masuk `aliases.csv`, tidak ditebak; `confidence` ditampilkan.
- Risiko: jadwal mepet -- mitigasi/fallback: fitur dipotong dan `aliases.csv` diisi manual (PRD §5); C01 tetap terdeteksi dari CRM + riwayat jabatan (Rencana Teknis §3.6).

## 10. Definition of Done
- [ ] Semua acceptance criteria di section 3 lolos uji di section 8
- [ ] Semua task di section 6 selesai, atau sudah dipindah secara eksplisit
- [ ] Lint, typecheck, dan build lulus
- [ ] Tidak ada secret yang di-hardcode; konfigurasi lewat environment variable
- [ ] Implementasi sesuai kontrak dan skema TDD, tanpa perubahan yang tidak tercatat
- [ ] UI di jalur demo punya tampilan loading, kosong, dan error (tidak berlaku: fitur non-UI)
- [ ] Sudah dicek di lingkungan deploy (dijalankan terhadap Aura sebenarnya)
- [ ] PR sudah direview dan di-merge, lalu status di header file diperbarui
- [ ] Keputusan label node email (🔁) tercatat di Rencana Teknis/PRD; I0290 terlihat di jalur bukti C01
