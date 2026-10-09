# 08 -- Tindakan retensi berbasis preseden
> ID PRD: F-09 · Prioritas: Must · Penanggung jawab: Dio (Backend & AI) · Estimasi: 2 jam-orang (PRD); total task 3,75 jam · Status: Implementasi selesai dan terverifikasi (2026-10-09); menunggu review PR

## 1. Ringkasan Fitur
- Apa: Kartu tindakan retensi per akun berisiko: jenis tindakan (dari tabel aturan kode sinyal → tindakan → tipe keputusan preseden), preseden `decision_log` beserta penyetujunya, perbandingan biaya vs rupiah berisiko, dan penanda "menyimpang dari preseden" bila usulan melewati batas (mis. diskon >15%).
- Untuk siapa: Laras -- menyetujui tindakan tanpa menebak karena ada keputusan serupa di masa lalu.
- Peran di ★ jalur demo utama: langkah 4 (kartu tindakan C01: preseden, penyetuju, biaya vs rupiah berisiko, tanda bila menyimpang dari batas diskon 15%); juga kasus C03 (eskalasi bug + kompensasi) dan C04.

## 2. Acuan PRD & TDD
- PRD: §2 T2, §3 kasus penggunaan 1, 2, 3, §5 aturan acara ("penyimpangan dari preseden dijelaskan"), §6 F-09, §7 (J9–11), §9 jalur demo langkah 4.
- TDD (acuan sementara): Rencana Teknis §3.4 "F08 · Rekomendasi retensi berbasis preseden" (ID F08 milik Rencana, bukan ID PRD), §1.3 Langkah 1 (pertanyaan 5, 6, 11), Langkah 3 (relasi `MENYETUJUI`, `DIDASARKAN_PADA`, `MENJANJIKAN`, node `:Keputusan`, `:Karyawan`), Langkah 8 (`getAccountEvidence` mengembalikan "GraphPayload + kartu tindakan"; `src/server/queries/precedents.ts`), Langkah 9 (tool `find_precedents`).
- Keputusan yang dikunci:
  - Tabel aturan `kode sinyal → jenis tindakan → tipe keputusan preseden`; contoh dari Rencana: anomali terkait bug → eskalasi bug + kompensasi → D-2025-08, D-2026-05, D-2025-03.
  - Preseden diambil lewat query Cypher (tanpa embedding similarity; Rencana Teknis §3.4 F08).
  - Penyimpangan diskon >15% ditandai "menyimpang dari preseden D-2025-02" dan meminta alasan.
  - Angka rupiah berasal dari output skoring 05 (F-05) dan berlabel Estimasi.
  - Kode sinyal hanya dirujuk dari F-04; tidak ada kode baru.

## 3. User Stories & Acceptance Criteria
- User story: Sebagai Laras, saya ingin tindakan retensi yang merujuk keputusan serupa di masa lalu, agar saya bisa menyetujuinya tanpa menebak.
- Acceptance criteria:
  - Diberikan akun berisiko, ketika kartu tindakan dibuka, maka tampil jenis tindakan, preseden `decision_id` + penyetuju (`MENYETUJUI`), serta biaya vs rupiah berisiko.
  - Diberikan usulan diskon >15%, ketika diperiksa, maka kartu menandai "menyimpang dari preseden D-2025-02" dan meminta alasan.
  - Diberikan C03, ketika tindakan dibuka, maka tindakannya adalah eskalasi bug + kompensasi, bukan diskon retensi.
- Kriteria teknis tambahan:
  - (tambahan teknis) Setiap preseden pada kartu membawa ID node `:Keputusan` dan ID penyetuju yang ada di graph (dapat ditelusuri / dipakai sebagai `bukti_ids`).
  - (tambahan teknis) Akun tanpa tindakan yang relevan (level Aman) tidak menghasilkan kartu palsu; mengembalikan hasil kosong yang terdefinisi.
  - (tambahan teknis) Biaya kompensasi 1 bulan = nilai kontrak tahunan / 12 (contoh Rencana Teknis: C03 ≈ Rp 5,67 jt vs nilai berisiko ≈ Rp 27,2 jt, Estimasi).

## 4. Ruang Lingkup Fitur
- Termasuk: tabel aturan sinyal → tindakan → tipe preseden; query preseden (penyetuju + bukti); pemeriksa penyimpangan; perbandingan biaya vs rupiah berisiko; perakitan data kartu tindakan; komponen FE kartu di `/akun/[id]`; pengujian C01/C03/C04.
- Tidak termasuk: kode dan bobot sinyal (04, F-04); skor/level/rupiah (05, F-05); jalur bukti dan viewer graph (07, F-08; 11, F-12); tool `find_precedents` untuk Tanya Graph (13, F-14, memakai modul ini); tombol Setujui/Tolak, pemilik, tenggat (F-25, Could, tanpa file); embedding similarity (OUT OF SCOPE X2).
- Pengganti sementara: fixture kartu C01/C03/C04 untuk FE sampai fungsi server siap (tidak tampil di demo final); nilai biaya tindakan non-kompensasi (mis. biaya diskon) dihitung dengan rumus sederhana yang dicatat sebagai asumsi.

## 5. API, Data & Komponen yang Disentuh
| Jenis | Nama | Aksi | Acuan TDD |
| --- | --- | --- | --- |
| Modul BE | `src/server/queries/precedents.ts` (query preseden, tabel aturan, pemeriksa penyimpangan, perakit kartu) | Buat | Rencana Teknis Langkah 8, §3.4 F08 |
| Modul BE | `getRanking`/modul skoring (nilai berisiko, konstanta p) | Pakai | Rencana Teknis Langkah 7 |
| Modul BE | `src/server/neo4j.ts` (`readCypher`) | Pakai | Rencana Teknis Langkah 8 |
| Node/relasi | `:Keputusan` (properti `tipe`, `nilai`), `:Karyawan`, `MENYETUJUI`, `DIDASARKAN_PADA`, `MENJANJIKAN {status_janji}`, `:Sinyal`, `PADA` | Pakai | Rencana Teknis Langkah 3, 7 |
| Komponen FE | Kartu tindakan di `/akun/[id]` | Buat | Rencana Teknis Langkah 10 |
| Tipe | Tipe kartu tindakan (⚠️ ASUMSI nama) -- lokal di `precedents.ts`, usul dipromosikan ke `src/types/graph.ts` | Buat | Rencana Teknis Langkah 3 (lihat 🔁) |
| Endpoint | Tidak ada endpoint baru; dibaca Server Component | -- | Rencana Teknis Langkah 8 |
| Env var | `NEO4J_URI`, `NEO4J_USERNAME`, `NEO4J_PASSWORD` | Pakai | Rencana Teknis Langkah 2 |

## 6. Breakdown Task Implementasi
| ID | Task | Layer | Estimasi (jam) | Bergantung pada | Output terverifikasi |
| --- | --- | --- | --- | --- | --- |
| T08-01 | Susun tabel aturan `kode sinyal F-04 → jenis tindakan → tipe keputusan preseden` untuk semua kode F-04 yang relevan (isi awal dari Rencana: anomali terkait bug → eskalasi bug + kompensasi; janji dilanggar, outreach tak berbalas, dan risiko pembayaran dipetakan setelah kode F-04 dikunci); tinjau `decision_log` untuk tipe & ID yang tersedia | BE | 0,5 | 04 (kode sinyal), 00 (data termuat) | Tabel terekspor sebagai konstanta; tiap kode F-04 yang ber-bobot punya tindakan atau eksplisit "tanpa tindakan"; ID preseden contoh (D-2025-08, D-2026-05, D-2025-03, D-2025-02) diverifikasi ada di graph |
| T08-02 | Query preseden: keputusan `:Keputusan` serupa per `tipe`/akun beserta `MENYETUJUI` (penyetuju) dan `DIDASARKAN_PADA` (bukti), keluaran dengan ID node | BE | 0,5 | T08-01 | Panggilan untuk tipe "diskon" mengembalikan D-2025-02 beserta penyetujunya; ID node tersedia |
| T08-03 | Pemeriksa penyimpangan: bandingkan usulan (mis. persen diskon) dengan batas preseden; keluarkan "menyimpang dari preseden <decision_id>" + flag `wajib_alasan` | BE | 0,25 | T08-02 | Unit test: diskon 20% → menyimpang dari D-2025-02 + wajib alasan; 15% → tidak menyimpang. **Bisa paralel** (fungsi murni) |
| T08-04 | Biaya vs rupiah berisiko: biaya tindakan (kompensasi 1 bulan = nilai tahunan/12; biaya diskon = persen × nilai tahunan) dibandingkan `nilaiBerisiko` dari 05 | BE | 0,25 | T08-01, 05 (F-05) | Unit test: C03 biaya ≈ Rp 5,67 jt vs berisiko ≈ Rp 27,2 jt (Estimasi, selaras Rencana Teknis §3.4 F06/F08) |
| T08-05 | Perakit data kartu tindakan per akun (jenis, preseden + penyetuju, biaya vs berisiko, penyimpangan) dan fungsi server yang dipanggil `/akun/[id]`; bungkus cache baca | BE | 0,5 | T08-02, T08-03, T08-04 | Panggilan untuk C01, C03, C04 mengembalikan kartu lengkap; C03 = eskalasi bug + kompensasi (bukan diskon) |
| T08-06 | Promosikan tipe kartu tindakan ke `src/types/graph.ts` agar FE mengimpor kontrak yang sama | BE | 0,25 | **Terblokir** menunggu 🔁 USULAN PERUBAHAN disetujui; sementara tipe tetap lokal di `precedents.ts` | `tsc` lolos dan FE mengimpor tipe dari `src/types/graph.ts` |
| T08-07 | Kartu tindakan di `/akun/[id]`: jenis tindakan, preseden + penyetuju, biaya vs berisiko berlabel Estimasi, penanda penyimpangan + kolom alasan (tampilan saja); state loading/kosong/error | FE (Tegar, ⚠️ ASUMSI pemilik) | 0,75 | T08-05 (atau fixture) -- **bisa paralel** | Kartu tampil di `/akun/C01` memakai fixture, lalu data nyata; tidak ada error konsol |
| T08-08 | Uji C01 (diskon 15% + janji FEAT-07), C03 (eskalasi bug + kompensasi), C04, usulan diskon >15% menyimpang, dan jalur error akun tanpa tindakan/ID tak dikenal | Test | 0,75 | T08-05, T08-07 | `bun test` hijau; kartu C01/C03/C04 diperiksa manual di UI |
| | **Total 3,75 jam (estimasi PRD: 2 jam)** | | | | |

## 7. Dependensi
- Bergantung pada fitur: 04 (F-04) -- kode sinyal dan sinyal termuat; 05 (F-05) -- `nilaiBerisiko`, level; 00 -- `readCypher`, data `decision_log` termuat lewat ETL/loader.
- Memblokir fitur: 13 (F-14) -- tool `find_precedents`.
- Dependensi eksternal: `decision_log` termuat dengan `tipe`, penyetuju, dan `bukti_interaction_id`; kode sinyal F-04 final (A13: pemetaan S1–S8/Z1–Z3 perlu dikonfirmasi Dio).
- Bisa mulai lebih dulu dengan mock: ya untuk T08-03, T08-04, dan FE (T08-07 dengan fixture); T08-01/T08-02 menunggu kode sinyal F-04 dan graph terisi.

## 8. Cara Uji
| Acceptance criteria | Cara uji | Otomatis/Manual |
| --- | --- | --- |
| Akun berisiko → jenis tindakan, preseden + penyetuju, biaya vs berisiko (happy path C01) | Test: fungsi server C01 mengembalikan ketiganya; cek kartu di UI | Otomatis + Manual |
| Usulan diskon >15% → "menyimpang dari preseden D-2025-02" + minta alasan | Unit test pemeriksa penyimpangan dengan 20% (menyimpang) dan 15% (tidak) | Otomatis |
| C03 → eskalasi bug + kompensasi, bukan diskon | Test fungsi server C03; periksa jenis tindakan | Otomatis |
| C04 mendapat kartu dengan preseden | Test fungsi server C04 (tipe tindakan mengikuti tabel T08-01) | Otomatis |
| Jalur error: akun level Aman / tanpa tindakan / ID tak dikenal | Test: hasil kosong terdefinisi atau not-found, bukan exception tak tertangani | Otomatis |
| Tampilan kartu (loading/kosong/error) | Buka `/akun/C01`, `/akun/C03`, `/akun/C02` dan matikan koneksi Aura untuk state error | Manual |

## 9. Asumsi, Konflik & Risiko
- ⚠️ ASUMSI: Estimasi task 3,75 jam vs PRD 2 jam (+88%, di atas ambang 25%). PRD tidak menghitung komponen FE kartu (tidak ada pemilik FE di manifest untuk kartu tindakan), pengujian tiga akun, dan kalibrasi tabel aturan -- cara validasi: bandingkan jam nyata di J11.
- ⚠️ ASUMSI: Kartu tindakan di `/akun/[id]` dibangun Tegar (T08-07) karena tidak ada file frontend untuk kartu ini di manifest; PRD menetapkan F-09 hanya ke Dio -- cara validasi: konfirmasi pembagian dengan tech lead/Tegar.
- ⚠️ ASUMSI: Pemetaan kode sinyal F-04 → tindakan hanya terdokumentasi untuk anomali terkait bug dan diskon; pemetaan untuk C04 (outreach tak berbalas, telat bayar) belum ada di sumber dan harus ditentukan dari `decision_log` -- cara validasi: tinjau preseden `decision_log` untuk tipe pembayaran/pengecualian.
- ⚠️ ASUMSI: ID preseden (D-2025-02, D-2025-08, D-2026-05, D-2025-03) diambil dari Rencana Teknis §3.4 F08 dan belum diverifikasi terhadap data -- cara validasi: query di T08-01.
- ⚠️ ASUMSI: "Usulan diskon" berasal dari tindakan yang direkomendasikan tabel aturan (mis. C01 diskon 15% + janji FEAT-07) atau parameter fungsi pemeriksa; PRD tidak menetapkan input UI untuk mengetik usulan -- cara validasi: tentukan skenario demo "menyimpang" dengan Tegar (fixture/parameter) sebelum J11.
- ⚠️ ASUMSI: Rumus biaya diskon = persen × nilai tahunan dan biaya kompensasi = 1 bulan (nilai tahunan/12) berasal dari contoh Rencana; belum ada rumus biaya resmi -- cara validasi: cocokkan dengan Laras/tim sebelum demo.
- ✅ KEPUTUSAN (K-A, 2026-10-09, Adrian): Prisma + Supabase dihapus dari repo; penyimpanan graph hanya Neo4j AuraDB Free (PRD §9, Rencana Teknis §2.3). Fitur ini tidak memakai Prisma/Supabase.
- 🔁 USULAN PERUBAHAN: tambahkan tipe kartu tindakan (jenis tindakan, preseden[], biaya, berisiko, penyimpangan) ke `src/types/graph.ts` -- alasan: Rencana Teknis hanya menyebut "kartu tindakan" tanpa tipe, padahal FE (Tegar) dan F-14 perlu kontrak yang sama; T08-06 terblokir sampai disetujui (sementara tipe lokal di `precedents.ts`).
- Risiko: tabel aturan tidak mencakup semua kode F-04 sehingga akun berisiko tanpa tindakan -- mitigasi: T08-01 menandai kode tanpa tindakan secara eksplisit dan menampilkan "belum ada rekomendasi" bukan kartu kosong.
- Risiko: preseden di `decision_log` tidak cocok persis dengan skenario -- mitigasi: tampilkan preseden terdekat dan jelaskan selisihnya (aturan acara penyimpangan).

- ✅ KEPUTUSAN (2026-10-09, Adrian): semua identifier, konten aplikasi, dan UI memakai bahasa Inggris; dokumentasi tetap Indonesia. Kosakata graph yang tersimpan di Aura (label `Akun`, `Sinyal`, ..., tipe relasi, kode sinyal, nama properti dataset) TIDAK diterjemahkan karena ditetapkan dokumen produk dan sudah ada di data; pemetaannya ada di `docs/glossary.md`. Tipe di `src/types/graph.ts` kini berbahasa Inggris (mis. `RiskRow`: `account`, `name`, `dashboard`, `level`, `score`, `diverges`, `renewalDays`, `annualValue`, `atRiskValue`, `p`, `topSignals`; level `Critical/High/Watch/Safe` = Kritis/Tinggi/Waspada/Aman, warna dashboard `Green/Yellow/Red` = Hijau/Kuning/Merah).
- ✅ KEPUTUSAN (2026-10-09, Adrian): tugas milik Dio untuk F-05 s.d. F-11 dikerjakan Adrian; pembagian penanggung jawab di header diabaikan sementara.
- ✅ HASIL: `src/server/queries/precedents.ts` (tabel aturan `ACTION_FOR_SIGNAL`, `selectPrecedents`, `deriveDiscountPolicy`, `checkDiscountProposal`, `buildRetentionCard`, `fetchRetentionCard`), komponen `src/components/account/retention-card.tsx` (termasuk penguji usulan diskon) di `/akun/[id]`. Tes: `tests/golden/retention.test.ts`.
- ✅ TABEL AKSI (kode sinyal → tindakan): bug (`TIKET_BUG_TAK_TERTAUT`, `ANOMALI_USAGE_RILIS_BUG`, `TIKET_TAK_DIREPRODUKSI`) → eskalasi bug + kompensasi (preseden D-2025-08, D-2026-05, D-2024-07, kompensasi D-2025-03); `JANJI_DILANGGAR` → pulihkan janji fitur (preseden janji yang ditepati: D-2024-05, D-2026-01, penyetuju E09); `KOMPETITOR_DISEBUT` → tinjau ancaman kompetitor sebelum diskon tambahan; `RISIKO_PEMBAYARAN` → tinjau tempo bayar (preseden D-2024-03, D-2025-10, D-2026-03); `CHAMPION_KELUAR` dan `OUTREACH_TAK_BERBALAS` → kontak tingkat eksekutif (tanpa preseden di decision_log, dinyatakan eksplisit). Akun level Safe → kartu kosong terdefinisi.
- ✅ BATAS DISKON dari data, bukan konstanta: keputusan diskon ditolak yang alasannya menyebut batas ("Di atas batas 15%") = D-2025-02 → batas 15%. C01 sudah 15% sehingga headroom 0: usulan 20% → "Deviates from precedent D-2025-02 … written justification is required"; 15% → tidak menyimpang.
- ✅ BIAYA vs RISIKO: kompensasi = nilai tahunan / 12. C03: Rp 5.670.000 vs Rp 27.216.000 berisiko (Estimasi), C03 mendapat eskalasi bug + kompensasi, bukan diskon.
- ✅ T08-06 diterapkan sebagai 🔁: tipe kartu (`RetentionCard`, `RetentionAction`, `DecisionPrecedent`, `DiscountPolicy`, `DeviationCheck`) dipromosikan ke `src/types/graph.ts`.
- ⚠️ ASUMSI: biaya diskon = 1% nilai tahunan per poin persentase diskon tambahan; pemetaan tindakan untuk `CHAMPION_KELUAR`/`OUTREACH_TAK_BERBALAS`/`RISIKO_PEMBAYARAN` disusun dari tipe keputusan di decision_log, belum dikonfirmasi tim; kartu FE dibangun di sini (tanpa pemilik FE terpisah).

## 10. Definition of Done
- [ ] Semua acceptance criteria di section 3 lolos uji di section 8
- [ ] Semua task di section 6 selesai, atau sudah dipindah secara eksplisit (T08-06 bergantung pada keputusan 🔁)
- [ ] Lint, typecheck, dan build lulus (script `typecheck` belum ada di `package.json` saat file ini ditulis)
- [ ] Tidak ada secret yang di-hardcode; konfigurasi lewat environment variable
- [ ] Implementasi sesuai kontrak dan skema TDD, tanpa perubahan yang tidak tercatat
- [ ] UI di jalur demo punya tampilan loading, kosong, dan error
- [ ] Sudah dicek di lingkungan deploy (kartu C01 di URL produksi)
- [ ] PR sudah direview dan di-merge, lalu status di header file diperbarui
- [ ] Setiap preseden pada kartu membawa ID node yang valid di graph; tidak ada preseden karangan
- [ ] Angka rupiah pada kartu berasal dari modul skoring 05 dan berlabel Estimasi
