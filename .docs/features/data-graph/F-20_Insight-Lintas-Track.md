# 19 -- Insight lintas track
> ID PRD: F-20 · Prioritas: Should #6 · Penanggung jawab: Adrian (Data Graph) · Estimasi: 1,5 jam-orang (PRD) · Status: Belum dimulai

## 1. Ringkasan Fitur
- Apa: tiga kartu temuan yang menghubungkan Tim 1 dengan track lain, dibangun dari query tersimpan: jalur K017 → P01 (DL-001, Rp 252 jt), 19 outlet offline yang masih memakai 4.11 (berisiko BUG-412 bila di-upgrade), dan label peluang ekspansi C02/C06 terhadap batas paket.
- Untuk siapa: Laras -- tahu temuan yang memengaruhi tim Sales atau Produk sehingga risiko dan peluang tidak terlewat.
- Peran di ★ jalur demo utama: bukan bagian jalur demo; bonus lintas track / jawaban pertanyaan juri.

## 2. Acuan PRD & TDD
- PRD: §6 F-20 (Should #6), §7 (J13–14,5), urutan pemotongan §7 butir 2.
- TDD (acuan sementara = Rencana Teknis): §3.4 ("F15 Insight lintas track" di Rencana = F-20 di PRD), §1.3 Langkah 1 (pertanyaan 9–12), §1.3 Langkah 8 (fungsi server dibaca langsung oleh Server Component), §1.3 Langkah 10 (halaman `/akun/[id]`).
- Keputusan yang dikunci:
  - Query tersimpan (bukan fitur AI); dibaca lewat fungsi server di `src/server/queries/`.
  - Kartu tampil di halaman `/akun/[id]` akun terkait.
  - Semua query read-only lewat `readCypher`.
  - Rupiah/nilai deal diberi label sesuai sumber (DL-001 dari `crm_deals`), bukan estimasi baru.

## 3. User Stories & Acceptance Criteria
- User story: Sebagai Laras, saya ingin tahu temuan yang memengaruhi tim Sales atau Produk, agar risiko dan peluang tidak terlewat.
- Acceptance criteria:
  - Diberikan K017, ketika insight dibuka, maka tampil jalur K017 → P01 (DL-001, Rp 252 jt).
  - Diberikan 19 outlet offline yang masih memakai 4.11, ketika insight dibuka, maka outlet itu ditandai berisiko BUG-412 bila di-upgrade.
  - Diberikan C02/C06, ketika insight dibuka, maka label peluang ekspansi vs batas paket tampil.
- Kriteria teknis tambahan:
  - (tambahan teknis) Setiap kartu menyertakan ID node bukti (K017, P01, DL-001, ID outlet, C02/C06) sehingga bisa ditelusuri.
  - (tambahan teknis) Query tidak meng-hardcode daftar outlet; angka 19 dihitung dari graph.
  - (tambahan teknis) Tampilan kartu punya status loading, kosong, dan error.

## 4. Ruang Lingkup Fitur
- Termasuk:
  - Fungsi query di `src/server/queries/` (⚠️ nama berkas asumsi: `insight.ts`) untuk tiga insight.
  - Komponen kartu insight di halaman `/akun/[id]` (⚠️ nama komponen asumsi), memakai fixture dulu (bisa paralel).
  - Tes golden untuk ketiga query.
- Tidak termasuk:
  - Query keempat Rencana Teknis F15 (P03 meminta referensi apotek vs C03 terdampak bug): tidak ada di AC PRD (lihat ⛔ KONFLIK).
  - Penampil graph, tombol expand → 11 (F-12), 22 (F-23).
  - Menjawab insight lewat Tanya Graph → 13 (F-14).
- Pengganti sementara: fixture JSON untuk kartu sebelum data nyata siap (00).

## 5. API, Data & Komponen yang Disentuh
| Jenis | Nama | Aksi | Acuan TDD |
| --- | --- | --- | --- |
| Modul BE | `src/server/queries/insight.ts` (⚠️ nama berkas asumsi) | Buat | Rencana Teknis §1.3 Langkah 8, §2.4 |
| Modul BE | `src/server/neo4j.ts` (`readCypher`) | Pakai | Rencana Teknis §1.3 Langkah 8 |
| Komponen FE | kartu insight lintas track di `/akun/[id]` (⚠️ nama komponen asumsi) | Buat | Rencana Teknis §1.3 Langkah 10 |
| Halaman | `/akun/[id]` | Ubah | Rencana Teknis §1.3 Langkah 10 |
| Tipe | `GraphPayload`, `GNode`, `GEdge` (`src/types/graph.ts`) | Pakai | Rencana Teknis §1.3 Langkah 3 |
| Tabel (node graph) | `:Kontak`, `:Akun`, `:Deal`, `:Outlet`, `:Rilis`, `:Interaksi` | Pakai | Rencana Teknis §1.3 Langkah 3 |
| Relasi | `BEKERJA_DI`, `MEMILIKI`, `MENJALANKAN_VERSI`, `TERDAPAT_DI` | Pakai | Rencana Teknis §1.3 Langkah 3 |
| Env var | `NEO4J_URI`, `NEO4J_USERNAME`, `NEO4J_PASSWORD` | Pakai | Rencana Teknis §1.3 Langkah 2 |
| Tes | `tests/golden/insight.test.ts` (⚠️ nama berkas asumsi) | Buat | Rencana Teknis §1.3 Langkah 7 |

## 6. Breakdown Task Implementasi
| ID | Task | Layer | Estimasi (jam) | Bergantung pada | Output terverifikasi |
| --- | --- | --- | --- | --- | --- |
| T19-01 | Query jalur K017 → P01 (`BEKERJA_DI` ke P01, `MEMILIKI` deal DL-001) dengan nilai deal. | BE | 0,5 | 03 (F-03), 04 (F-04) | Query mengembalikan K017, P01, DL-001 dengan nilai Rp 252 jt dan ID bukti. |
| T19-02 | Query outlet `mode_offline=true` yang `MENJALANKAN_VERSI` terbaru 4.11 (bukan 4.12) dengan flag "berisiko BUG-412 bila di-upgrade" (Bug → `TERDAPAT_DI` → Rilis `v4.12`). | BE | 0,5 | T19-01 | Query mengembalikan 19 outlet; tidak ada outlet dengan versi 4.12. |
| T19-03 | Query C02/C06: rencana ekspansi vs `batas_outlet_paket` → label peluang ekspansi. | BE | 0,5 | T19-01 | C02 dan C06 mengembalikan label dan angka (outlet saat ini, batas paket, rencana). |
| T19-04 | Komponen kartu insight di `/akun/[id]` (loading/kosong/error), dikerjakan dulu dengan fixture lalu disambung ke fungsi query. Bisa paralel. | FE | 0,5 | T19-01 (kontrak), 00 (fixture) | K017/DL-001, 19 outlet, dan C02/C06 tampil di halaman akun terkait dengan ID bukti. |
| T19-05 | Tes golden `insight.test.ts`: DL-001 = Rp 252 jt, 19 outlet, label C02/C06; jalur error: akun tanpa insight → kosong, bukan error. | Test | 0,25 | T19-02, T19-03 | `bun test tests/golden/insight.test.ts` hijau. |
| | **Total 2,25 jam (estimasi PRD: 1,5 jam)** -- selisih +50%, lihat ⚠️ ASUMSI di section 9. | | | | |

## 7. Dependensi
- Bergantung pada fitur: 03 (F-03) -- `MENJALANKAN_VERSI` dan Rilis; 04 (F-04) -- konteks sinyal akun; (transitif) 00 untuk `readCypher` dan skeleton `/akun/[id]`.
- Memblokir fitur: tidak ada.
- Dependensi eksternal: data deal DL-001 dan P01 termuat dari F-01; baca `node_modules/next/dist/docs/` sebelum menulis kode Next.js (AGENTS.md).
- Bisa mulai lebih dulu dengan mock: ya -- T19-04 (kartu FE) bisa mulai dengan fixture; query butuh graph.

## 8. Cara Uji
| Acceptance criteria | Cara uji | Otomatis/Manual |
| --- | --- | --- |
| K017 → P01 (DL-001, Rp 252 jt) | Tes query mengembalikan DL-001 dengan nilai 252 jt dan jalur K017 → P01 | Otomatis |
| 19 outlet offline pada 4.11 ditandai berisiko BUG-412 | Tes menghitung hasil = 19, tanpa outlet 4.12 | Otomatis |
| C02/C06 label ekspansi vs batas paket | Tes label dan angka muncul untuk kedua akun; jalur error: akun lain tanpa rencana ekspansi → kartu tidak tampil | Otomatis + manual (lihat di `/akun/C02`) |
| (tambahan teknis) loading/kosong/error | Hentikan koneksi Neo4j → kartu menampilkan status error | Manual |

## 9. Asumsi, Konflik & Risiko
- ⚠️ ASUMSI: total task 2,25 jam vs estimasi PRD 1,5 jam (+50%, >25%). Alasan: PRD tidak memisahkan query dan kartu FE; Rencana Teknis F15 menyebut empat query. -- cara validasi: ukur saat J13; pangkas T19-05 bila ketat.
- ⚠️ ASUMSI: sumber "rencana ekspansi" C02 (membuka 6 cabang, PRD §1) berasal dari teks interaksi/data CRM; label node `:Deal` dan field nilai deal serta properti `batas_outlet_paket` mengikuti nama di Rencana Teknis yang belum diverifikasi. -- cara validasi: periksa data C02/C06 di T19-03.
- ⚠️ ASUMSI: "19 outlet" konsisten dengan 19 outlet kontrol F-18 (offline yang tidak pernah memakai 4.12). -- cara validasi: bandingkan hitungan T19-02 dengan 17 (F-18).
- ⛔ KONFLIK: PRD F-20 memuat 3 insight; Rencana Teknis F15 memuat 4 query (tambahan: P03 meminta referensi apotek padahal C03 terdampak bug) -- dipakai sementara: PRD (3 insight); query keempat tidak dikerjakan.
- ⛔ KONFLIK (K-A): repo sudah punya Prisma (`prisma/schema.prisma`, `src/lib/db.ts`) dan `.env.example` berisi `DATABASE_URL`, `SUPABASE_*`; PRD §9 dan Rencana Teknis §2.3 menyatakan keduanya tidak dipakai -- dipakai sementara: hanya Neo4j; keputusan di 00.
- 🔁 USULAN PERUBAHAN: tidak ada.
- Risiko: data deal/P01 tidak sesuai ekspektasi -- mitigasi/fallback: ukur lebih awal; bila data kurang, kartu menampilkan kosong yang jelas.
- Risiko: fitur dipotong (urutan pemotongan PRD §7: F-20 setelah F-21) -- mitigasi/fallback: insight tetap bisa dijawab lewat Tanya Graph (13/F-14) dan konsol Cypher.

## 10. Definition of Done
- [ ] Semua acceptance criteria di section 3 lolos uji di section 8
- [ ] Semua task di section 6 selesai, atau sudah dipindah secara eksplisit
- [ ] Lint, typecheck, dan build lulus
- [ ] Tidak ada secret yang di-hardcode; konfigurasi lewat environment variable
- [ ] Implementasi sesuai kontrak dan skema TDD, tanpa perubahan yang tidak tercatat
- [ ] UI di jalur demo punya tampilan loading, kosong, dan error (kartu insight)
- [ ] Sudah dicek di lingkungan deploy (halaman akun terkait di URL produksi)
- [ ] PR sudah direview dan di-merge, lalu status di header file diperbarui
- [ ] Ketiga kartu tampil dengan ID bukti; angka 19 dihitung dari graph, bukan hardcode
