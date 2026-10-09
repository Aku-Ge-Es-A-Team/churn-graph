# 05 -- Skor, level, rupiah + Dashboard vs Temuan
> ID PRD: F-05 · Prioritas: Must · Penanggung jawab: Dio (Backend & AI) · Estimasi: 1,5 jam-orang (PRD); total task 2,5 jam · Status: Implementasi selesai dan terverifikasi (golden terhadap Aura, 2026-10-09); menunggu review PR

## 1. Ringkasan Fitur
- Apa: Modul skoring TypeScript yang mengubah sinyal F-04 menjadi skor, level (Kritis/Tinggi/Waspada/Aman), nilai rupiah berisiko (Estimasi), dan penanda divergensi "Dashboard vs Temuan" untuk 40 akun, diekspos lewat `getRanking()` dalam bentuk `RiskRow[]`.
- Untuk siapa: Laras (Head of CS) -- tahu akun mana yang dinilai hijau oleh dashboard padahal berisiko, beserta rupiahnya, sehingga prioritas tindakan jelas.
- Peran di ★ jalur demo utama: langkah 1 (Radar: C01 Kritis peringkat 1, badge "Dashboard: Hijau vs Temuan: Kritis", rupiah berisiko). Dikonsumsi UI oleh 10 (F-11).

## 2. Acuan PRD & TDD
- PRD: §2 T1 & T2, §3 kasus penggunaan 1, §4 metrik "Golden test peringkat", §5 Pengganti sementara ("Rupiah berisiko"), §6 F-05, §7 (J8–9), §8 A15 & A16.
- TDD (acuan sementara): Rencana Teknis §1.3 Langkah 7 (skoring TypeScript setelah detektor, golden test), Langkah 8 (`getRanking()`, `'use cache'`), §3.4 "F06 · Skor risiko, peringkat & estimasi rupiah" (ID F06 milik Rencana, bukan ID PRD), §1.3 Langkah 3 (tipe `RiskRow`), §2.4 (`SNAPSHOT_DATE`).
- Keputusan yang dikunci:
  - Rumus skor = Σ bobot × faktor renewal; tie-break hari renewal lalu ARR (PRD F-05).
  - Faktor renewal ≤60 hari: 1,5; ≤120 hari: 1,25; selebihnya 1,0 (Rencana Teknis §3.4 F06).
  - Nilai berisiko = `nilai_tahunan × p(level)`, p hardcode: Kritis 0,6 · Tinggi 0,4 · Waspada 0,2 · Aman 0,05; selalu berlabel "Estimasi" dan p terlihat di UI (PRD §5, A15).
  - Nama level mengikuti PRD (Kritis/Tinggi/Waspada/Aman), lihat ⛔ KONFLIK K-B di section 9.
  - Skoring bersifat deterministik, tanpa ML (PRD §5 OUT OF SCOPE X1).

## 3. User Stories & Acceptance Criteria
- User story: Sebagai Laras, saya ingin melihat akun mana yang dinilai hijau oleh dashboard padahal berisiko, beserta rupiahnya, agar saya tahu prioritas tindakan.
- Acceptance criteria:
  - Diberikan sinyal F-04, ketika skor dihitung (Σ bobot × faktor renewal, tie-break hari renewal lalu ARR), maka C01 berada di peringkat 1 dengan level Kritis.
  - Diberikan akun dengan dashboard Hijau dan level ≥ Tinggi, ketika ditampilkan, maka kolom divergensi bernilai "ya".
  - Diberikan rupiah berisiko, ketika ditampilkan, maka nilainya berlabel "Estimasi" dan nilai p terlihat di UI.
- Kriteria teknis tambahan:
  - (tambahan teknis) `getRanking({ fokus })` mengembalikan `RiskRow[]` terurut; hanya akun pelanggan (40) yang masuk, bukan prospek P01–P05.
  - (tambahan teknis) Akun tanpa sinyal mendapat skor 0, level Aman, dan tidak menghasilkan `NaN`/error.
  - (tambahan teknis) Golden test: C01 Kritis peringkat 1; C03 & C04 Tinggi; C05 Waspada; C02 & C06 Aman (PRD §4).
  - (tambahan teknis) Hasil `getRanking` di-cache (`'use cache'` + `cacheLife`) karena graph hanya berubah saat `rebuild`.

## 4. Ruang Lingkup Fitur
- Termasuk: konstanta skoring (p, faktor renewal, ambang level); fungsi skor/level/tie-break; `getRanking` (+ parameter `fokus`); perhitungan `divergensi` dan `nilaiBerisiko`; ekspor konstanta p agar UI bisa menampilkannya; golden test peringkat/level; kalibrasi bobot/ambang terhadap golden test.
- Tidak termasuk: kode sinyal, bobot per sinyal, dan Cypher aturan (04, F-04); tampilan badge, kolom, label "Estimasi", sorotan baris (10, F-11); jalur bukti (07, F-08); kartu tindakan (08, F-09); toggle what-if dan ringkasan total ARR (F-29/F-24, Could, tanpa file); UI untuk mengubah nilai p.
- Pengganti sementara: nilai p hardcode (A15); ambang level awal ditebak lalu dikalibrasi dengan golden test; sebelum F-04 selesai, skoring diuji dengan data sinyal tiruan (fixture di test) -- tanpa mock produksi.

## 5. API, Data & Komponen yang Disentuh
| Jenis | Nama | Aksi | Acuan TDD |
| --- | --- | --- | --- |
| Modul BE | `src/server/queries/risk.ts` -- `getRanking`, `getSignals` | Pakai (`getSignals` milik 04); `getRanking` Buat | Rencana Teknis Langkah 7–8 |
| Modul BE | Modul skoring TS di `src/server/` (nama file ⚠️ ASUMSI; usul `src/server/scoring.ts`) | Buat | Rencana Teknis Langkah 7, §3.4 F06 |
| Modul BE | `src/server/neo4j.ts` (`readCypher`) | Pakai | Rencana Teknis Langkah 8 |
| Komponen FE | Tidak ada (konsumen: 10, F-11) | -- | -- |
| Tipe | `RiskRow`, `Sumber` di `src/types/graph.ts` | Pakai (ubah union `level`, lihat K-B) | Rencana Teknis Langkah 3 |
| Node/relasi | `:Akun`, `:Sinyal`, `(:Sinyal)-[:PADA]->(:Akun)` | Pakai | Rencana Teknis Langkah 7 |
| Test | `tests/golden/ranking.test.ts` | Buat/Ubah | Rencana Teknis Langkah 7 |
| Env var | `NEO4J_URI`, `NEO4J_USERNAME`, `NEO4J_PASSWORD`, `SNAPSHOT_DATE` | Pakai | Rencana Teknis Langkah 2, 12, §2.4 |

## 6. Breakdown Task Implementasi
| ID | Task | Layer | Estimasi (jam) | Bergantung pada | Output terverifikasi |
| --- | --- | --- | --- | --- | --- |
| T05-01 | Tetapkan konstanta skoring (p per level, faktor renewal, ambang level awal, urutan level) dan pastikan union `RiskRow.level` di `src/types/graph.ts` memakai Kritis/Tinggi/Waspada/Aman (koordinasi dengan 00) | BE | 0,25 | 00 (tipe), 04 (kode sinyal) | Konstanta terekspor; `tsc` lolos dengan union level versi PRD |
| T05-02 | Fungsi murni skor → level, faktor renewal, tie-break (hari renewal lalu ARR), plus unit test dengan sinyal tiruan | BE/Test | 0,5 | T05-01 | `bun test` unit lolos: akun tanpa sinyal = skor 0/Aman; urutan tie-break benar. **Bisa paralel** (tanpa DB) |
| T05-03 | `getRanking({ fokus })`: baca akun pelanggan + sinyal dari graph, filter 40 pelanggan (bukan P01–P05), bentuk `RiskRow[]`, bungkus `'use cache'` + `cacheLife`; `hariKeRenewal` dihitung terhadap `SNAPSHOT_DATE` | BE | 0,75 | T05-02, 04 (F-04: sinyal termuat) | Pemanggilan mengembalikan 40 baris terurut; `fokus: true` mengembalikan C01–C06 |
| T05-04 | Hitung `divergensi` (dashboard Hijau dan level ≥ Tinggi → "ya") dan `nilaiBerisiko = nilaiTahunan × p`; ekspor konstanta p untuk UI | BE | 0,25 | T05-03 | Unit test: tiap level menghasilkan `nilaiBerisiko` = nilaiTahunan × p; baris C01 `divergensi = ya` |
| T05-05 | Golden test peringkat/level (C01 #1 Kritis; C03, C04 Tinggi; C05 Waspada; C02, C06 Aman) + kalibrasi ambang/faktor; baca daftar akun non-fokus yang ikut tersorot | Test/BE | 0,75 | T05-04, 04 (gerbang J8) | `bun test tests/golden/ranking.test.ts` hijau; daftar akun non-fokus tersorot sudah ditinjau tim dan alasannya masuk akal |
| | **Total 2,5 jam (estimasi PRD: 1,5 jam)** | | | | |

## 7. Dependensi
- Bergantung pada fitur: 04 (F-04) -- sinyal dengan kontrak `{akun, kode, bobot, bukti_ids, fakta, sejak}` sudah termuat di graph; 00 -- `src/types/graph.ts`, `src/server/neo4j.ts`, koneksi Aura, `SNAPSHOT_DATE`.
- Memblokir fitur: 06 (F-07), 08 (F-09), 10 (F-11), 13 (F-14).
- Dependensi eksternal: instance Aura terisi (hasil `bun run rebuild`); kamus gejala R3 (PRD §8 pertanyaan 3) sudah disepakati karena memengaruhi sinyal C03/C05.
- Bisa mulai lebih dulu dengan mock: ya untuk T05-01/T05-02/T05-04 (fungsi murni, sinyal tiruan); tidak untuk T05-03 dan T05-05 yang butuh sinyal nyata dari F-04.

## 8. Cara Uji
| Acceptance criteria | Cara uji | Otomatis/Manual |
| --- | --- | --- |
| C01 peringkat 1, level Kritis (happy path) | `bun test tests/golden/ranking.test.ts` memanggil `getRanking({ fokus: true })` | Otomatis |
| Level C03/C04 Tinggi, C05 Waspada, C02/C06 Aman | Assertion golden test yang sama | Otomatis |
| Tie-break hari renewal lalu ARR | Unit test dengan dua akun skor sama | Otomatis |
| Divergensi "ya" untuk Hijau + ≥ Tinggi | Unit test fixture + cek baris C01 hasil `getRanking` | Otomatis |
| Jalur error: akun tanpa sinyal / renewal kosong | Unit test: skor 0, level Aman, tanpa `NaN` | Otomatis |
| Jalur error: Neo4j tak terjangkau | Jalankan dengan `NEO4J_URI` salah; `getRanking` melempar error yang dapat ditangani halaman (state error milik 10) | Manual |
| Rupiah berlabel "Estimasi" dan p terlihat di UI | Tinjau halaman `/` setelah 10 (F-11) mengonsumsi konstanta p | Manual |
| 40 akun, bukan 45 | Assert panjang hasil `getRanking()` = 40 | Otomatis |

## 9. Asumsi, Konflik & Risiko
- ⚠️ ASUMSI: Estimasi task 2,5 jam vs PRD 1,5 jam (+67%, di atas ambang 25%). PRD tampaknya hanya menghitung fungsi skor; query data + cache, filter pelanggan, dan kalibrasi terhadap golden test tidak terhitung. PRD A4 sendiri memperingatkan effort nyata bisa 1,5–2× -- cara validasi: bandingkan jam nyata di J9.
- ⚠️ ASUMSI: Ambang skor per level tidak ditetapkan di PRD/Rencana Teknis; nilai awal ditebak lalu dikalibrasi dengan golden test -- cara validasi: golden test + tinjauan akun non-fokus yang tersorot.
- ⚠️ ASUMSI: "Tie-break hari renewal" = renewal terdekat lebih dulu, lalu ARR lebih besar lebih dulu -- cara validasi: konfirmasi ke Dio/Laras sebelum J8.
- ⚠️ ASUMSI: `hariKeRenewal` dihitung terhadap `SNAPSHOT_DATE` (2026-10-01), bukan tanggal hari ini, agar hasil stabil dan sesuai snapshot -- cara validasi: cek C04 (renewal 5 Nov 2026) = H-35.
- ⚠️ ASUMSI: Rencana Teknis Langkah 5 memuat 45 akun, PRD menyebut 40 akun; selisih 5 diduga prospek P01–P05. `getRanking` harus menyaring pelanggan, tetapi nama properti pembeda (mis. tipe/status akun) belum diketahui -- cara validasi: periksa output F-01 (`nodes.jsonl`) dan `quality-report.json`.
- ⚠️ ASUMSI: Nama properti nilai kontrak tahunan di node `:Akun` tidak disebut di sumber (sumber kebenaran: kontrak, PRD F-01) -- cara validasi: baca skema node dari 02 (F-02).
- ⚠️ ASUMSI: Modul skoring berada di `src/server/` dengan nama file usulan `scoring.ts`; path final belum ditetapkan -- cara validasi: sepakati dengan Adrian saat F-04 mulai memakai `getSignals`.
- ⚠️ ASUMSI: File `tests/golden/ranking.test.ts` dibuat/diisi F-05 (assertion peringkat & level), sedangkan assertion sinyal diisi F-04 -- cara validasi: sepakati pembagian file dengan Adrian.
- ✅ KEPUTUSAN (K-A, 2026-10-09, Adrian): Prisma + Supabase dihapus dari repo; penyimpanan graph hanya Neo4j AuraDB Free (PRD §9, Rencana Teknis §2.3). Fitur ini tidak memakai Prisma/Supabase.
- ⛔ KONFLIK (K-B): `RiskRow.level` di Rencana Teknis Langkah 3 = "Kritis"|"Tinggi"|"Sedang"|"Rendah", PRD = Kritis/Tinggi/Waspada/Aman -- dipakai sementara: PRD; T05-01 menyesuaikan union tipe bersama 00. Nilai p Rencana (Sedang 0,2 / Rendah 0,05) dipetakan ke Waspada/Aman.
- 🔁 USULAN PERUBAHAN: tidak ada.
- Risiko: golden test tidak lulus pada J8–9 karena bobot/ambang salah, atau sinyal F-04 telat -- mitigasi/fallback: kalibrasi dilakukan setelah sinyal ada; bila F-04 telat, T05-02/T05-04 tetap selesai dengan data tiruan.
- Risiko: juri mempertanyakan angka rupiah (A15) -- mitigasi: label "Estimasi" + p terlihat di UI; siapkan jawaban.

- ✅ KEPUTUSAN (2026-10-09, Adrian): semua identifier, konten aplikasi, dan UI memakai bahasa Inggris; dokumentasi tetap Indonesia. Kosakata graph yang tersimpan di Aura (label `Akun`, `Sinyal`, ..., tipe relasi, kode sinyal, nama properti dataset) TIDAK diterjemahkan karena ditetapkan dokumen produk dan sudah ada di data; pemetaannya ada di `docs/glossary.md`. Tipe di `src/types/graph.ts` kini berbahasa Inggris (mis. `RiskRow`: `account`, `name`, `dashboard`, `level`, `score`, `diverges`, `renewalDays`, `annualValue`, `atRiskValue`, `p`, `topSignals`; level `Critical/High/Watch/Safe` = Kritis/Tinggi/Waspada/Aman, warna dashboard `Green/Yellow/Red` = Hijau/Kuning/Merah).
- ✅ KEPUTUSAN (2026-10-09, Adrian): tugas milik Dio untuk F-05 s.d. F-11 dikerjakan Adrian; pembagian penanggung jawab di header diabaikan sementara.
- ✅ HASIL: `src/server/scoring/{config,score,rank}.ts` (fungsi murni) + `src/server/queries/risk.ts` (`fetchRanking`, `fetchSignals`, `fetchAccounts`) + `src/server/queries/index.ts` (`getRanking({ focus })`, `getSignals`, dibungkus `'use cache'` + `cacheLife('minutes')`). Parameter diganti nama dari `fokus` menjadi `focus`. Tes: `tests/server/scoring/*.test.ts` (unit) dan `tests/golden/ranking.test.ts` (Aura, baca-saja).
- ✅ HASIL GOLDEN (data nyata): 40 baris, bukan prospek. Urutan fokus: C01 skor 10 (Critical, diverges), C04 skor 6 (High, diverges), C03 skor 5 (High), C05 skor 4 (Watch), C02 dan C06 Safe; tidak ada akun di luar C01–C06 yang tidak Safe. Rupiah (Estimasi): C01 Rp 89.964.000 (p 0,6), C03 Rp 27.216.000 (p 0,4). C04 H-35 terhadap `SNAPSHOT_DATE` 2026-10-01.
- ✅ KALIBRASI (T05-01/T05-05): faktor renewal mengikuti dokumen (≤60 hari 1,5; ≤120 hari 1,25; selebihnya 1,0). Ambang level: Critical ≥ 8, High ≥ 4,5, Watch ≥ 2. High dipasang 4,5 (bukan 5) agar tidak ada akun golden tepat di batas: C03 = 5 (High) dan C05 = 4 (Watch) berselisih 1 poin. Kepekaan: bila bobot sinyal C03/C05 berubah, ambang ini perlu ditinjau ulang.
- 🔁 USULAN PERUBAHAN: konstanta `FOCUS_ACCOUNT_IDS` (C01–C06) dan nilai `P_BY_LEVEL` ada di `src/types/graph.ts` agar UI dan server memakai satu sumber; pemetaan warna dashboard data (Hijau/Kuning/Merah) → `Green/Yellow/Red` dilakukan di batas query dan melempar error bila ada nilai tak dikenal.

## 10. Definition of Done
- [ ] Semua acceptance criteria di section 3 lolos uji di section 8
- [ ] Semua task di section 6 selesai, atau sudah dipindah secara eksplisit
- [ ] Lint, typecheck, dan build lulus (script `typecheck` belum ada di `package.json` saat file ini ditulis)
- [ ] Tidak ada secret yang di-hardcode; konfigurasi lewat environment variable
- [ ] Implementasi sesuai kontrak dan skema TDD, tanpa perubahan yang tidak tercatat
- [ ] UI di jalur demo punya tampilan loading, kosong, dan error (dikerjakan di 10 / F-11; fitur ini menjamin `getRanking` melempar error yang bisa ditangani)
- [ ] Sudah dicek di lingkungan deploy (peringkat C01 di URL produksi)
- [ ] PR sudah direview dan di-merge, lalu status di header file diperbarui
- [ ] Union `RiskRow.level` versi PRD sudah dipakai di `src/types/graph.ts` dan disetujui pemilik 00
- [ ] Konstanta p terekspor dan dipakai UI, tidak diduplikasi di komponen
