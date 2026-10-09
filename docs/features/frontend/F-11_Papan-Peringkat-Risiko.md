# 10 -- Papan peringkat risiko / Radar home
> ID PRD: F-11 · Prioritas: Must · Penanggung jawab: Tegar (Frontend) · Estimasi: 1,5 jam-orang (PRD) · Status: Belum dimulai

## 1. Ringkasan Fitur
- Apa: halaman `/` (Radar home) berupa tabel 40 akun yang diurutkan menurut risiko, dengan kolom level, badge "Dashboard vs Temuan", renewal H-x, rupiah berisiko berlabel Estimasi, dan 3 sinyal teratas; baris yang divergen disorot warna level; ada filter "fokus" C01–C06.
- Untuk siapa: Laras (Head of CS) -- tahu harus mulai dari akun mana dalam rapat retensi; Bima mendapat pintu masuk ke `/akun/[id]`.
- Peran di ★ jalur demo utama: langkah 1 (C01 Kritis peringkat 1, badge "Dashboard: Hijau vs Temuan: Kritis", rupiah berisiko) dan langkah 5 (kembali ke Radar; C03 ditandai bug, C02 "konsisten").

## 2. Acuan PRD & TDD
- PRD: §3 kasus penggunaan 1 (★), §5 (IN SCOPE: papan peringkat; Pengganti sementara: rupiah berisiko = `nilai_tahunan × p(level)` berlabel Estimasi, UI sebelum J9 = fixture), §6 F-11 dan F-05 (kriteria ketiga: label "Estimasi" dan nilai p terlihat di UI), §7 (J2–9 F-11 fixture → data nyata), §8 (A15: nilai p), §9 (jalur demo langkah 1, 5).
- TDD (acuan sementara = Rencana Teknis): §1.3 Langkah 8 (`getRanking()` fungsi server untuk `/` Server Component; `'use cache'` + `cacheLife`), Langkah 10 (halaman `/`), §3.4 "F11 Papan peringkat risiko" (kolom, baris divergen disorot), §2.1 (shadcn `Table`, `Badge`), Langkah 3 (tipe `RiskRow`).
- Keputusan yang dikunci:
  - Level mengikuti PRD: Kritis / Tinggi / Waspada / Aman (K-B).
  - Data untuk produksi datang dari `getRanking()` di `src/server/queries/risk.ts` (milik 05, F-05) lewat Server Component, bukan REST; kolom mengikuti AC F-11.
  - Rupiah berisiko selalu berlabel "Estimasi" dan nilai p terlihat di UI.
  - Fixture JSON hanya untuk pengembangan; tidak tampil di demo final (PRD §5).

## 3. User Stories & Acceptance Criteria
- User story: Sebagai Laras, saya ingin satu layar berisi 40 akun yang diurutkan menurut risiko, agar saya tahu harus mulai dari mana.
- Acceptance criteria:
  - Diberikan halaman `/`, ketika dibuka, maka tampil 40 akun dengan kolom level, badge dashboard vs temuan, renewal H-x, rupiah berisiko, dan 3 sinyal teratas.
  - Diberikan filter "fokus", ketika diaktifkan, maka hanya C01–C06 yang tampil.
  - Diberikan baris divergen, ketika dirender, maka baris disorot dengan warna level.
- Kriteria teknis tambahan:
  - (tambahan teknis) Dari PRD F-05 kriteria ketiga: rupiah berisiko berlabel "Estimasi" dan nilai p terlihat di UI.
  - (tambahan teknis) Divergen = dashboard Hijau dan level ≥ Tinggi (definisi PRD F-05).
  - (tambahan teknis) Halaman punya tampilan loading, kosong, dan error (DoD jalur demo).
  - (tambahan teknis) Data produksi lewat Server Component dengan hasil ter-cache oleh `getRanking()` (Rencana Langkah 8); tidak ada fetch client ke REST untuk peringkat.

## 4. Ruang Lingkup Fitur
- Termasuk:
  - Halaman `/` menggantikan halaman bawaan scaffold; tabel 40 akun; badge level; badge divergensi; sorotan baris; legenda p/Estimasi; filter "fokus"; tautan ke `/akun/[id]`; state loading/kosong/error.
  - Fungsi murni FE (sinyal teratas, divergensi, H-x, format rupiah, p turunan) beserta tes.
- Tidak termasuk:
  - Perhitungan skor, level, rupiah, nilai p, dan urutan peringkat → 05 (F-05); sinyal dan kodenya → 04 (F-04).
  - Ringkasan total per tingkat + total ARR berisiko (F-24, Could, tidak dibuatkan file).
  - Filter berlapis, tooltip sinyal, ekspor CSV (P29, dibuang PRD §5).
  - Halaman `/akun/[id]` dan isinya → 11 (F-12), 12 (F-06), 17 (F-18), 18 (F-19).
- Pengganti sementara: fixture `RiskRow[]` dari 00 (T00-10) sampai `getRanking()` dari 05 siap.

## 5. API, Data & Komponen yang Disentuh
| Jenis | Nama | Aksi | Acuan TDD |
| --- | --- | --- | --- |
| Halaman FE | `/` (`src/app/page.tsx`) | Ubah (dari skeleton 00) | Rencana Teknis Langkah 10 |
| Komponen FE | Tabel peringkat (shadcn `Table`) | Buat | Rencana Teknis §2.1, §3.4 F11 |
| Komponen FE | Badge level dan badge "Dashboard vs Temuan" (shadcn `Badge`) | Buat | Rencana Teknis §2.1, §3.4 F11 |
| Komponen FE | Toggle filter "fokus" (komponen Button yang sudah ada) | Buat | PRD F-11 |
| Komponen FE | Legenda p(level)/Estimasi | Buat | PRD F-05 kriteria ketiga |
| Modul BE (milik 05) | `getRanking()` di `src/server/queries/risk.ts` | Pakai | Rencana Teknis Langkah 8 |
| Tipe | `RiskRow` di `src/types/graph.ts` | Pakai | Rencana Teknis Langkah 3 |
| Data sementara | Fixture `RiskRow[]` dari 00 (T00-10) | Pakai | PRD §5 |

## 6. Breakdown Task Implementasi
| ID | Task | Layer | Estimasi (jam) | Bergantung pada | Output terverifikasi |
| --- | --- | --- | --- | --- | --- |
| T10-01 | Fungsi murni FE: (a) 3 sinyal teratas (bobot menurun, urutan stabil; kode tak dikenal tampil apa adanya); (b) divergensi = `dashboard` Hijau (tak peka huruf besar-kecil) dan level ∈ {Tinggi, Kritis}; (c) label "H-x" dari `hariKeRenewal`; (d) format rupiah ringkas dan p turunan `nilaiBerisiko / nilaiTahunan`. Tes `bun test` (lokasi berkas ⚠️ ASUMSI). | FE | 0,5 | 00 (T00-08) | `bun test` hijau: C01 (Hijau + Kritis) divergen, C06 tidak; sinyal kosong → daftar kosong; `nilaiTahunan = 0` → p tidak ditampilkan (jalur error); 89.964.000 → "Rp 90,0 jt". **bisa paralel** |
| T10-02 | `bunx --bun shadcn add table badge`; tabel peringkat di `/` dari fixture: kolom akun (id + nama, tautan ke `/akun/[id]`), level, badge Dashboard vs Temuan, renewal (tanggal + H-x), nilai berisiko berlabel "Estimasi", 3 sinyal teratas. Baca `AGENTS.md` dan dokumen Next.js lokal sebelum menulis halaman. | FE | 1,0 | 00 (T00-10, T00-11), T10-01 | Fixture tampil C01–C06 dengan semua kolom; klik akun membuka `/akun/C01` (skeleton 00); `bun run build` lulus. **bisa paralel** |
| T10-03 | Sorotan baris divergen berwarna level dan badge "Dashboard: Hijau vs Temuan: Kritis"; legenda di atas tabel: nilai p per level (diturunkan dari data) + keterangan "Estimasi, p adalah asumsi tim". Warna bukan satu-satunya pembeda (teks level tetap tampil). | FE | 0,5 | T10-02 | Baris C01 tersorot warna Kritis dengan badge divergen; baris C06 tidak; legenda memuat nilai p sesuai fixture. **bisa paralel** |
| T10-04 | Filter "fokus": toggle client-side yang membatasi tampilan ke C01–C06 (konstanta ID fokus, ⚠️ ASUMSI), menampilkan jumlah baris. | FE | 0,25 | T10-02 | Aktif → 6 baris C01–C06; nonaktif → semua; data tanpa satu pun akun fokus → pesan kosong (jalur error). **bisa paralel** |
| T10-05 | Tampilan loading (skeleton baris), kosong (tanpa akun), dan error (gagal baca data) untuk `/` memakai mekanisme Suspense/`loading`/error boundary sesuai dokumen Next.js lokal (`cacheComponents` aktif). | FE | 0,5 | T10-02 | Memaksa tiap kondisi (daftar kosong, throw sementara, throttle jaringan) menampilkan state yang sesuai; tidak ada layar putih. **bisa paralel** |
| T10-06 | Integrasi: ganti fixture dengan `getRanking()` dari `src/server/queries/risk.ts` di Server Component; pertahankan urutan dari 05 (tanpa urut ulang di FE); tidak ada impor fixture di jalur produksi. | FE | 0,5 | 05 (F-05), T10-02, T10-03, T10-04, T10-05 | `/` menampilkan 40 akun dari Aura; C01 baris pertama berlevel Kritis. |
| T10-07 | Verifikasi data nyata dan produksi: 40 baris; C01 Kritis peringkat 1 + badge divergen; C03 & C04 Tinggi, C05 Waspada, C02 & C06 Aman (golden PRD §4); angka Estimasi dibandingkan contoh Rencana §3.4 F06 (C01 ≈ Rp 90,0 jt, C03 ≈ Rp 27,2 jt); filter fokus; waktu muat di URL produksi. | Test | 0,5 | T10-06, 00 (T00-07) | Checklist manual tercentang di PR; golden peringkat milik 05 hijau; URL produksi menampilkan hal yang sama. |
| | **Total 3,75 jam (estimasi PRD: 1,5 jam)** -- selisih +150%, lihat ⚠️ ASUMSI di section 9. | | | | |

## 7. Dependensi
- Bergantung pada fitur: 00 -- tipe `RiskRow` (T00-08), fixture (T00-10), skeleton `/` dan layout (T00-11), deploy (T00-07); 05 (F-05) -- `getRanking()` dan `RiskRow` nyata (level, skor, nilai berisiko, sinyal).
- Memblokir fitur: tidak ada.
- Dependensi eksternal: Aura berisi graph hasil 01–05 untuk integrasi; tidak ada API key.
- Bisa mulai lebih dulu dengan mock: ya -- T10-01 sampai T10-05 memakai fixture 00 dan tipe `RiskRow`; hanya T10-06 dan T10-07 menunggu 05.

## 8. Cara Uji
| Acceptance criteria | Cara uji | Otomatis/Manual |
| --- | --- | --- |
| `/` menampilkan 40 akun dengan 6 kolom | Buka `/` dengan data nyata; hitung baris = 40; periksa kolom level, badge, H-x, rupiah, 3 sinyal. Jalur error: matikan koneksi Aura/ubah kredensial → state error, bukan layar putih | Manual |
| Filter "fokus" hanya C01–C06 | Aktifkan toggle → tepat 6 baris. Jalur error: data tanpa akun fokus → pesan kosong | Manual (+ tes fungsi filter bila diekstrak) |
| Baris divergen disorot warna level | C01 tersorot Kritis; C06 tidak. Fungsi divergensi diuji `bun test` (C01 ya, C06 tidak, dashboard huruf kecil "hijau" tetap dikenali) | Otomatis (fungsi murni) + Manual (visual) |
| (tambahan teknis) "Estimasi" dan p terlihat | Periksa label dan legenda; p turunan dibandingkan nilai di 05; `nilaiTahunan = 0` tidak menampilkan p | Otomatis (fungsi murni) + Manual |
| (tambahan teknis) C01 peringkat 1, golden level | Cocokkan dengan golden peringkat 05 (`bun test tests/golden`) dan tampilan | Otomatis (golden 05) + Manual |

## 9. Asumsi, Konflik & Risiko
- ⚠️ ASUMSI: total task 3,75 jam vs estimasi PRD 1,5 jam (+150%, >25%). Alasan: estimasi PRD hanya mencakup tabel; DoD jalur demo menambah state loading/kosong/error, fungsi turunan + tes, filter, serta integrasi dan verifikasi produksi. PRD A4 sendiri menyebut effort nyata bisa 1,5–2×. -- cara validasi: bandingkan jam nyata T10-02 di J5.
- ⚠️ ASUMSI: `RiskRow` (Rencana Langkah 3) tidak punya field `divergensi` dan `p`; FE menurunkan divergensi dari `dashboard` + `level` (aturan PRD F-05) dan p dari `nilaiBerisiko / nilaiTahunan`. Nilai `dashboard` diasumsikan memuat kata "Hijau" (health score dashboard apa adanya). -- cara validasi: konfirmasi ke Dio (05) di T10-06; bila 05 menyediakan field resmi, ganti turunan FE dan perbarui kontrak di 00.
- ⚠️ ASUMSI: peringkat sudah terurut dari `getRanking()` (skor menurun; tie-break renewal lalu ARR milik 05); FE tidak mengurutkan ulang. -- cara validasi: golden peringkat 05.
- ⚠️ ASUMSI: filter "fokus" dikerjakan di client dengan konstanta ID C01–C06; `getRanking({ fokus: true })` pada sketsa tes Rencana Langkah 7 tidak dipakai UI. -- cara validasi: sepakati dengan Dio bahwa 05 tidak perlu mendukung parameter itu untuk UI.
- ⚠️ ASUMSI: label sinyal berbahasa Indonesia dipetakan dari tabel kode sinyal 04 (F-04), yang sendiri masih ⚠️ ASUMSI A13; kode tak dikenal tampil apa adanya. Format rupiah ringkas ("Rp 90,0 jt"), skema warna level, nama komponen/berkas FE, dan lokasi tes tidak ditetapkan sumber mana pun. -- cara validasi: tinjau di PR T10-02/T10-03.
- ⛔ KONFLIK (K-B): `RiskRow.level` di Rencana Teknis = Kritis/Tinggi/Sedang/Rendah; PRD = Kritis/Tinggi/Waspada/Aman -- dipakai sementara: PRD (peta warna dan legenda memakai Waspada/Aman).
- 🔁 USULAN PERUBAHAN: tidak ada.
- Risiko: beban Tegar -- total task FE Must (10, 11, 12) 11,5 jam + skeleton/fixture di 00 (2,5 jam) ≈ 14 jam, setara kapasitas 14 jam PRD (≈12,3 jam pada sisa waktu 15,8 jam) belum termasuk pitch, video, dan skrip demo -- mitigasi: kerjakan urutan PRD §7 (F-11 J2–9, F-12 J6–12); potong state/legenda kosmetik lebih dulu, jangan kolom wajib AC.
- Risiko: `getRanking()` dari 05 terlambat → jalur demo membutuhkan data nyata di integrasi J11 -- mitigasi: fixture dipakai untuk pengembangan; T10-06 hanya mengganti sumber data (0,5 jam).
- Risiko: perilaku Next.js 16 dengan `cacheComponents` berbeda dari yang dikenal (AGENTS.md) -- mitigasi: baca dokumen lokal di `node_modules/next/dist/docs/` sebelum T10-02 dan T10-05.

## 10. Definition of Done
- [ ] Semua acceptance criteria di section 3 lolos uji di section 8
- [ ] Semua task di section 6 selesai, atau sudah dipindah secara eksplisit
- [ ] Lint, typecheck, dan build lulus
- [ ] Tidak ada secret yang di-hardcode; konfigurasi lewat environment variable
- [ ] Implementasi sesuai kontrak dan skema TDD, tanpa perubahan yang tidak tercatat
- [ ] UI di jalur demo punya tampilan loading, kosong, dan error
- [ ] Sudah dicek di lingkungan deploy (URL produksi menampilkan 40 akun dengan C01 peringkat 1)
- [ ] PR sudah direview dan di-merge, lalu status di header file diperbarui
- [ ] Label "Estimasi" dan nilai p terlihat; baris divergen tersorot dan level terbaca tanpa bergantung pada warna saja
- [ ] Tidak ada impor fixture di jalur produksi
