# 11 -- Penampil subgraph bukti v1
> ID PRD: F-12 · Prioritas: Must · Penanggung jawab: Tegar (Frontend) · Estimasi: 2,5 jam-orang (PRD) · Status: Implementasi selesai (T11-01 s.d. T11-06; T11-07 verifikasi visual di browser belum dilakukan)

## 1. Ringkasan Fitur
- Apa: viewer graph di `/akun/[id]` yang merender `GraphPayload` jalur bukti (≤80 node) dengan layout berlapis kiri→kanan (ELK), warna node per sumber data, relasi turunan bergaris putus-putus, panel samping saat node diklik, dan pemilih sinyal.
- Untuk siapa: Bima (Account Manager) -- paham bagaimana sinyal saling terhubung; Laras -- bukti yang bisa ditelusuri node demi node. Visualisasi graph diwajibkan aturan acara.
- Peran di ★ jalur demo utama: langkah 2 (klik C01 → subgraph bukti: champion pindah ke P01, CFO baru menyebut KasirPro, janji FEAT-07 → `decision_log`) dan wadah untuk langkah 3 (klik node champion → kartu F-06).

## 2. Acuan PRD & TDD
- PRD: §3 kasus penggunaan 1 (★), §5 (aturan acara: visualisasi graph; OUT OF SCOPE X3 visualisasi seluruh graph), §6 F-12 dan F-08, §7 (J6–12 F-12; urutan pemotongan butir 5), §8 (A12), §9 (jalur demo langkah 2, 3; tech stack React Flow + elkjs).
- TDD (acuan sementara = Rencana Teknis): §1.3 Langkah 10 (prinsip agar graph terbaca: path bukti, ELK `layered` kiri→kanan, warna per sumber, label relasi tipe + tanggal, relasi turunan putus-putus + `confidence`, klik node → `Sheet`), Langkah 8 (`GraphPayload`, `getAccountEvidence(id, kode?)`, induced subgraph), Langkah 3 (tipe `Sumber`, `GNode`, `GEdge`, `GraphPayload`), §2.1 (React Flow `@xyflow/react` + `elkjs`, shadcn `Sheet`), §3.4 "F12 Penampil graph bukti per akun" (v1: path bukti saja; lanjutan: expand 1 hop).
- Keputusan yang dikunci:
  - Library: `@xyflow/react` + `elkjs`, dipasang dengan `bun add --exact`; stack tidak diganti di tengah jalan (PRD OUT OF SCOPE X9).
  - Yang digambar adalah path bukti (induced subgraph dari `bukti_ids`), bukan seluruh graph; v1 ≤80 node. Expand 1 hop (≤120 node) milik 22 (F-23).
  - Layout ELK `layered` kiri→kanan; warna node per `sumber`; relasi `derived: true` bergaris putus-putus.
  - Panel samping memakai shadcn `Sheet` dan memuat properti + `source_file`/`source_id`; kartu F-06 tampil di panel yang sama (bukan halaman terpisah).

## 3. User Stories & Acceptance Criteria
- User story: Sebagai Bima, saya ingin melihat jalur bukti sebagai graph yang bisa diklik, agar saya paham bagaimana sinyal saling terhubung.
- Acceptance criteria:
  - Diberikan `GraphPayload` ≤80 node, ketika dirender, maka layout ELK kiri→kanan, warna node per sumber, dan relasi turunan bergaris putus-putus.
  - Diberikan klik pada node, ketika panel terbuka, maka properti + kartu F-06 tampil.
  - Diberikan C01, ketika graph dibuka, maka jalur champion → P01 dan janji FEAT-07 → `decision_log` terlihat dalam satu layar.
- Kriteria teknis tambahan:
  - (tambahan teknis) Label relasi berupa tipe + tanggal; relasi turunan menampilkan `confidence` (Rencana Langkah 10).
  - (tambahan teknis) Panel samping menampilkan `source_file` dan `source_id` node/relasi (Rencana Langkah 10).
  - (tambahan teknis) Ada pemilih sinyal yang memuat subgraph per sinyal (Rencana Langkah 10 "ada filter per sinyal"; memakai `GET /api/evidence?akun=&sinyal=`).
  - (tambahan teknis) Tampilan loading, kosong, dan error untuk viewer (DoD jalur demo); payload >80 node menampilkan peringatan, bukan menggambar tanpa batas.
  - (tambahan teknis) Dari PRD F-12 kriteria kedua: kartu F-06 dirender oleh 12 (F-06) di slot panel yang disediakan file ini; viewer menyediakan properti + slot.

## 4. Ruang Lingkup Fitur
- Termasuk:
  - Adaptor `GraphPayload` → node/edge React Flow, layout ELK, node dan edge kustom, legenda sumber, sorotan `highlight`, panel `Sheet` (properti + slot kartu), pemilih sinyal, state loading/kosong/error, guard >80 node.
  - Integrasi ke `/akun/[id]` (data awal dari fungsi server, filter dari endpoint) dan verifikasi jalur C01.
- Tidak termasuk:
  - Isi dan logika kartu "Sumber A vs Sumber B" → 12 (F-06); viewer hanya menyediakan slot.
  - API jalur bukti `GET /api/evidence`, `getAccountEvidence`, dan pembentukan `GraphPayload` → 07 (F-08).
  - Expand tetangga 1 hop dan `GET /api/graph/neighbors` → 22 (F-23); render hasil konsol Cypher → 21 (F-22).
  - Kartu tindakan (F-09), grafik usage (F-18), timeline (F-19), insight lintas track (F-20): area lain di `/akun/[id]`.
  - Visualisasi seluruh graph (OUT OF SCOPE X3).
- Pengganti sementara: fixture `GraphPayload` jalur C01 dari 00 (T00-10) sampai 07 siap.

## 5. API, Data & Komponen yang Disentuh
| Jenis | Nama | Aksi | Acuan TDD |
| --- | --- | --- | --- |
| Halaman FE | `/akun/[id]` (area viewer graph) | Ubah (dari skeleton 00) | Rencana Teknis Langkah 10 |
| Library | `@xyflow/react`, `elkjs` (`bun add --exact`) | Buat | Rencana Teknis §2.1 |
| Komponen FE | Viewer graph (React Flow + ELK `layered` kiri→kanan) | Buat | Rencana Teknis Langkah 10, §3.4 F12 |
| Komponen FE | Node kustom (shadcn `Card`/`Badge`), edge kustom, legenda sumber | Buat | Rencana Teknis Langkah 10 |
| Komponen FE | Panel samping (shadcn `Sheet`) dengan slot kartu F-06 | Buat | Rencana Teknis Langkah 10, §2.1 |
| Komponen FE | Pemilih sinyal | Buat | Rencana Teknis Langkah 10 |
| Endpoint | `GET /api/evidence?akun=&sinyal=` (milik 07) | Pakai | PRD F-08 |
| Modul BE (milik 07) | `getAccountEvidence(id, kode?)` | Pakai | Rencana Teknis Langkah 8 |
| Tipe | `Sumber`, `GNode`, `GEdge`, `GraphPayload` di `src/types/graph.ts` | Pakai | Rencana Teknis Langkah 3 |
| Data sementara | Fixture `GraphPayload` C01 dari 00 (T00-10) | Pakai | PRD §5 |

## 6. Breakdown Task Implementasi
| ID | Task | Layer | Estimasi (jam) | Bergantung pada | Output terverifikasi |
| --- | --- | --- | --- | --- | --- |
| T11-01 | Spike: `bun add --exact @xyflow/react elkjs`; `bunx --bun shadcn add sheet`; render 3 node fixture di komponen client pada `/akun/[id]` dengan ELK `layered` arah kanan. Cek kompatibilitas React 19.3 + Turbopack dan cara memuat `elkjs`; baca dokumen Next.js lokal tentang komponen client. | FE | 0,5 | 00 (T00-11) | 3 node tampil berurutan kiri→kanan di `bun run dev`; `bun run build` lulus; cara memuat `elkjs` tercatat di PR. **bisa paralel** |
| T11-02 | Adaptor murni `GraphPayload` → node/edge React Flow + fungsi layout ELK (`layered`, kiri→kanan) + `fitView`; edge dengan ujung yang tidak ada dibuang dan dilaporkan; payload >80 node memunculkan peringatan. Tes `bun test`. | FE | 1,0 | T11-01, 00 (T00-08, T00-10) | `bun test`: fixture C01 → jumlah node/edge sama dengan payload, tanpa edge yatim; payload kosong → hasil kosong; payload 81 node → flag peringatan (jalur error). **bisa paralel** |
| T11-03 | Node dan edge kustom: node (shadcn `Card`/`Badge`) menampilkan id + label dengan warna per `sumber` (7 nilai) dan legenda sumber; node di `highlight` ditonjolkan; edge berlabel tipe + tanggal, `derived: true` bergaris putus-putus + `confidence`. | FE | 1,0 | T11-02 | Fixture C01: semua nilai `sumber` yang muncul punya warna; relasi turunan putus-putus dan berlabel `confidence`; nilai `sumber` di luar peta warna tampil dengan warna netral, bukan error. **bisa paralel** |
| T11-04 | Panel samping `Sheet`: klik node → tabel properti, `source_file`/`source_id`, dan slot kosong bernama untuk kartu F-06 (diisi 12). Tutup dengan Esc/klik luar. | FE | 0,75 | T11-03 | Klik tiap node fixture membuka panel dengan properti yang benar; node tanpa `source_file` menampilkan "—", bukan crash. **bisa paralel** |
| T11-05 | Pemilih sinyal (Semua / per sinyal) dari daftar sinyal fixture + state loading, kosong ("Tidak ada jalur bukti untuk akun/sinyal ini"), dan error untuk viewer. | FE | 0,5 | T11-02 | Memilih sinyal mengganti payload fixture; payload kosong menampilkan state kosong; penolakan simulasi menampilkan state error. **bisa paralel** |
| T11-06 | Integrasi: `/akun/[id]` memuat `getAccountEvidence(id)` lewat Server Component untuk tampilan awal; pemilih sinyal memanggil `GET /api/evidence?akun=&sinyal=` dari client; ganti fixture dengan data nyata; serialisasi tanggal sesuai kontrak. | FE | 0,75 | 07 (F-08), T11-03, T11-04, T11-05 | `/akun/C01` menampilkan graph dari Aura; ganti sinyal memanggil endpoint dan menggambar ulang tanpa duplikat node. |
| T11-07 | Verifikasi C01 dan produksi: jalur champion → P01 dan FEAT-07 → `decision_log` terlihat dalam satu layar laptop demo; hitung `source_file` unik di payload C01 (target ≥4 sumber, PRD §4); respons <2 detik; klik node membuka panel; cek di URL produksi. | Test | 0,5 | T11-06, 00 (T00-07) | Checklist manual di PR; tangkapan layar C01 satu layar; hitungan `source_file` unik tercatat. |
| | **Total 5,0 jam (estimasi PRD: 2,5 jam)** -- selisih +100%, lihat ⚠️ ASUMSI di section 9. | | | | |

## 7. Dependensi
- Bergantung pada fitur: 00 -- tipe `GraphPayload` (T00-08), fixture C01 (T00-10), skeleton `/akun/[id]` (T00-11), deploy (T00-07); 07 (F-08) -- `getAccountEvidence` dan `GET /api/evidence`.
- Memblokir fitur: 12 (F-06, panel samping dan slot kartu), 21 (F-22, hasil query dirender di viewer), 22 (F-23, expand 1 hop pada viewer).
- Dependensi eksternal: tidak ada akun/API key; Aura berisi graph dan sinyal hasil 01–04 untuk integrasi.
- Bisa mulai lebih dulu dengan mock: ya -- T11-01 sampai T11-05 memakai fixture 00; hanya T11-06 dan T11-07 menunggu 07.

## 8. Cara Uji
| Acceptance criteria | Cara uji | Otomatis/Manual |
| --- | --- | --- |
| ≤80 node dirender dengan ELK kiri→kanan, warna per sumber, turunan putus-putus | `bun test` adaptor (jumlah node/edge, flag `derived` → gaya putus-putus, peta warna mencakup semua nilai `Sumber`); lihat visual fixture C01. Jalur error: payload 81 node → peringatan; edge yatim dibuang | Otomatis (adaptor) + Manual (visual) |
| Klik node → panel dengan properti + kartu F-06 | Klik node di fixture dan data nyata; panel memuat properti dan `source_file`/`source_id`; kartu F-06 diverifikasi di 12 (T12-04). Jalur error: node tanpa `source_file` → "—" | Manual |
| C01: champion → P01 dan FEAT-07 → `decision_log` dalam satu layar | Buka `/akun/C01` di laptop demo tanpa scroll/zoom manual; hitung `source_file` unik (target ≥4) | Manual |
| (tambahan teknis) Pemilih sinyal | Pilih tiap sinyal C01 → endpoint dipanggil, graph berganti tanpa node ganda. Jalur error: sinyal tanpa bukti → state kosong; respons 5xx → state error | Manual |
| (tambahan teknis) Respons <2 detik | Ukur waktu muat `/akun/C01` di produksi | Manual |

## 9. Asumsi, Konflik & Risiko
- ⚠️ ASUMSI: total task 5,0 jam vs estimasi PRD 2,5 jam (+100%, >25%). Alasan: Rencana Teknis §3.4 sendiri memberi ±4 jam untuk F12 (v1 + lanjutan); ini penggunaan pertama React Flow + ELK (keahlian Tegar tidak tersurat, A12); DoD jalur demo menambah state loading/kosong/error, tes, dan verifikasi produksi. -- cara validasi: ukur jam nyata T11-02 di J8; bila lebih dari 2 jam, terapkan butir 5 urutan pemotongan PRD §7.
- ⚠️ ASUMSI: `GraphPayload.highlight: string[]` tidak dijelaskan merujuk `key` atau `id` node/edge. -- cara validasi: cek payload nyata dari 07 di T11-06; sepakati satu rujukan dengan Dio.
- ⚠️ ASUMSI: `source_file`, `source_id`, tanggal relasi (`mulai`/`selesai`/`sejak`), dan `confidence` berada di `props` node/edge; urutan prioritas properti tanggal untuk label relasi belum ditetapkan. -- cara validasi: periksa payload nyata (F-08 kriteria kedua: relasi membawa `source_file`).
- ⚠️ ASUMSI: cara memuat `elkjs` (bundel biasa atau web worker) di Next.js 16 + Turbopack, dan kompatibilitas `@xyflow/react` dengan React 19.3, belum dicoba; sketsa Rencana belum dijalankan. -- cara validasi: T11-01.
- ⚠️ ASUMSI: "satu layar" = viewport laptop yang dipakai demo (resolusi belum ditetapkan); `fitView` dianggap cukup. -- cara validasi: ukur di T11-07 pada laptop demo.
- ⚠️ ASUMSI: pemilih sinyal dikerjakan karena Rencana Langkah 10 menyebut "filter per sinyal" dan endpoint punya parameter `sinyal`, walau tidak ada di AC PRD; dipotong lebih dulu bila waktu habis. -- cara validasi: konfirmasi prioritas ke tech lead.
- ⛔ KONFLIK (K-C): PRD F-08 mensyaratkan `GET /api/evidence?akun=&sinyal=`; Rencana Teknis Langkah 8 membaca `getAccountEvidence(id, kode?)` langsung di Server Component tanpa REST -- dipakai sementara: tampilan awal lewat fungsi server (Rencana), perubahan sinyal lewat endpoint (PRD); AC mengikuti PRD.
- 🔁 USULAN PERUBAHAN (diterapkan): `@xyflow/react` 12.12.0 dan `elkjs` 0.12.0 (versi dipin); komponen `src/components/ui/sheet.tsx` (shadcn). `EvidenceExplorer` berbasis daftar dihapus karena digantikan `EvidenceGraph`.
- ⚠️ CATATAN IMPLEMENTASI: Bun mendefinisikan `self`, sehingga skrip worker `elkjs` mengira berjalan di Web Worker dan tidak mengekspor `Worker`; `getElk()` di `src/lib/graph-layout.ts` menyembunyikan `self` sementara di luar browser. Perilaku di browser belum diverifikasi (Chromium Playwright belum terpasang di mesin ini); `next build` lulus.
- 🔁 USULAN PERUBAHAN: tidak ada.
- Risiko: React Flow + ELK tidak jalan tepat waktu (A12) -- mitigasi/fallback: spike T11-01 di awal; PRD §7 butir 5: viewer hanya C01–C06, konsol Neo4j Aura dengan query tersimpan sebagai cadangan visual; visualisasi graph tidak boleh dihapus. Cytoscape.js (alternatif Rencana §2.1) berarti mengganti stack (PRD X9) sehingga butuh keputusan tim.
- Risiko: payload >80 node menjadi hairball -- mitigasi: guard dan peringatan di T11-02; yang digambar hanya path bukti.
- Risiko: RAM laptop sempit (±1,8 GB bebas, Rencana Langkah 13) -- mitigasi: uji performa dengan `next build && next start`, bukan `next dev`.

## 10. Definition of Done
- [ ] Semua acceptance criteria di section 3 lolos uji di section 8
- [ ] Semua task di section 6 selesai, atau sudah dipindah secara eksplisit
- [ ] Lint, typecheck, dan build lulus
- [ ] Tidak ada secret yang di-hardcode; konfigurasi lewat environment variable
- [ ] Implementasi sesuai kontrak dan skema TDD, tanpa perubahan yang tidak tercatat
- [ ] UI di jalur demo punya tampilan loading, kosong, dan error
- [ ] Sudah dicek di lingkungan deploy (jalur C01 satu layar di URL produksi)
- [ ] PR sudah direview dan di-merge, lalu status di header file diperbarui
- [ ] Slot kartu F-06 di panel samping sudah dipakai dan diuji bersama 12 (T12-03, T12-04)
- [ ] Legenda sumber tampil; relasi turunan terbedakan tanpa bergantung pada warna saja
