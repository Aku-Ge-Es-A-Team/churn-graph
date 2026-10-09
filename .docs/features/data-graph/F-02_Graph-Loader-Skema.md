# 02 -- Graph loader & skema
> ID PRD: F-02 · Prioritas: Must · Penanggung jawab: Adrian (Data Graph) · Estimasi: 1,5 jam-orang (PRD) · Status: Belum dimulai

## 1. Ringkasan Fitur
- Apa: `scripts/load.ts` dan `cypher/schema.cypher` memuat JSONL dari F-01 ke Neo4j AuraDB Free (constraint unik, full-text index, batch `UNWIND ... MERGE`), lengkap dengan provenance, dan menyediakan mode rebuild penuh yang idempoten (`bun run rebuild`).
- Untuk siapa: Laras -- bukti yang tampil bisa dilacak ke file dan baris asalnya; Bima -- graph yang stabil dari satu demo ke demo berikutnya.
- Peran di ★ jalur demo utama: bukan bagian langsung; fondasi graph untuk langkah 1–6.

## 2. Acuan PRD & TDD
- PRD: §5 (IN SCOPE: ETL → Neo4j dengan provenance; batas AuraDB Free A9), §6 F-02, §7 (J4–5,5), §8 (A9, A17).
- TDD (acuan sementara = Rencana Teknis): §1.3 Langkah 5 (load ke graph, `schema.cypher`, batch 500, mode rebuild), §1.3 Langkah 3 (aturan 3: provenance; aturan 6: label `:Entitas` + constraint unik `id`), §2.1 (Neo4j AuraDB Free + `neo4j-driver`), §2.4 (struktur repo, env), §3.4 ("F03 Graph loader & skema" di Rencana = F-02 di PRD).
- Keputusan yang dikunci:
  - Neo4j AuraDB Free + `neo4j-driver`; tidak ada Prisma/Supabase.
  - Label sekunder `:Entitas` dengan constraint unik pada `id`; satu constraint per label.
  - Full-text index `teks_bebas` pada `Interaksi|Tiket` (`subjek`, `isi`, `judul`, `deskripsi`).
  - Label dan tipe relasi berasal dari allowlist di kode, bukan input user; batch 500 baris.
  - Rebuild = hapus semua node lalu muat ulang; hanya boleh menunjuk instance milik tim.
  - Env var: `NEO4J_URI`, `NEO4J_USERNAME`, `NEO4J_PASSWORD`.

## 3. User Stories & Acceptance Criteria
- User story: Sebagai Laras, saya ingin setiap fakta di graph bisa dilacak ke file dan baris asalnya, agar saya bisa mempercayai bukti yang ditampilkan.
- Acceptance criteria:
  - Diberikan JSONL dari F-01, ketika `bun run rebuild` dijalankan dua kali, maka jumlah node dan relasi identik (idempoten).
  - Diberikan setiap node dan relasi, ketika diperiksa, maka properti `source_file` dan `source_id` terisi.
  - Diberikan instance Aura, ketika skema dimuat, maka constraint unik dan full-text index aktif.
- Kriteria teknis tambahan:
  - (tambahan teknis) Jumlah node per label = jumlah baris sumber (laporan jumlah dari `quality-report.json` F-01), mis. 620 outlet, 160 kontak, 350 interaksi, 640 tiket, 30 keputusan.
  - (tambahan teknis) Kolom tanggal dikonversi dengan `date()` atau `neo4j.types.Date` sehingga selisih hari bisa dihitung di Cypher.
  - (tambahan teknis) Relasi di-`MERGE` dengan kunci `{key: r.key}` sehingga muat ulang tidak menggandakan relasi.

## 4. Ruang Lingkup Fitur
- Termasuk:
  - `cypher/schema.cypher`: constraint `entitas_id` + satu constraint per label + full-text index `teks_bebas`.
  - `scripts/load.ts`: driver, eksekusi skema, batch node dan relasi, konversi tanggal, hitung jumlah per label.
  - Mode rebuild (hapus semua node lalu muat ulang) dengan pengaman instance; script `load` dan `rebuild` di `package.json`.
  - Uji hitungan, provenance, dan idempotensi.
- Tidak termasuk:
  - ETL dan JSONL → 01 (F-01).
  - Relasi turunan dan runner Cypher `scripts/run-cypher.ts` → 03 (F-03); runner aturan → 04 (F-04). Selama 03/04 belum ada, `rebuild` hanya menjalankan `etl` lalu `load` (⚠️ ASUMSI).
  - Pembuatan instance Aura, `.env.local`, `.gitignore` `.env*.local`, `/health` → 00.
  - `readCypher` (session READ) dan guardrail → 00 / 09 (F-10).
- Pengganti sementara: tidak ada.

## 5. API, Data & Komponen yang Disentuh
| Jenis | Nama | Aksi | Acuan TDD |
| --- | --- | --- | --- |
| Modul BE | `scripts/load.ts` | Buat | Rencana Teknis §1.3 Langkah 5 |
| Data (Cypher) | `cypher/schema.cypher` (constraint `entitas_id`, `akun_id`, ...; full-text index `teks_bebas`) | Buat | Rencana Teknis §1.3 Langkah 5 |
| Tabel (node graph) | `:Entitas` + label spesifik (`:Akun`, `:Kontak`, `:Outlet`, `:UsageBulan`, `:Interaksi`, `:Tiket`, dll. sesuai `nodes.jsonl`) | Buat | Rencana Teknis §1.3 Langkah 3 |
| Data (file) | `data/build/nodes.jsonl`, `data/build/edges.jsonl`, `data/build/quality-report.json` | Pakai | Rencana Teknis §1.3 Langkah 4 |
| Library | `neo4j-driver` (`bun add --exact neo4j-driver`) | Pakai | Rencana Teknis §2.1 |
| Layanan eksternal | Neo4j AuraDB Free | Pakai | Rencana Teknis §2.1, §2.2 |
| Env var | `NEO4J_URI`, `NEO4J_USERNAME`, `NEO4J_PASSWORD` | Pakai | Rencana Teknis §1.3 Langkah 2 |
| Script | `package.json` → `load` (`bun scripts/load.ts`), `rebuild` | Buat | Rencana Teknis §1.3 Langkah 4 |
| Tes | `tests/golden/load.test.ts` (⚠️ nama berkas asumsi) | Buat | Rencana Teknis §1.3 Langkah 7 (`bun test tests/golden`) |

## 6. Breakdown Task Implementasi
| ID | Task | Layer | Estimasi (jam) | Bergantung pada | Output terverifikasi |
| --- | --- | --- | --- | --- | --- |
| T02-01 | Tulis `cypher/schema.cypher`: constraint unik `Entitas.id` + satu constraint per label (daftar label dari `nodes.jsonl` F-01) + full-text index `teks_bebas` (`Interaksi\|Tiket` pada `subjek`, `isi`, `judul`, `deskripsi`), semuanya `IF NOT EXISTS`. | DB | 0,5 | 01 (daftar label dari output F-01) | Setelah dijalankan di Aura, `SHOW CONSTRAINTS` menampilkan constraint per label dan `SHOW INDEXES` menampilkan `teks_bebas` berstatus ONLINE. |
| T02-02 | Tulis `scripts/load.ts`: buat driver sendiri dengan `disableLosslessIntegers`, jalankan skema, batch 500 `UNWIND ... MERGE (n:Entitas:${label} {id: r.id}) SET n += r.props`, lalu relasi per tipe `MERGE (a)-[e:${type} {key: r.key}]->(b)`; label/tipe dari allowlist; tanggal lewat `date()`. Pasang `neo4j-driver` bila belum ada. | BE | 1,0 | T02-01, 01 (JSONL) | `bun run load` selesai tanpa error; jumlah node per label tercetak dan cocok dengan JSONL. |
| T02-03 | Mode rebuild: hapus semua node (`MATCH (n) DETACH DELETE n`) sebelum muat ulang dengan pengaman (cetak host `NEO4J_URI` + jumlah node yang akan dihapus; berhenti bila env kosong); tambahkan script `load` dan `rebuild` (`bun run etl && bun run load` + `derive`/`signals` bila skripnya sudah ada) di `package.json`. | BE | 0,5 | T02-02 | `bun run rebuild` menjalankan etl → load dari awal; pesan host yang dihapus terlihat sebelum penghapusan. |
| T02-04 | Tes `tests/golden/load.test.ts`: jumlah node per label = baris sumber, semua node/relasi punya `source_file` + `source_id`, constraint + index ada; jalankan rebuild dua kali dan bandingkan jumlah node dan relasi. | Test | 0,5 | T02-03 | `bun test tests/golden/load.test.ts` hijau; dua kali rebuild menghasilkan jumlah node dan relasi identik. Jalur error: JSONL berisi ID ganda → hitungan per label berbeda → tes gagal dengan pesan jelas. |
| | **Total 2,5 jam (estimasi PRD: 1,5 jam)** -- selisih +67%, lihat ⚠️ ASUMSI di section 9. | | | | |

## 7. Dependensi
- Bergantung pada fitur: 01 (F-01) -- `nodes.jsonl`, `edges.jsonl`, `quality-report.json`.
- Memblokir fitur: 03 (F-03), dan seluruh fitur hilir yang membaca graph (lewat 03/04).
- Dependensi eksternal: instance AuraDB Free hidup; `.env.local` berisi `NEO4J_URI`, `NEO4J_USERNAME`, `NEO4J_PASSWORD` (disiapkan Dio di setup J0,5–2); `.gitignore` memuat `.env*.local` (00); internet.
- Bisa mulai lebih dulu dengan mock: sebagian -- `schema.cypher` dan kerangka `load.ts` bisa ditulis sebelum F-01 selesai dengan JSONL contoh kecil; pemuatan penuh menunggu output F-01 dan Aura.

## 8. Cara Uji
| Acceptance criteria | Cara uji | Otomatis/Manual |
| --- | --- | --- |
| `rebuild` dua kali → jumlah node dan relasi identik | Jalankan `bun run rebuild` dua kali, bandingkan `MATCH (n) RETURN count(n)` dan jumlah relasi | Otomatis (`bun test`) |
| `source_file` dan `source_id` terisi | Query `MATCH (n:Entitas) WHERE n.source_file IS NULL OR n.source_id IS NULL RETURN count(n)` = 0; sama untuk relasi | Otomatis |
| Constraint unik + full-text index aktif | `SHOW CONSTRAINTS` dan `SHOW INDEXES` memuat `entitas_id` dan `teks_bebas` ONLINE; jalur error: query full-text pada `teks_bebas` mengembalikan hasil | Otomatis + manual cek konsol Aura |
| (tambahan teknis) jumlah per label = baris sumber | Bandingkan hitungan per label dengan `quality-report.json` | Otomatis |
| Jalur error: env kosong | Jalankan `load` tanpa `NEO4J_URI` → berhenti dengan pesan, tidak ada penghapusan | Manual |

## 9. Asumsi, Konflik & Risiko
- ⚠️ ASUMSI: total task 2,5 jam vs estimasi PRD 1,5 jam (+67%, >25%). Alasan: PRD hanya memperkirakan loader; di sini ditambah skema, pengaman rebuild, dan tes idempotensi. -- cara validasi: ukur jam nyata; bila terlambat, pangkas T02-04 ke hitungan saja.
- ⚠️ ASUMSI: `scripts/load.ts` membuat driver sendiri (write) dan tidak mengimpor `src/server/neo4j.ts`, karena modul itu memakai `import "server-only"` dan session READ. -- cara validasi: coba impor saat T02-02; bila gagal, pisahkan helper driver.
- ⚠️ ASUMSI: sebelum 03/04 ada, `rebuild` hanya `etl` + `load`; idempotensi penuh (termasuk `derive` dan `signals`) diuji ulang di 03 dan 04. -- cara validasi: ulangi tes dua kali rebuild setelah tiap fitur hilir bergabung.
- ⚠️ ASUMSI: properti provenance pada node/relasi turunan memakai `source_file` = berkas aturan (mis. `cypher/derive/kandidat_bug412.cypher`) dan `source_id` = ID elemen turunan. -- cara validasi: sepakati dengan 03/04 sebelum diimplementasi.
- ⚠️ ASUMSI: `neo4j-driver` berjalan di Bun (Rencana Teknis: dukungan Bun tidak ditemukan di dokumentasi). -- cara validasi: jalankan `bun run load` di J4; fallback jalankan skrip yang sama dengan Node 24.
- ⛔ KONFLIK (K-A): repo sudah punya Prisma (`prisma/schema.prisma`, `prisma.config.ts`, `src/lib/db.ts`; commit a5d933a) dan `.env.example` berisi `DATABASE_URL`, `DIRECT_URL`, `AUTH_SECRET`, `SUPABASE_*`, `CONTEXT7_API_KEY`; PRD §9 dan Rencana Teknis §2.3 menyatakan Prisma/Supabase tidak dipakai -- dipakai sementara: loader hanya Neo4j; file Prisma tidak disentuh (keputusan tim di 00).
- 🔁 USULAN PERUBAHAN: tidak ada.
- Risiko: `MERGE` menggabungkan ID ganda secara diam-diam (Rencana menyebut "tabrakan ID langsung gagal saat load", padahal `MERGE` tidak gagal) -- mitigasi/fallback: cek ID ganda di ETL (01, T01-06) + tes hitungan per label (T02-04).
- Risiko: rebuild bersifat destruktif (`DETACH DELETE` seluruh graph) -- mitigasi/fallback: pengaman T02-03; hanya menunjuk instance milik tim; data bisa dibangun ulang dari `data/build/`.
- Risiko: Aura Free ter-pause atau batas node/relasi (A9: 200 ribu / 400 ribu, belum dicek di halaman resmi) -- mitigasi/fallback: buka konsol Aura sebelum load; graph ±9.400 node jauh di bawah batas.

## 10. Definition of Done
- [ ] Semua acceptance criteria di section 3 lolos uji di section 8
- [ ] Semua task di section 6 selesai, atau sudah dipindah secara eksplisit
- [ ] Lint, typecheck, dan build lulus
- [ ] Tidak ada secret yang di-hardcode; konfigurasi lewat environment variable (`NEO4J_*` hanya dari `.env.local`)
- [ ] Implementasi sesuai kontrak dan skema TDD, tanpa perubahan yang tidak tercatat
- [ ] UI di jalur demo punya tampilan loading, kosong, dan error (tidak berlaku: fitur non-UI)
- [ ] Sudah dicek di lingkungan deploy (dijalankan terhadap instance Aura sebenarnya, bukan lokal)
- [ ] PR sudah direview dan di-merge, lalu status di header file diperbarui
- [ ] `bun run rebuild` idempoten dan menolak berjalan tanpa `NEO4J_URI`
