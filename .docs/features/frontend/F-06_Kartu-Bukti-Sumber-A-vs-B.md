# 12 -- Kartu bukti "Sumber A vs Sumber B"
> ID PRD: F-06 · Prioritas: Must · Penanggung jawab: Tegar (Frontend) · Estimasi: 1 jam-orang (PRD) · Status: Belum dimulai

## 1. Ringkasan Fitur
- Apa: kartu di panel samping penampil graph yang menampilkan ≥2 catatan dari sumber berbeda berdampingan (kolom Sumber A dan Sumber B), lengkap dengan nama file, ID, dan tanggal -- contoh utama: "champion tercatat di CRM" vs "riwayat kerja: pindah ke P01" untuk C01.
- Untuk siapa: Bima (Account Manager) -- menjelaskan risiko ke klien dengan fakta dari dua catatan yang bertentangan; Laras -- melihat dasar tiap temuan.
- Peran di ★ jalur demo utama: langkah 3 (klik node champion → kartu "CRM vs Riwayat kerja").

## 2. Acuan PRD & TDD
- PRD: §3 kasus penggunaan 1 (★), §6 F-06 dan F-12 (kriteria kedua: panel menampilkan properti + kartu F-06), §7 (J7–10 F-06 kartu bukti, panel F-12), §9 (jalur demo langkah 3).
- TDD (acuan sementara = Rencana Teknis): §1.3 Langkah 10 (klik node → `Sheet` berisi properti dan `source_file`/`source_id`), Langkah 8 (relasi di payload membawa `source_file`), Langkah 3 aturan pemodelan 3 (setiap node dan relasi membawa `source_file` + `source_id`), §2.1 (shadcn `Card`, `Badge`, `Sheet`). Rencana Teknis tidak memiliki entri fitur "kartu A vs B"; kontrak datanya tidak tertulis (lihat section 9).
- Keputusan yang dikunci:
  - Kartu tampil sebagai panel samping F-12, bukan halaman terpisah.
  - Setiap record menampilkan nama file (`source_file`), ID (`source_id`), dan tanggal.
  - Data kartu berasal dari `GraphPayload` yang sama dengan viewer; tidak ada endpoint baru.

## 3. User Stories & Acceptance Criteria
- User story: Sebagai Bima, saya ingin melihat dua catatan dari sumber berbeda yang saling bertentangan berdampingan, agar saya bisa menjelaskan risiko ke klien dengan fakta.
- Acceptance criteria:
  - Diberikan satu temuan, ketika kartu dibuka, maka tampil ≥2 record dari sumber berbeda, lengkap dengan nama file, ID, dan tanggal.
  - Diberikan C01, ketika kartu champion dibuka, maka CRM (champion tercatat) tampil berdampingan dengan riwayat kerja (pindah ke P01).
  - Kartu tampil sebagai panel samping F-12, bukan halaman terpisah.
- Kriteria teknis tambahan:
  - (tambahan teknis) "Sumber berbeda" diukur dengan `source_file` berbeda; relasi turunan (`derived: true`) tidak dihitung sebagai sumber.
  - (tambahan teknis) Bila node yang diklik hanya punya satu sumber, panel tetap menampilkan properti dan keterangan "hanya satu sumber"; kartu tidak dipaksa tampil.
  - (tambahan teknis) Record tanpa tanggal atau `source_id` tampil dengan "—", bukan error.

## 4. Ruang Lingkup Fitur
- Termasuk:
  - Fungsi pengelompok record terkait sebuah node menurut `source_file` (hanya sumber primer), komponen kartu dua kolom, pemasangan di slot panel F-12, dan verifikasi kartu champion C01.
- Tidak termasuk:
  - Panel samping, viewer, node/edge kustom, dan properti node → 11 (F-12); API/`GraphPayload` → 07 (F-08).
  - Kartu tindakan retensi (F-09), penjelasan akun aman (F-07), dan perbandingan "Dashboard vs Temuan" (F-05, F-11).
  - Penilaian semantik "bertentangan" oleh backend (lihat 🔁 USULAN PERUBAHAN di section 9).
- Pengganti sementara: fixture `GraphPayload` C01 dari 00 (T00-10) -- wajib memuat `props.source_file` dan `props.source_id` pada node dan relasi.

## 5. API, Data & Komponen yang Disentuh
| Jenis | Nama | Aksi | Acuan TDD |
| --- | --- | --- | --- |
| Komponen FE | Kartu "Sumber A vs Sumber B" (shadcn `Card`, `Badge`) | Buat | PRD F-06 |
| Modul FE | Fungsi pengelompok record per `source_file` | Buat | PRD F-06 (turunan dari Rencana Teknis Langkah 3 aturan 3) |
| Komponen FE (milik 11) | Panel samping `Sheet` dan slot kartu | Pakai | Rencana Teknis Langkah 10 |
| Tipe | `GraphPayload`, `GNode`, `GEdge`, `Sumber` di `src/types/graph.ts` | Pakai | Rencana Teknis Langkah 3 |
| Properti graph | `source_file`, `source_id` pada node dan relasi | Pakai | Rencana Teknis Langkah 3 aturan 3, Langkah 8 |
| Endpoint (milik 07) | `GET /api/evidence?akun=&sinyal=` | Pakai (lewat 11) | PRD F-08 |
| Data sementara | Fixture `GraphPayload` C01 dari 00 (T00-10) | Pakai | PRD §5 |

## 6. Breakdown Task Implementasi
| ID | Task | Layer | Estimasi (jam) | Bergantung pada | Output terverifikasi |
| --- | --- | --- | --- | --- | --- |
| T12-01 | Fungsi murni: dari `GraphPayload` + node terpilih, kumpulkan record (node itu sendiri dan relasi yang menyentuhnya), kelompokkan per `source_file` (abaikan `derived: true`), urut sesuai kemunculan di payload; grup pertama = Sumber A, kedua = Sumber B, sisanya "Sumber lain"; kembalikan `null` bila <2 grup. Tes `bun test`. | FE | 0,5 | 00 (T00-08, T00-10) | `bun test` pada fixture C01: node champion (K017) → 2 grup dengan `source_file` berbeda; node interaksi bersumber tunggal → `null`; record tanpa tanggal/`source_id` → "—" (jalur error). **bisa paralel** |
| T12-02 | Komponen kartu dua kolom: judul kolom Sumber A / Sumber B, tiap record menampilkan tipe + ujung lain, nama file, ID, dan tanggal; label `Badge` memakai warna sumber yang sama dengan legenda viewer 11; "Sumber lain" sebagai daftar ringkas. | FE | 0,75 | T12-01 | Dengan data hasil T12-01 fixture C01 kartu menampilkan dua kolom berdampingan dengan nama file, ID, tanggal; layout tidak pecah pada lebar panel `Sheet`. **bisa paralel** |
| T12-03 | Pasang kartu di slot panel samping F-12: tampil bila T12-01 mengembalikan ≥2 grup; selain itu tampilkan properti saja + "hanya satu sumber". | FE | 0,5 | T12-02, 11 (F-12; T11-04) | Di viewer fixture, klik K017 → panel memuat properti dan kartu; klik node bersumber tunggal → tanpa kartu, tanpa error. |
| T12-04 | Integrasi dan verifikasi data nyata: buka `/akun/C01`, klik node champion → kolom A memuat catatan champion CRM, kolom B memuat riwayat kerja yang berujung ke P01; periksa nama file, ID, tanggal terisi dari payload `GET /api/evidence`; cek di URL produksi. | Test | 0,5 | 07 (F-08), 11 (F-12; T11-06), T12-03 | Tangkapan layar kartu C01 dari URL produksi; ketiga AC lolos; `source_file` kedua kolom berbeda. |
| T12-05 | **terblokir (🔁 USULAN PERUBAHAN)**: bila pasangan eksplisit disetujui, ganti pengelompokan generik dengan pasangan yang disediakan payload dan izinkan kartu dibuka per temuan (sinyal), bukan hanya per node. | FE | 0,5 | usulan di section 9 disetujui; 07 (F-08) | Kartu terbuka dari daftar sinyal C01 dan menampilkan pasangan yang ditentukan backend; node yang sama tanpa pasangan eksplisit kembali ke perilaku T12-01. |
| | **Total 2,75 jam, 2,25 jam di luar task terblokir (estimasi PRD: 1 jam)** -- selisih +175% (+125% tanpa T12-05), lihat ⚠️ ASUMSI di section 9. | | | | |

## 7. Dependensi
- Bergantung pada fitur: 07 (F-08) -- payload dengan `source_file`/`source_id` pada node dan relasi; 11 (F-12) -- panel samping, slot kartu, dan integrasi data nyata; (transitif) 00 -- tipe dan fixture.
- Memblokir fitur: tidak ada.
- Dependensi eksternal: Aura berisi graph C01 lengkap dengan provenance (hasil 01–03); tidak ada API key.
- Bisa mulai lebih dulu dengan mock: sebagian -- T12-01 dan T12-02 dengan fixture 00; T12-03 menunggu panel dari T11-04; T12-04 menunggu data nyata.

## 8. Cara Uji
| Acceptance criteria | Cara uji | Otomatis/Manual |
| --- | --- | --- |
| ≥2 record dari sumber berbeda dengan nama file, ID, tanggal | `bun test` pengelompok pada fixture C01 (2 grup; setiap record punya `source_file`, `source_id`); lihat kartu di viewer. Jalur error: node bersumber tunggal → `null`/"hanya satu sumber"; record tanpa tanggal → "—" | Otomatis (fungsi murni) + Manual |
| C01: CRM berdampingan dengan riwayat kerja (pindah ke P01) | Buka `/akun/C01`, klik node champion; kolom A = catatan champion CRM, kolom B = riwayat kerja ke P01 | Manual |
| Kartu sebagai panel samping F-12 | Pastikan kartu muncul di dalam `Sheet`, tidak ada rute baru; Esc menutup panel | Manual |
| (tambahan teknis) relasi turunan tidak dihitung sebagai sumber | Tes: payload dengan satu relasi `derived: true` + satu relasi sumber primer → `null` | Otomatis |

## 9. Asumsi, Konflik & Risiko
- ⚠️ ASUMSI: total task 2,75 jam vs estimasi PRD 1 jam (+175%; +125% tanpa task terblokir; >25%). Alasan: estimasi PRD hanya mencakup tampilan kartu; di sini ditambah logika pengelompokan karena tidak ada kontrak "pasangan bertentangan", tes, integrasi, dan verifikasi produksi. -- cara validasi: ukur jam nyata T12-01 dan T12-02 di J9.
- ⚠️ ASUMSI: payload tidak memuat pasangan "yang bertentangan"; kartu v1 mengelompokkan catatan yang menyentuh node terpilih per `source_file`, tanpa menilai pertentangan secara semantik. Untuk demo C01 pengelompokan ini sudah menghasilkan CRM vs riwayat kerja. -- cara validasi: T12-04 pada data nyata; bila kolom A/B salah urut atau tercampur, ajukan 🔁 di bawah.
- ⚠️ ASUMSI: "sumber berbeda" (AC pertama) diukur dengan `source_file` berbeda, bukan nilai `Sumber`, karena catatan champion (`crm_accounts`) dan riwayat kerja (`contact_employment_history`) kemungkinan sama-sama bernilai `crm`. -- cara validasi: periksa `source_file` dan `sumber` kedua record di payload C01.
- ⚠️ ASUMSI: `source_file`/`source_id` dan properti tanggal (`mulai`/`selesai`/`sejak`/`tanggal`) berada di `props` node/relasi dan fixture 00 memuatnya; AC pertama menyebut "temuan" sedangkan AC F-12 memicu kartu dari klik node -- v1 membuka kartu dari node yang terlibat dalam temuan. -- cara validasi: koordinasi dengan Tegar (T00-10) dan Dio (07).
- ⚠️ ASUMSI: nama file dan komponen FE belum ditetapkan sumber mana pun; urutan Sumber A/B mengikuti urutan kemunculan di payload dari 07. -- cara validasi: tinjau di PR T12-02.
- ⛔ KONFLIK (K-C): PRD F-08 mensyaratkan `GET /api/evidence?akun=&sinyal=`; Rencana Teknis Langkah 8 memakai `getAccountEvidence(id, kode?)` tanpa REST -- dipakai sementara: data kartu diambil dari payload yang sama dengan viewer 11 (yang memakai keduanya); AC mengikuti PRD.
- 🔁 USULAN PERUBAHAN: tambahkan bidang opsional pada `GraphPayload` (mis. `pasangan?: { sinyal: string; a: string; b: string }[]`, rujukan ke `key` node/relasi) yang diisi 07 dari `fakta`/`bukti_ids` sinyal, agar kartu bisa dibuka per temuan dan pasangan yang benar-benar bertentangan ditentukan backend. -- alasan: Rencana Teknis dan PRD tidak mendefinisikan kontrak data kartu; tanpa itu kartu hanya menebak pasangan dari provenance. Task bergantung: T12-05 (terblokir); mengubah `src/types/graph.ts` milik 00 dan 07.
- Risiko: pengelompokan generik menampilkan catatan yang tidak bertentangan -- mitigasi/fallback: judul netral, batasi kolom ke dua grup pertama + "Sumber lain"; untuk demo cukup kartu champion C01; ajukan 🔁 bila perlu.
- Risiko: `source_file` kosong pada payload -- mitigasi/fallback: jalur "—" di T12-01; sampaikan ke Dio (07) karena AC F-08 mensyaratkan `source_file` pada setiap relasi.
- Risiko: beban Tegar -- total FE Must 11,5 jam + 2,5 jam skeleton/fixture di 00 -- mitigasi: kartu adalah item pertama yang disederhanakan (tanpa "Sumber lain") bila J10 terlewat.

## 10. Definition of Done
- [ ] Semua acceptance criteria di section 3 lolos uji di section 8
- [ ] Semua task di section 6 selesai, atau sudah dipindah secara eksplisit (T12-05 boleh tetap terblokir dengan alasan tercatat)
- [ ] Lint, typecheck, dan build lulus
- [ ] Tidak ada secret yang di-hardcode; konfigurasi lewat environment variable
- [ ] Implementasi sesuai kontrak dan skema TDD, tanpa perubahan yang tidak tercatat
- [ ] UI di jalur demo punya tampilan loading, kosong, dan error (kasus node bersumber tunggal dan record tanpa tanggal)
- [ ] Sudah dicek di lingkungan deploy (kartu champion C01 di URL produksi)
- [ ] PR sudah direview dan di-merge, lalu status di header file diperbarui
- [ ] Kartu champion C01 menampilkan nama file, ID, dan tanggal pada kedua kolom
