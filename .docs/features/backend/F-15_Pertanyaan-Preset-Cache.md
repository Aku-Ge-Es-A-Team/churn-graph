# 14 -- Pertanyaan preset + cache jawaban
> ID PRD: F-15 · Prioritas: Should #1 · Penanggung jawab: Dio (Backend & AI) + Tegar (Frontend) · Estimasi: 1 jam-orang (PRD); total task 2,25 jam · Status: Belum dimulai

## 1. Ringkasan Fitur
- Apa: 12 tombol pertanyaan preset (dari `docs/questions.md`) yang menampilkan jawaban ber-cache (JSON statis: jawaban, klaim, `bukti_ids`, subgraph) dalam <1 detik, dibuat dengan menjalankan F-14 sekali lalu menyimpan hasil yang lolos F-10.
- Untuk siapa: Bima -- demo tetap lancar walau LLM lambat atau gagal.
- Peran di ★ jalur demo utama: bukan bagian jalur demo utama; fallback langkah 6 dan penyelamat gerbang J12 (bila F-14 gagal, demo memakai F-15 + konsol Aura).

## 2. Acuan PRD & TDD
- PRD: §4 metrik "Pertanyaan preset terjawab dengan bukti" (≥6/12 di J12, ≥10/12 di J15), §5 Pengganti sementara ("Jawaban pertanyaan preset: hasil P14 di-cache sebagai JSON"), §6 F-15 & catatan "ID F-13 tidak dipakai", §7 (J11–13; urutan pemotongan: F-15 dipotong paling akhir), §8 risiko F-14.
- TDD (acuan sementara): Rencana Teknis §1.3 Langkah 1 (`docs/questions.md`, 12 pertanyaan), Langkah 9 (efisiensi token: jawaban pertanyaan preset di-cache), Langkah 10 (`/explore`: konsol + pertanyaan preset; `/tanya`), Langkah 11 (cache preset), Langkah 13 (rantai fallback: preset → konsol Cypher → konsol Aura → video), §3.4 "F14 · Konsol Cypher & pertanyaan preset" (ID F14 milik Rencana, bukan ID PRD).
- Keputusan yang dikunci:
  - Preset hanyalah tombol yang memanggil F-14 sekali dan menyimpan hasilnya; bukan pengganti kemampuan menjawab pertanyaan baru.
  - Hanya jawaban yang lolos validator F-10 yang boleh masuk cache.
  - Jawaban yang gagal diperbaiki dengan menambah tool/contoh di F-14, bukan hardcode jawaban (Rencana Teknis Langkah 11).
  - Fitur Should #1: dipotong paling akhir.

## 3. User Stories & Acceptance Criteria
- User story: Sebagai Bima, saya ingin tombol pertanyaan umum yang langsung terjawab, agar demo tetap lancar walau LLM lambat.
- Acceptance criteria:
  - Diberikan 12 tombol preset, ketika diklik, maka jawaban ber-cache tampil < 1 detik.
  - Diberikan F-14 gagal di J12, ketika demo berjalan, maka preset tetap menampilkan jawaban + bukti dari cache.
- Kriteria teknis tambahan:
  - (tambahan teknis) Cache memuat subgraph (`GraphPayload`) sehingga bukti tetap tampil tanpa memanggil Aura atau LLM.
  - (tambahan teknis) Preset yang belum punya cache valid menampilkan pesan jelas, bukan error atau jawaban kosong.
  - (tambahan teknis) Cache memuat metadata `SNAPSHOT_DATE` dan waktu pembuatan agar kedaluwarsa setelah `rebuild` mudah dikenali.

## 4. Ruang Lingkup Fitur
- Termasuk: format dan lokasi cache JSON; skrip pembuat cache (memanggil logika F-14 untuk 12 preset, memvalidasi lewat F-10, menulis JSON); modul pembaca cache; 12 tombol preset + tampilan jawaban/bukti dari cache; pembuatan cache final; uji kecepatan dan mode tanpa F-14/LLM.
- Tidak termasuk: logika Q&A, tool, validator (13, 09); konsol Cypher (21, F-22); jawaban untuk pertanyaan bebas; video demo dan skrip demo (di luar file fitur).
- Pengganti sementara: fixture JSON jawaban preset untuk FE sebelum F-14 stabil (tidak tampil di demo final); cache final menggantikannya.

## 5. API, Data & Komponen yang Disentuh
| Jenis | Nama | Aksi | Acuan TDD |
| --- | --- | --- | --- |
| Berkas data | Cache jawaban preset JSON (path ⚠️ ASUMSI, usul `data/cache/preset-answers.json`, di-commit agar ikut deploy Vercel) | Buat | PRD §5; Rencana Teknis Langkah 9 |
| Berkas data | `docs/questions.md` (daftar 12 pertanyaan) | Pakai | Rencana Teknis Langkah 1 |
| Modul BE | Skrip pembuat cache di `scripts/` (nama ⚠️ ASUMSI, usul `scripts/cache-preset.ts`) | Buat | Rencana Teknis Langkah 4 (pola skrip), Langkah 11 |
| Modul BE | Pembaca cache di `src/server/` (nama ⚠️ ASUMSI) | Buat | Rencana Teknis Langkah 8 |
| Modul BE | Logika `POST /api/ask` (13) dan validator (09) | Pakai | Rencana Teknis Langkah 9 |
| Komponen FE | Tombol preset + panel jawaban di halaman `/tanya` (⚠️ ASUMSI; Rencana menyebut `/explore`) | Buat | Rencana Teknis Langkah 10 |
| Env var | `<LLM_API_KEY sesuai provider>` (hanya saat membuat cache), `NEO4J_*`, `SNAPSHOT_DATE` | Pakai | Rencana Teknis Langkah 2, 12 |
| Endpoint | Tidak ada endpoint baru; cache dibaca Server Component | -- | -- |

## 6. Breakdown Task Implementasi
| ID | Task | Layer | Estimasi (jam) | Bergantung pada | Output terverifikasi |
| --- | --- | --- | --- | --- | --- |
| T14-01 | Tetapkan skema cache per preset (`id`, `pertanyaan`, `jawaban`, `klaim[]`, `graph`, `snapshot`, `dibuat`) dan lokasi berkasnya; salin 12 pertanyaan dari `docs/questions.md` | BE | 0,25 | 13 (F-14: kontrak respons), 00 (`docs/questions.md`) | Skema tertulis sebagai tipe TS; daftar 12 preset terekspor |
| T14-02 | Skrip pembuat cache: untuk tiap preset panggil logika F-14 (lewat fungsi internal atau route), validasi dengan F-10, tulis hanya yang lolos, laporkan preset gagal | BE | 0,5 | T14-01, 13 (F-14) | Menjalankan skrip menghasilkan JSON berisi N entri valid dan daftar preset yang gagal |
| T14-03 | Pembaca cache: ambil jawaban per `id`, tangani preset tanpa cache dengan pesan jelas | BE | 0,25 | T14-01 | Test: `id` valid → objek lengkap; `id` tidak ada → hasil "belum tersedia" terdefinisi. **Bisa paralel** (fixture) |
| T14-04 | UI: 12 tombol preset + panel jawaban (jawaban, chip ID bukti, subgraph dari cache), state loading/kosong/error | FE (Tegar) | 0,5 | T14-03 (atau fixture), 13 (halaman `/tanya`) -- **bisa paralel** | Klik tombol menampilkan jawaban + bukti tanpa pemanggilan jaringan ke LLM/Aura |
| T14-05 | Buat cache final setelah F-04–F-09 stabil (J11–13) dan ulangi setelah `rebuild` terakhir; tinjau tiap jawaban dan perbaiki yang salah dengan memperbaiki F-14 (bukan hardcode) | BE/Test | 0,5 | T14-02, T13-08 (hasil evaluasi preset) | Jumlah entri valid ≥ target (6 di J12; 10 di J15); tiap jawaban ditandai ditinjau |
| T14-06 | Uji: tampil <1 detik, mode tanpa F-14/LLM (key dicabut) dan tanpa Aura, preset belum ter-cache | Test | 0,25 | T14-04, T14-05 | Waktu tampil terukur <1 detik; semua preset ter-cache tetap tampil saat key LLM/Aura dimatikan |
| | **Total 2,25 jam (estimasi PRD: 1 jam)** | | | | |

## 7. Dependensi
- Bergantung pada fitur: 13 (F-14) -- logika Tanya Graph, kontrak respons, halaman `/tanya`; transitif: 09 (F-10) untuk validasi; 00 untuk `docs/questions.md`.
- Memblokir fitur: tidak ada.
- Dependensi eksternal: API key LLM dan kuota saat membuat cache; Aura terisi data final (dijalankan setelah `rebuild` terakhir).
- Bisa mulai lebih dulu dengan mock: ya untuk FE (T14-04) dan pembaca cache (T14-03) memakai fixture; skrip pembuat dan cache final menunggu F-14.

## 8. Cara Uji
| Acceptance criteria | Cara uji | Otomatis/Manual |
| --- | --- | --- |
| 12 tombol preset → jawaban ber-cache <1 detik (happy path) | Klik tiap tombol di URL lokal/produksi; ukur waktu tampil (DevTools atau `performance.now()`) | Manual |
| Test pembaca cache | `bun test`: `id` valid mengembalikan jawaban, klaim, dan graph | Otomatis |
| F-14 gagal → preset tetap menampilkan jawaban + bukti | Cabut/rusakkan key LLM dan matikan Aura (atau ubah `NEO4J_URI`), muat ulang `/tanya`, klik preset | Manual |
| Jalur error: preset tanpa cache | Hapus satu entri uji; tombol menampilkan pesan "belum tersedia", tidak crash | Otomatis/Manual |
| Hanya jawaban lolos F-10 di cache | Test skrip: entri dengan `bukti_ids` palsu tidak ditulis | Otomatis |
| Cache tidak kedaluwarsa setelah `rebuild` | Bandingkan `snapshot`/`dibuat` di cache dengan `SNAPSHOT_DATE` dan `rebuild` terakhir | Manual |

## 9. Asumsi, Konflik & Risiko
- ⚠️ ASUMSI: Estimasi task 2,25 jam vs PRD 1 jam (+125%, di atas ambang 25%). PRD tampaknya hanya menghitung "tombol + simpan JSON"; skrip pembuat, pembaca, pengujian mode offline, dan peninjauan jawaban tidak terhitung -- cara validasi: ukur jam nyata di J13.
- ⚠️ ASUMSI: Cache disimpan sebagai berkas JSON yang di-commit (path usul `data/cache/preset-answers.json`) karena filesystem runtime Vercel tidak dapat ditulis; path final belum ditetapkan di sumber -- cara validasi: sepakati dengan Adrian dan cek deploy.
- ⚠️ ASUMSI: Tombol preset dipasang di `/tanya` agar satu halaman dengan F-14; Rencana Teknis Langkah 10 menaruh pertanyaan preset di `/explore` -- cara validasi: keputusan tata letak dengan Tegar; keduanya boleh menampilkan komponen yang sama.
- ⚠️ ASUMSI: Cache dibaca langsung oleh Server Component/modul server tanpa endpoint baru -- cara validasi: integrasi dengan Tegar; <1 detik karena data statis.
- ⚠️ ASUMSI: 12 pertanyaan preset = 12 pertanyaan di `docs/questions.md` (Rencana Teknis Langkah 1); belum ada daftar final yang dikunci -- cara validasi: cek `docs/questions.md` dari 00.
- ⛔ KONFLIK (K-A): repo memuat Prisma/Supabase (commit a5d933a), PRD §9 + Rencana Teknis §2.3 tidak memakainya -- dipakai sementara: ikuti PRD; cache berupa berkas JSON, bukan tabel `src/lib/db.ts`.
- 🔁 USULAN PERUBAHAN: tambah script `package.json` untuk membuat cache preset (Rencana Teknis Langkah 4 hanya mendaftar etl, load, derive, signals, rebuild, test:golden) -- alasan: pembuatan ulang cache setelah tiap `rebuild` harus mudah diulang. Task tidak terblokir: skrip dijalankan langsung dengan `bun <path skrip>` sampai script terdaftar.
- Risiko: cache kedaluwarsa setelah aturan/bobot berubah atau `rebuild` -- mitigasi: buat ulang cache setelah freeze J15 dan setelah `rebuild` terakhir; simpan `snapshot`/`dibuat` di tiap entri.
- Risiko: jawaban ter-cache berisi klaim salah yang lolos validator -- mitigasi: tinjau manual setiap jawaban (T14-05).
- Risiko: <10/12 preset berhasil karena batas tool tetap F-14 (lihat 13) -- mitigasi: lapor di T13-08; preset yang tidak terjawab disembunyikan atau diganti, tidak diisi jawaban buatan.

## 10. Definition of Done
- [ ] Semua acceptance criteria di section 3 lolos uji di section 8
- [ ] Semua task di section 6 selesai, atau sudah dipindah secara eksplisit
- [ ] Lint, typecheck, dan build lulus (script `typecheck` belum ada di `package.json` saat file ini ditulis)
- [ ] Tidak ada secret yang di-hardcode; konfigurasi lewat environment variable (cache tidak memuat key atau kredensial)
- [ ] Implementasi sesuai kontrak dan skema TDD, tanpa perubahan yang tidak tercatat
- [ ] UI di jalur demo punya tampilan loading, kosong, dan error
- [ ] Sudah dicek di lingkungan deploy (preset tampil dari cache di URL produksi)
- [ ] PR sudah direview dan di-merge, lalu status di header file diperbarui
- [ ] Cache final dibuat setelah `rebuild` terakhir dan di-commit; jumlah preset valid tercatat (target 6 di J12, 10 di J15)
- [ ] Preset tetap berfungsi dengan key LLM dan Aura dimatikan
