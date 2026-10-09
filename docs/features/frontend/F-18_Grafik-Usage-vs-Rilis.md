# 17 -- Grafik usage terkoreksi vs rilis 4.12
> ID PRD: F-18 · Prioritas: Should #4 · Penanggung jawab: Tegar (Frontend) · Estimasi: 1,5 jam-orang (PRD) · Status: Belum dimulai

## 1. Ringkasan Fitur
- Apa: grafik bulanan di `/akun/[id]` untuk akun yang punya anomali usage: rata-rata per outlet kelompok terdampak vs 19 outlet kontrol (offline, tidak pernah memakai 4.12), dengan garis vertikal rilis 4.12 (2026-06-29), dibangun dari `UsageBulan`.
- Untuk siapa: Laras (Head of CS) -- yakin bahwa "usage turun 35%" di C03/C05 adalah bug (BUG-412 di v4.12), bukan pelanggan berhenti memakai, sehingga tidak salah memberi diskon.
- Peran di ★ jalur demo utama: mendukung langkah 5 (C03 ditandai bug, bukan churn); bukan langkah wajib (Should #4).

## 2. Acuan PRD & TDD
- PRD: §1 (C03 dashboard kuning: usage turun 35% adalah transaksi offline tidak tersinkron, BUG-412, v4.12; C05 bug yang sama), §3 kasus penggunaan 2, §5 (agregasi bulanan karena batas AuraDB Free, A9), §6 F-18, §7 (J12–13 F-18; urutan pemotongan: F-18 dipotong setelah F-19).
- TDD (acuan sementara = Rencana Teknis): §3.4 "F13 Grafik usage vs rilis" (garis `jumlah_transaksi` dan `transaksi_offline_tersinkron` outlet terdampak vs 19 outlet offline yang tidak pernah memakai 4.12, garis vertikal 2026-06-29), §1.3 Langkah 3 (aturan pemodelan 5: `UsageBulan`, relasi `MENCATAT`, `MENGALAMI`, `BERTEPATAN_DENGAN`, `MENJALANKAN_VERSI`), Langkah 4 (sel kosong `transaksi_offline_tersinkron` = null, bukan 0), Langkah 6 (Anomali), Langkah 8 (pola `src/server/queries/*`, `readCypher`), Langkah 10 (grafik usage untuk akun beranomali di `/akun/[id]`), §2.1 (shadcn Chart/Recharts).
- Keputusan yang dikunci:
  - Sumber data grafik adalah `UsageBulan`, bukan data harian.
  - Garis rilis pada 2026-06-29; kelompok kontrol = 19 outlet offline yang tidak pernah memakai 4.12.
  - Grafik hanya untuk akun beranomali; null pada `transaksi_offline_tersinkron` ditampilkan sebagai celah, bukan 0.
  - Library grafik: shadcn Chart (Recharts), tanpa library baru.

## 3. User Stories & Acceptance Criteria
- User story: Sebagai Laras, saya ingin melihat bahwa penurunan usage C03/C05 hanya terjadi pada outlet versi 4.12, agar saya yakin itu bug, bukan churn.
- Acceptance criteria:
  - Diberikan C03, ketika grafik dibuka, maka garis outlet terdampak vs 19 outlet kontrol tampil dengan garis rilis 2026-06-29.
  - Diberikan data, ketika dirender, maka sumbernya adalah `UsageBulan`, bukan data harian.
- Kriteria teknis tambahan:
  - (tambahan teknis) Dua metrik ditampilkan: `jumlah_transaksi` dan `transaksi_offline_tersinkron` (Rencana §3.4 F13).
  - (tambahan teknis) Tanggal rilis dibaca dari graph (node `Rilis` yang bertepatan dengan anomali), tidak di-hardcode; jumlah outlet tiap kelompok (n) tampil.
  - (tambahan teknis) Akun tanpa anomali (mis. C02, C06) tidak menampilkan grafik dan tidak menampilkan error.
  - (tambahan teknis) Tampilan loading, kosong, dan error; legenda tidak bergantung pada warna saja.

## 4. Ruang Lingkup Fitur
- Termasuk:
  - Query baca deret bulanan terdampak vs kontrol; tipe hasil; komponen grafik dua metrik; pemasangan di `/akun/[id]` bersyarat; golden test query; verifikasi C03 dan C05.
- Tidak termasuk:
  - Pembuatan `UsageBulan` dan baseline/delta → 01 (F-01); `Anomali`, `MENJALANKAN_VERSI`, node `Rilis` → 03 (F-03); sinyal "anomali usage bertepatan rilis ber-bug" → 04 (F-04).
  - Kartu insight 19 outlet offline yang masih memakai 4.11 sebagai risiko rollout → 19 (F-20).
  - Viewer graph (11), kartu bukti (12), timeline (18), kartu tindakan (F-09).
  - Replay timeline penuh dan filter lanjutan (OUT OF SCOPE X8, P29).
- Pengganti sementara: fixture deret usage berlabel "ilustratif" (dibuat di T17-02, bukan data nyata dan tidak dipakai demo) sampai query nyata siap.

## 5. API, Data & Komponen yang Disentuh
| Jenis | Nama | Aksi | Acuan TDD |
| --- | --- | --- | --- |
| Halaman FE | `/akun/[id]` (area grafik usage) | Ubah (dari skeleton 00) | Rencana Teknis Langkah 10 |
| Library | shadcn Chart (Recharts) via `bunx --bun shadcn add chart` | Buat | Rencana Teknis §2.1 |
| Komponen FE | Grafik garis usage terdampak vs kontrol + garis rilis (2 metrik) | Buat | Rencana Teknis §3.4 F13 |
| Modul BE | Query baca deret usage di `src/server/queries/` (nama berkas ⚠️ ASUMSI `usage.ts`) | Buat | Rencana Teknis Langkah 8 (pola `src/server/queries/*`) |
| Modul BE (milik 00) | `readCypher` di `src/server/neo4j.ts` | Pakai | Rencana Teknis Langkah 8 |
| Tabel (node graph) | `:UsageBulan`, `:Outlet`, `:Akun`, `:Anomali`, `:Rilis` | Pakai | Rencana Teknis Langkah 3 |
| Relasi | `MEMILIKI`, `MENCATAT`, `MENGALAMI`, `BERTEPATAN_DENGAN`, `MENJALANKAN_VERSI` | Pakai | Rencana Teknis Langkah 3 |
| Tes | Golden test query usage (`tests/golden/`, nama berkas ⚠️ ASUMSI) | Buat | Rencana Teknis Langkah 7 (pola) |

## 6. Breakdown Task Implementasi
| ID | Task | Layer | Estimasi (jam) | Bergantung pada | Output terverifikasi |
| --- | --- | --- | --- | --- | --- |
| T17-01 | Query baca (lewat `readCypher`, tanpa tulis): untuk akun X, kelompok terdampak = outlet milik X yang `MENGALAMI` anomali yang `BERTEPATAN_DENGAN` sebuah rilis; kelompok kontrol = outlet `mode_offline = true` (semua akun) tanpa `MENJALANKAN_VERSI` ke rilis itu; kembalikan rata-rata per outlet per bulan untuk `jumlah_transaksi` dan `transaksi_offline_tersinkron` (null dipertahankan), jumlah outlet tiap kelompok, dan tanggal rilis sebagai string. Akun tanpa anomali → hasil kosong. Tanpa ID akun/rilis yang di-hardcode. | BE | 1,0 | 03 (F-03), 00 (T00-04) | Untuk C03: 12 bulan × 2 kelompok × 2 metrik, n terdampak = 6 dan n kontrol = 19, tanggal rilis 2026-06-29; untuk C02/C06: hasil kosong. |
| T17-02 | Definisikan tipe hasil query (lokal di modul query, bukan di `src/types/graph.ts`) dan fixture deret ilustratif C03 berlabel "ilustratif -- bukan data" yang memenuhi tipe. | FE | 0,5 | 00 (T00-08) | `tsc --noEmit` lulus; fixture memuat nilai null di salah satu bulan; berkas berlabel ilustratif. **bisa paralel** |
| T17-03 | `bunx --bun shadcn add chart`; grafik garis `jumlah_transaksi` terdampak vs kontrol dengan garis vertikal rilis (di bulan rilis, label tanggal persis dari data); null tampil sebagai celah. Baca dokumen Next.js lokal untuk komponen client. | FE | 1,0 | T17-02 | Fixture: dua garis tampil, garis rilis berlabel 2026-06-29, bulan null berupa celah (bukan turun ke 0); `bun run build` lulus. **bisa paralel** |
| T17-04 | Grafik kedua `transaksi_offline_tersinkron`; legenda dengan n per kelompok (mis. "Terdampak (n=6)" vs "Kontrol (n=19)") dan gaya garis berbeda selain warna; keterangan "Sumber: UsageBulan (agregat bulanan), bukan data harian". | FE | 0,5 | T17-03 | Fixture: kedua grafik tampil dengan legenda dan keterangan sumber; pembeda kelompok terlihat dalam skala abu-abu. **bisa paralel** |
| T17-05 | Pasang di `/akun/[id]` secara bersyarat (hanya bila hasil query tidak kosong) dengan state loading, kosong (komponen disembunyikan tanpa pesan error), dan error (gagal baca). | FE | 0,5 | T17-04, 00 (T00-11) | Dengan fixture berisi → grafik tampil; fixture kosong → tidak ada grafik dan tidak ada error; simulasi error → pesan error di area grafik saja, halaman tetap tampil. **bisa paralel** |
| T17-06 | Integrasi dan verifikasi: ganti fixture dengan query T17-01 (Server Component); golden test query (C03: n=6 dan 19, rilis 2026-06-29, 12 bulan; C02/C06 kosong); cek C03 dan C05 di data nyata dan di URL produksi. | Test | 0,75 | T17-01, T17-05, 00 (T00-07) | `bun test` golden usage hijau; grafik C03/C05 tampil di produksi dengan penurunan terdampak sejak bulan rilis dan kontrol datar; C02 tanpa grafik. |
| | **Total 4,25 jam (estimasi PRD: 1,5 jam)** -- selisih +183%, lihat ⚠️ ASUMSI di section 9. | | | | |

## 7. Dependensi
- Bergantung pada fitur: 03 (F-03) -- `Anomali`, `MENJALANKAN_VERSI`, node `Rilis` (transitif 01/F-01 untuk `UsageBulan` dan 02/F-02 untuk graph termuat); 00 -- `readCypher` (T00-04), tipe (T00-08), skeleton `/akun/[id]` (T00-11), deploy (T00-07).
- Memblokir fitur: tidak ada.
- Dependensi eksternal: Aura berisi `UsageBulan` dan relasi turunan hasil 01–03; tidak ada API key.
- Bisa mulai lebih dulu dengan mock: ya -- T17-02 sampai T17-05 memakai fixture ilustratif; T17-01 dan T17-06 menunggu 03.

## 8. Cara Uji
| Acceptance criteria | Cara uji | Otomatis/Manual |
| --- | --- | --- |
| C03: garis terdampak vs 19 kontrol + garis rilis 2026-06-29 | Golden test query: C03 → n terdampak 6, n kontrol 19, `tanggalRilis = 2026-06-29` (nilai angka diselaraskan dengan 03); lihat grafik di `/akun/C03`. Jalur error: akun tanpa anomali (C02) → hasil kosong | Otomatis (golden) + Manual (visual) |
| Sumber `UsageBulan`, bukan harian | Query hanya menyentuh label `UsageBulan` (tinjau Cypher); deret berisi 12 titik per kelompok | Otomatis (jumlah titik) + Manual (tinjau query) |
| (tambahan teknis) null = celah | Fixture/data dengan `transaksi_offline_tersinkron` null → garis terputus, bukan 0 | Manual |
| (tambahan teknis) Akun tanpa anomali tanpa grafik | Buka `/akun/C02` dan `/akun/C06` → tidak ada grafik, tidak ada error | Manual |
| (tambahan teknis) C05 | Buka `/akun/C05` → grafik tampil; n terdampak dibandingkan PRD §1 (5 outlet) | Manual |

## 9. Asumsi, Konflik & Risiko
- ⚠️ ASUMSI: total task 4,25 jam vs estimasi PRD 1,5 jam (+183%, >25%). Alasan: estimasi PRD hanya mencakup rendering; di sini ditambah query baca baru (definisi kelompok terdampak dan kontrol, pembentukan deret), fixture, golden test, dan pemasangan bersyarat. PRD A4: effort nyata bisa 1,5–2×. -- cara validasi: ukur jam nyata T17-01 saat 03 selesai (J8); bila lebih dari 1,5 jam, sederhanakan menjadi satu metrik.
- ⚠️ ASUMSI: definisi kelompok. Terdampak = outlet akun yang beranomali bertepatan rilis; kontrol = semua outlet offline tanpa `MENJALANKAN_VERSI` ke rilis itu (Rencana §3.4 F13). PRD F-20 menyebut 19 outlet offline "yang masih memakai 4.11"; keduanya diasumsikan himpunan yang sama. -- cara validasi: n kontrol = 19 di T17-06; selisih berarti definisi salah.
- ⚠️ ASUMSI: nama properti belum tertulis di sumber: bulan di `UsageBulan` (mis. `bulan`), `jumlah_transaksi`, `transaksi_offline_tersinkron`, tanggal pada `Rilis` (mis. `tanggal`), `mode_offline` (nama ini ada di Rencana Langkah 4/6). Bila `Rilis` tidak menyimpan tanggal, tanggal diturunkan dari `MENJALANKAN_VERSI.sejak` dan harus menghasilkan 2026-06-29. -- cara validasi: periksa `nodes.jsonl` (01) dan hasil derive (03) di T17-01.
- ⚠️ ASUMSI: karena `UsageBulan` bulanan, garis rilis ditempatkan di bulan rilis (2026-06) dengan label tanggal persis; presisi harian tidak ada. Judul "terkoreksi" tidak didefinisikan PRD; diartikan sebagai perbandingan dengan kontrol, bukan koreksi nilai. -- cara validasi: konfirmasi ke tech lead/Laras saat gladi.
- ⚠️ ASUMSI: nama modul query dan golden test (`usage.ts`, `tests/golden/`) serta kompatibilitas Recharts dengan React 19.3 belum diverifikasi. -- cara validasi: T17-03 (`bun run build`) dan tinjau di PR T17-01.
- ⛔ KONFLIK: tidak ada.
- 🔁 USULAN PERUBAHAN: tidak ada.
- Risiko: F-18 dipotong lebih dulu bila waktu habis (urutan pemotongan PRD §7: F-19 → F-18 → F-17 → F-16) -- mitigasi/fallback: angka C03 tetap tampil di panel bukti (Rencana §3.6); tidak mengganggu jalur ★.
- Risiko: definisi kelompok salah sehingga n ≠ 19 atau garis kontrol ikut turun -- mitigasi/fallback: golden test T17-06; periksa data `MENJALANKAN_VERSI` outlet T0531/T0600/T0636 (PRD F-03) yang tidak pernah memakai 4.12.
- Risiko: beban Tegar tinggi (Must FE 11,5 jam + skeleton/fixture 2,5 jam di 00) -- mitigasi: kerjakan hanya bila Must FE selesai; query T17-01 dapat dibantu Dio (BE) bila disepakati.

## 10. Definition of Done
- [ ] Semua acceptance criteria di section 3 lolos uji di section 8
- [ ] Semua task di section 6 selesai, atau sudah dipindah secara eksplisit
- [ ] Lint, typecheck, dan build lulus
- [ ] Tidak ada secret yang di-hardcode; konfigurasi lewat environment variable
- [ ] Implementasi sesuai kontrak dan skema TDD, tanpa perubahan yang tidak tercatat
- [ ] UI di jalur demo punya tampilan loading, kosong, dan error
- [ ] Sudah dicek di lingkungan deploy (grafik C03 di URL produksi)
- [ ] PR sudah direview dan di-merge, lalu status di header file diperbarui
- [ ] Query hanya membaca (tidak ada klausa tulis) dan tidak meng-hardcode ID akun/rilis/outlet
- [ ] Tidak ada fixture ilustratif yang tersisa di jalur produksi
