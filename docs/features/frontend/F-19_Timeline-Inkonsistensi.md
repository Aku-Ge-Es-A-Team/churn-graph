# 18 -- Timeline inkonsistensi statis
> ID PRD: F-19 · Prioritas: Should #5 · Penanggung jawab: Tegar (Frontend) · Estimasi: 1,5 jam-orang (PRD) · Status: Implementasi selesai (2026-10-10, branch `tegar/landing-page`) memakai `getSignals` (tanpa query baru, sesuai section 9); ⛔ urutan C01 di Aura = 2025-11-28 → 2026-08-15 → 2026-09-18, berbeda dari AC (17-06 → 20-07 → 15-08 → 18-09) karena definisi `since` JANJI_DILANGGAR di 04 (F-04), perlu keputusan Adrian

## 1. Ringkasan Fitur
- Apa: daftar vertikal di `/akun/[id]` yang menampilkan kapan setiap sinyal pertama muncul (`sejak` dari F-04), berurutan menurut tanggal, dengan label "H-x sebelum renewal" per sinyal. Dibangun dari data yang sama untuk semua akun, tanpa hardcode.
- Untuk siapa: Laras (Head of CS) -- melihat seberapa dini risiko sebenarnya terdeteksi, bukan hanya status hari ini.
- Peran di ★ jalur demo utama: bukan bagian jalur demo (Should #5); mendukung narasi lead time peringatan (PRD §4: acuan ±148 hari sebelum renewal untuk C01).

## 2. Acuan PRD & TDD
- PRD: §4 (metrik produk "Lead time peringatan sebelum renewal": selisih `sejak` sinyal pertama dan `tanggal_renewal`), §5 (OUT OF SCOPE X8: replay timeline penuh semua akun; timeline statis sudah cukup), §6 F-19 dan F-04 (kontrak `{akun, kode, bobot, bukti_ids, fakta, sejak}`), §7 (J13–14,5 F-19; urutan pemotongan: F-19 dipotong sebelum F-18).
- TDD (acuan sementara = Rencana Teknis): §1.3 Langkah 7 (detektor menulis `(:Sinyal)-[:PADA]->(:Akun)`), Langkah 8 (pola `src/server/queries/*`, `readCypher`, tanggal Neo4j diubah ke string), Langkah 10 (halaman `/akun/[id]`), §3.4 "F16 Timeline sinyal per akun" (cukup komponen daftar vertikal).
- Keputusan yang dikunci:
  - Timeline statis berbentuk daftar vertikal; bukan replay interaktif.
  - Data berasal dari `Sinyal` hasil 04 (F-04) dengan properti `sejak`; tidak ada tanggal atau ID akun yang di-hardcode.
  - Label "H-x sebelum renewal" dihitung dari tanggal renewal akun.

## 3. User Stories & Acceptance Criteria
- User story: Sebagai Laras, saya ingin melihat kapan setiap sinyal pertama muncul, agar saya tahu seberapa dini risiko sebenarnya terdeteksi.
- Acceptance criteria:
  - Diberikan `sejak` dari F-04, ketika timeline C01 dibuka, maka tampil urutan 17-06 → 20-07 → 15-08 → 18-09 + label "H-x sebelum renewal".
  - Diberikan akun lain, ketika dibuka, maka timeline dibangun dari data yang sama tanpa hardcode.
- Kriteria teknis tambahan:
  - (tambahan teknis) Satu item per kode sinyal dengan `sejak` terawal (user story: "kapan setiap sinyal *pertama* muncul") -- ⚠️ ASUMSI, lihat section 9.
  - (tambahan teknis) Selisih hari dihitung pada tanggal kalender (tanpa pengaruh zona waktu); sinyal bertanggal setelah renewal diberi label "H+x setelah renewal".
  - (tambahan teknis) Akun tanpa sinyal menampilkan keadaan kosong yang jelas, bukan error; tampilan loading dan error tersedia.

## 4. Ruang Lingkup Fitur
- Termasuk:
  - Fungsi murni pengurutan + hitung H-x, komponen daftar vertikal, query baca sinyal + tanggal renewal per akun, pemasangan di `/akun/[id]`, tes dan verifikasi C01 serta akun lain.
- Tidak termasuk:
  - Pembuatan `Sinyal` dan `sejak` → 04 (F-04); skor, level, rupiah → 05 (F-05).
  - Peristiwa selain sinyal (email tak berbalas mentah, rollout versi, tiket) sebagai item terpisah -- hanya yang menjadi sinyal F-04.
  - Replay timeline interaktif semua akun (OUT OF SCOPE X8); penjelasan akun konsisten → 06 (F-07).
  - Viewer graph (11) dan grafik usage (17).
- Pengganti sementara: fixture daftar sinyal ilustratif C01 (empat tanggal dari AC; pasangan tanggal↔kode hanya contoh dan diberi label "ilustratif") sampai query nyata siap.

## 5. API, Data & Komponen yang Disentuh
| Jenis | Nama | Aksi | Acuan TDD |
| --- | --- | --- | --- |
| Halaman FE | `/akun/[id]` (area timeline) | Ubah (dari skeleton 00) | Rencana Teknis Langkah 10 |
| Komponen FE | Timeline daftar vertikal (shadcn `Card`, `Badge`) | Buat | Rencana Teknis §3.4 F16 |
| Modul BE | Query baca sinyal + renewal per akun di `src/server/queries/` (nama berkas ⚠️ ASUMSI `timeline.ts`) | Buat | Rencana Teknis Langkah 8 (pola `src/server/queries/*`) |
| Modul BE (milik 00) | `readCypher` di `src/server/neo4j.ts` | Pakai | Rencana Teknis Langkah 8 |
| Tabel (node graph) | `:Sinyal` (properti `kode`, `bobot`, `sejak`, `fakta`), `:Akun` (tanggal renewal) | Pakai | Rencana Teknis Langkah 7; PRD §4 (`tanggal_renewal`) |
| Relasi | `PADA` (Sinyal → Akun) | Pakai | Rencana Teknis Langkah 3, 7 |
| Tes | Tes fungsi murni dan golden test query timeline (nama berkas ⚠️ ASUMSI) | Buat | Rencana Teknis Langkah 7 (pola) |

## 6. Breakdown Task Implementasi
| ID | Task | Layer | Estimasi (jam) | Bergantung pada | Output terverifikasi |
| --- | --- | --- | --- | --- | --- |
| T18-01 | Fungsi murni: dari daftar `{kode, sejak, bobot}` + tanggal renewal → item timeline satu per `kode` (ambil `sejak` terawal), urut menaik menurut `sejak` (seri: bobot menurun, lalu kode), dengan hari ke renewal dan label "H-x sebelum renewal" (atau "H+x setelah renewal"). Selisih pada tanggal kalender. Tes `bun test`. | FE | 0,5 | 00 (T00-08) | `bun test` hijau: input sintetis sejak 2026-06-17 dan renewal 2026-11-12 → 148 hari (hanya contoh hitung, mengacu angka ±148 PRD §4); dua sinyal berkode sama → satu item dengan tanggal terawal; daftar kosong → hasil kosong; renewal kosong → item tanpa label H-x (jalur error). **bisa paralel** |
| T18-02 | Komponen daftar vertikal: tiap item menampilkan tanggal, label sinyal (kode tak dikenal tampil apa adanya; gunakan ulang pemetaan label dari 10/T10-01 bila sudah ada), ringkasan `fakta`, dan label H-x. Fixture ilustratif C01 dengan empat tanggal AC (17-06, 20-07, 15-08, 18-09 tahun 2026). | FE | 0,75 | 00 (T00-08) | Fixture tampil empat item berurutan menaik dengan label H-x; berkas fixture berlabel "ilustratif". **bisa paralel** |
| T18-03 | Query baca (lewat `readCypher`): `(:Sinyal)-[:PADA]->(:Akun)` untuk akun X beserta `kode`, `bobot`, `sejak`, `fakta` (string JSON di-parse), dan tanggal renewal akun; tanggal Neo4j → string. Akun tanpa sinyal → daftar kosong. Tanpa ID akun yang di-hardcode. | BE | 0,75 | 04 (F-04), 00 (T00-04) | Untuk C01 mengembalikan sinyal dengan `sejak` terurut 2026-06-17, 2026-07-20, 2026-08-15, 2026-09-18 (per AC); untuk C06 daftar kosong. |
| T18-04 | Pasang di `/akun/[id]`: state loading, kosong ("Tidak ada sinyal -- akun konsisten"), dan error (gagal baca) pada area timeline saja. | FE | 0,5 | T18-02, 00 (T00-11) | Fixture berisi → timeline tampil; fixture kosong → pesan kosong; simulasi error → pesan error di area timeline, halaman tetap tampil. **bisa paralel** |
| T18-05 | Integrasi dan verifikasi: ganti fixture dengan query T18-03 (Server Component); tes `bun test` terhadap Aura: tanggal C01 dan label H-x; periksa akun lain (C04 serta satu akun di luar C01–C06) dibangun dari kode yang sama; cek di URL produksi. | Test | 0,5 | T18-01, T18-03, T18-04, 00 (T00-07) | Tes hijau; timeline C01 menampilkan empat tanggal berurutan dengan label H-x; akun lain tampil tanpa error; produksi menampilkan hal yang sama. |
| | **Total 3,0 jam (estimasi PRD: 1,5 jam)** -- selisih +100%, lihat ⚠️ ASUMSI di section 9. | | | | |

## 7. Dependensi
- Bergantung pada fitur: 04 (F-04) -- `Sinyal` dengan `sejak` per akun (transitif 03, 02, 01); 00 -- `readCypher` (T00-04), tipe (T00-08), skeleton `/akun/[id]` (T00-11), deploy (T00-07).
- Memblokir fitur: tidak ada.
- Dependensi eksternal: Aura berisi `Sinyal` hasil 04; golden test F-04 sudah lulus (gerbang J8); tidak ada API key.
- Bisa mulai lebih dulu dengan mock: ya -- T18-01, T18-02, T18-04 memakai fungsi murni dan fixture; T18-03 dan T18-05 menunggu 04.

## 8. Cara Uji
| Acceptance criteria | Cara uji | Otomatis/Manual |
| --- | --- | --- |
| C01: urutan 17-06 → 20-07 → 15-08 → 18-09 + label H-x | `bun test` terhadap Aura: `sejak` C01 berurutan sesuai AC; fungsi murni menghitung H-x; lihat timeline di `/akun/C01`. Jalur error: renewal tidak ada → item tanpa label H-x, bukan crash | Otomatis + Manual |
| Akun lain dibangun dari data yang sama tanpa hardcode | Buka `/akun/C04` dan satu akun di luar C01–C06; tinjau kode query: tidak ada ID akun atau tanggal literal. Jalur error: akun tanpa sinyal (C06) → pesan kosong | Manual (+ pemindaian regex literal ID bila diperlukan) |
| (tambahan teknis) satu item per kode, `sejak` terawal | Tes fungsi murni dengan dua sinyal berkode sama | Otomatis |
| (tambahan teknis) H+x untuk sinyal setelah renewal | Tes fungsi murni dengan `sejak` > renewal | Otomatis |

## 9. Asumsi, Konflik & Risiko
- ⚠️ ASUMSI: total task 3,0 jam vs estimasi PRD 1,5 jam (+100%, >25%). Alasan: estimasi PRD hanya mencakup tampilan; di sini ditambah query baca, fungsi hitung H-x dengan tes, state loading/kosong/error, dan verifikasi produksi. -- cara validasi: ukur jam nyata T18-02 di J13.
- ⚠️ ASUMSI: satu item per kode sinyal dengan `sejak` terawal, sesuai user story ("kapan setiap sinyal pertama muncul"); PRD tidak menyebut cara menangani beberapa `Sinyal` berkode sama. Tahun pada tanggal AC ("17-06 → ... → 18-09") diasumsikan 2026. -- cara validasi: bandingkan dengan keluaran 04 untuk C01 di T18-03; bila jumlah item tidak empat, tanyakan pemetaan ke Adrian (04).
- ⚠️ ASUMSI: tanggal renewal dibaca dari properti akun (PRD §4 menyebut `tanggal_renewal`; nama pasti di graph ditentukan 01/02) dan `fakta` disimpan sebagai string JSON (F-04 kriteria teknis). Query ini terpisah dari `getSignals` (milik 05) karena manifest hanya menautkan 18 ke 04; bila `getSignals` sudah mengembalikan `sejak` dan renewal, query ini boleh digantikan. -- cara validasi: periksa `nodes.jsonl` (01) dan `Sinyal` hasil 04 di T18-03.
- ⚠️ ASUMSI: angka 148 hari (PRD §4, Priority Matrix) hanya dipakai sebagai contoh hitung di tes sintetis dan pembanding visual, bukan nilai yang di-hardcode atau diklaim sebagai tanggal renewal C01. -- cara validasi: bandingkan H-x sinyal pertama C01 dengan ±148 saat T18-05.
- ⚠️ ASUMSI: nama komponen, nama berkas query/tes, dan format tanggal tampilan tidak ditetapkan sumber mana pun. -- cara validasi: tinjau di PR T18-02/T18-03.
- ⛔ KONFLIK: Rencana Teknis §3.4 "F16 Timeline sinyal per akun" berprioritas Fill-in (Could) dan berisi peristiwa beragam (tanggal renewal, email tak berbalas, rollout versi, tiket); PRD F-19 berprioritas Should #5 dan berisi `sejak` sinyal F-04 + label H-x -- dipakai sementara: PRD.
- ⛔ KONFLIK: kontrak output detektor di Rencana Teknis Langkah 7 tidak memuat `sejak`, PRD F-04 memuatnya -- dipakai sementara: PRD (`sejak` dibutuhkan fitur ini; dicatat juga di 04).
- 🔁 USULAN PERUBAHAN: tidak ada.
- Risiko: `sejak` yang dihasilkan 04 tidak sama dengan urutan AC (17-06 → 20-07 → 15-08 → 18-09) karena definisi `sejak` per aturan belum final (A13) -- mitigasi/fallback: cocokkan di golden J8; sesuaikan definisi `sejak` di 04, bukan di UI.
- Risiko: F-19 dipotong lebih dulu bila waktu habis (urutan pemotongan PRD §7: F-20 → F-19 → F-18) -- mitigasi/fallback: tidak mengganggu jalur ★; lead time tetap dapat disebut lisan dari data sinyal.
- Risiko: perilaku Next.js 16 `cacheComponents` pada halaman dinamis (AGENTS.md) -- mitigasi: baca dokumen lokal di `node_modules/next/dist/docs/` sebelum T18-04.

## 10. Definition of Done
- [ ] Semua acceptance criteria di section 3 lolos uji di section 8
- [ ] Semua task di section 6 selesai, atau sudah dipindah secara eksplisit
- [ ] Lint, typecheck, dan build lulus
- [ ] Tidak ada secret yang di-hardcode; konfigurasi lewat environment variable
- [ ] Implementasi sesuai kontrak dan skema TDD, tanpa perubahan yang tidak tercatat
- [ ] UI di jalur demo punya tampilan loading, kosong, dan error
- [ ] Sudah dicek di lingkungan deploy (timeline C01 di URL produksi)
- [ ] PR sudah direview dan di-merge, lalu status di header file diperbarui
- [ ] Tidak ada ID akun, tanggal, atau fixture ilustratif yang tersisa di jalur produksi
