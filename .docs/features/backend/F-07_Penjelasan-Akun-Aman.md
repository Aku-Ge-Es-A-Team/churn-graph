# 06 -- Penjelasan akun aman / konsisten
> ID PRD: F-07 · Prioritas: Must · Penanggung jawab: Dio (Backend & AI) + Tegar (Frontend) · Estimasi: 0,5 jam-orang (PRD); total task 1,5 jam · Status: Belum dimulai

## 1. Ringkasan Fitur
- Apa: Penjelasan untuk akun yang tidak berisiko: status "konsisten", daftar aturan F-04 yang sudah dicek beserta nilainya, dan penjelasan penekan Z1 (mis. 9 tiket C02 adalah usulan fitur). Berlaku generik untuk semua akun, bukan hanya C01–C06.
- Untuk siapa: Bima (Account Manager) -- bisa menjawab "kenapa akun X tidak berisiko?" dengan bukti, bukan opini.
- Peran di ★ jalur demo utama: langkah 5 (C02 berstatus "konsisten" beserta alasannya). Juga mendukung pertanyaan juri tentang akun di luar C01–C06.

## 2. Acuan PRD & TDD
- PRD: §3 kasus penggunaan 4 ("kenapa C02 tidak berisiko?"), §1 (C02: 9 tiket usulan fitur, pemilik berencana 6 cabang), §6 F-07 & F-04 (Z1–Z3), §7 (J9–10), §9 jalur demo langkah 5.
- TDD (acuan sementara): Rencana Teknis §1.3 Langkah 7 (detektor, tiket `permintaan_fitur` tidak dihitung sebagai sinyal negatif), Langkah 8 (fungsi server dibaca Server Component `/akun/[id]`), Langkah 3 (node `:Tiket`, `:Sinyal`, relasi `PADA`/`BUKTI`), Langkah 10 (halaman `/akun/[id]`).
- Keputusan yang dikunci:
  - Penjelasan dibaca dari graph/sinyal (tanpa hardcode ID akun), generik untuk semua akun (PRD F-07 kriteria 3).
  - Kode aturan dan Z1–Z3 didefinisikan di 04 (F-04) saja; file ini merujuknya, tidak mengarang kode baru.
  - Status "konsisten" bila level akun = Aman menurut 05 (F-05) -- lihat ⚠️ ASUMSI di section 9.

## 3. User Stories & Acceptance Criteria
- User story: Sebagai Bima, saya ingin tahu mengapa sebuah akun dinilai aman, agar saya bisa menjawab "kenapa akun X tidak berisiko?".
- Acceptance criteria:
  - Diberikan akun tanpa temuan, ketika dibuka, maka tampil status "konsisten" + daftar aturan yang sudah dicek beserta nilainya.
  - Diberikan C02, ketika dibuka, maka 9 tiketnya dijelaskan sebagai usulan fitur (Z1).
  - Diberikan akun acak di luar C01–C06, ketika dibuka, maka penjelasan tetap muncul tanpa error.
- Kriteria teknis tambahan:
  - (tambahan teknis) Setiap tiket pada penjelasan Z1 menyertakan ID tiket sebagai bukti yang dapat diklik/ditelusuri.
  - (tambahan teknis) Akun yang tidak ada mengembalikan not-found yang bisa ditangani halaman, bukan 500.
  - (tambahan teknis) Seluruh 40 akun menghasilkan penjelasan tanpa melempar error.

## 4. Ruang Lingkup Fitur
- Termasuk: fungsi server penjelasan akun (status, daftar aturan dicek, penjelasan Z1 dengan ID tiket); panel FE "akun konsisten" di `/akun/[id]`; uji untuk C02, C06, dan seluruh 40 akun.
- Tidak termasuk: definisi/implementasi aturan R1–R8 dan Z1–Z3 (04, F-04); skor dan level (05, F-05); jalur bukti dan graph viewer (07, F-08; 11, F-12); kartu tindakan (08, F-09); halaman `/akun/[id]` skeleton (00).
- Pengganti sementara: fixture JSON penjelasan C02 untuk Tegar (dari fakta PRD §1: 9 tiket usulan fitur) sampai fungsi server siap; fixture tidak tampil di demo final.

## 5. API, Data & Komponen yang Disentuh
| Jenis | Nama | Aksi | Acuan TDD |
| --- | --- | --- | --- |
| Modul BE | Fungsi server penjelasan akun aman di `src/server/queries/` (nama file/fungsi ⚠️ ASUMSI, ditetapkan saat implementasi) | Buat | Rencana Teknis Langkah 8 |
| Modul BE | `getSignals` / `getRanking` di `src/server/queries/risk.ts` | Pakai | Rencana Teknis Langkah 7–8 |
| Modul BE | `src/server/neo4j.ts` (`readCypher`) | Pakai | Rencana Teknis Langkah 8 |
| Node/relasi | `:Akun`, `:Tiket` (properti `kategori`), `:Sinyal`, `PADA`, `BUKTI` | Pakai | Rencana Teknis Langkah 3, 7 |
| Komponen FE | Panel penjelasan di halaman `/akun/[id]` | Buat | Rencana Teknis Langkah 10 |
| Endpoint | Tidak ada endpoint baru; dibaca Server Component | -- | Rencana Teknis Langkah 8 |
| Env var | `NEO4J_URI`, `NEO4J_USERNAME`, `NEO4J_PASSWORD` | Pakai | Rencana Teknis Langkah 2 |

## 6. Breakdown Task Implementasi
| ID | Task | Layer | Estimasi (jam) | Bergantung pada | Output terverifikasi |
| --- | --- | --- | --- | --- | --- |
| T06-01 | Fungsi server penjelasan: tentukan status konsisten (level Aman dari 05), daftar kode aturan F-04 yang dicek dan statusnya per akun, serta penjelasan Z1 (query tiket `kategori = permintaan_fitur` untuk akun beserta ID tiket) | BE | 0,5 | 04 (F-04), 05 (F-05) | Pemanggilan untuk C02 mengembalikan status "konsisten", 9 ID tiket usulan fitur, dan daftar aturan dicek |
| T06-02 | Isi "nilai" per aturan yang dicek (angka yang diperiksa, mis. jumlah tiket Z1) | BE | 0,25 | T06-01, **terblokir** menunggu 🔁 USULAN PERUBAHAN (kontrak F-04 belum membawa nilai aturan yang tidak terpicu) | Setiap aturan pada respons membawa `nilai`; sebelum disetujui, daftar hanya memuat kode + status |
| T06-03 | Panel FE "akun konsisten": status, daftar aturan + nilai, daftar tiket Z1; state loading/error/not-found | FE (Tegar) | 0,5 | T06-01 (atau fixture) -- **bisa paralel** | Panel tampil di `/akun/C02` dengan fixture lalu data nyata; tidak ada error konsol |
| T06-04 | Uji: C02 (9 tiket Z1), C06, akun acak, dan sapuan seluruh 40 akun tanpa error; ID akun tidak ada → not-found | Test | 0,25 | T06-01, T06-03 | `bun test` hijau: 40 akun menghasilkan penjelasan; C02 mengembalikan 9 tiket; ID palsu → not-found |
| | **Total 1,5 jam (estimasi PRD: 0,5 jam)** | | | | |

## 7. Dependensi
- Bergantung pada fitur: 04 (F-04) -- daftar aturan R1–R8 + Z1–Z3 dan sinyal termuat; 05 (F-05) -- level akun (Aman = konsisten); 00 -- halaman `/akun/[id]`, `readCypher`.
- Memblokir fitur: tidak ada.
- Dependensi eksternal: graph terisi (hasil `bun run rebuild`); definisi Z1–Z3 dari F-04.
- Bisa mulai lebih dulu dengan mock: ya untuk FE (T06-03) memakai fixture C02; BE menunggu 04 dan 05.

## 8. Cara Uji
| Acceptance criteria | Cara uji | Otomatis/Manual |
| --- | --- | --- |
| Akun tanpa temuan → "konsisten" + aturan dicek | Test memanggil fungsi untuk C06; periksa status dan daftar aturan tidak kosong | Otomatis |
| C02 → 9 tiket dijelaskan sebagai usulan fitur (Z1) | Test: C02 mengembalikan tepat 9 ID tiket pada penjelasan Z1 | Otomatis |
| Akun acak di luar C01–C06 tanpa error | Sapuan seluruh ID akun dari `getRanking()`; tidak ada exception | Otomatis |
| Jalur error: ID akun tidak ada | Panggil dengan ID palsu → not-found (bukan 500) | Otomatis |
| Panel FE menampilkan penjelasan (happy path) | Buka `/akun/C02` dan satu akun acak di URL lokal/produksi | Manual |
| Panel FE: state loading/error | Matikan koneksi Aura saat dev; error state tampil | Manual |

## 9. Asumsi, Konflik & Risiko
- ⚠️ ASUMSI: Estimasi task 1,5 jam vs PRD 0,5 jam (+200%). PRD 0,5 jam hanya cukup bila daftar aturan beserta nilainya sudah disediakan F-04; fitur ini harus menurunkannya sendiri, menambah panel FE, dan pengujian 40 akun -- cara validasi: ukur T06-01 saat F-04 selesai (J8–9).
- ⚠️ ASUMSI: "Akun tanpa temuan/konsisten" = level Aman menurut F-05 (bukan sekadar nol sinyal), karena level Aman masih boleh memiliki sinyal berbobot kecil -- cara validasi: konfirmasi dengan Dio/Laras; periksa C02 dan C06.
- ⚠️ ASUMSI: Penjelasan dikirim lewat fungsi server yang dibaca Server Component `/akun/[id]` (tanpa endpoint baru), sejalan dengan Rencana Teknis Langkah 8 -- cara validasi: integrasi dengan Tegar.
- ⚠️ ASUMSI: Z2 dan Z3 tidak didefinisikan di PRD maupun Rencana Teknis; penjelasannya mengikuti definisi final F-04 -- cara validasi: baca file F-04 (04) dan kode aturannya.
- ⚠️ ASUMSI: Nama properti `kategori` dan nilai `permintaan_fitur` pada `:Tiket` diambil dari PRD/Rencana; perlu dicocokkan dengan skema F-02 -- cara validasi: cek `cypher/schema.cypher` dan `nodes.jsonl`.
- ⛔ KONFLIK (K-A): repo memuat Prisma/Supabase (commit a5d933a), PRD §9 + Rencana Teknis §2.3 tidak memakainya -- dipakai sementara: ikuti PRD; semua pembacaan lewat Neo4j (`readCypher`), `src/lib/db.ts` tidak disentuh.
- 🔁 USULAN PERUBAHAN: perluas kontrak keluaran F-04 (atau runner sinyal) agar mencatat hasil pemeriksaan aturan yang TIDAK terpicu (`{akun, kode, terpicu, nilai}`) -- alasan: AC "daftar aturan yang sudah dicek beserta nilainya" tidak bisa dipenuhi dari kontrak `{akun, kode, bobot, bukti_ids, fakta, sejak}` yang hanya memuat aturan terpicu. Tanpa ini, T06-02 terblokir dan daftar hanya menampilkan kode + status.
- Risiko: Z1 salah menangkap tiket sehingga C02 tampil berisiko atau penjelasan salah -- mitigasi: golden test F-04 untuk C02 + uji 9 tiket di file ini.
- Risiko: pemilik FE (Tegar) belum punya panel di skeleton -- mitigasi: fixture C02 disiapkan di awal T06-03.

## 10. Definition of Done
- [ ] Semua acceptance criteria di section 3 lolos uji di section 8
- [ ] Semua task di section 6 selesai, atau sudah dipindah secara eksplisit (T06-02 bergantung pada keputusan 🔁)
- [ ] Lint, typecheck, dan build lulus (script `typecheck` belum ada di `package.json` saat file ini ditulis)
- [ ] Tidak ada secret yang di-hardcode; konfigurasi lewat environment variable
- [ ] Implementasi sesuai kontrak dan skema TDD, tanpa perubahan yang tidak tercatat
- [ ] UI di jalur demo punya tampilan loading, kosong, dan error
- [ ] Sudah dicek di lingkungan deploy (`/akun/C02` di URL produksi)
- [ ] PR sudah direview dan di-merge, lalu status di header file diperbarui
- [ ] Tidak ada ID akun yang di-hardcode di logika penjelasan
