# 09 -- Guardrail & validasi sitasi
> ID PRD: F-10 · Prioritas: Must · Penanggung jawab: Dio (Backend & AI) · Estimasi: 1 jam-orang (PRD); total task 2,5 jam · Status: Belum dimulai

## 1. Ringkasan Fitur
- Apa: Dua pagar pengaman. (1) `readCypher` sebagai satu-satunya pintu query: session READ, klausa tulis ditolak, `LIMIT` dipaksa, timeout 5 detik. (2) Validator sitasi: klaim jawaban AI tanpa `bukti_ids` yang ada di hasil tool dibuang/ditandai, dan kutipan harus berupa substring dari teks sumber.
- Untuk siapa: Laras -- jawaban AI hanya memuat klaim berbukti, tidak tertipu kutipan karangan; database aman dari query tulis.
- Peran di ★ jalur demo utama: langkah 6 (chip ID bukti lolos validator). Metrik demo: "Klaim tanpa bukti yang lolos ke UI = 0" (log validator).

## 2. Acuan PRD & TDD
- PRD: §2 T3, §4 metrik "Klaim tanpa bukti yang lolos ke UI: 0", §6 F-10 (juga F-14 dan F-22 yang bergantung), §7 (J9–10), §9 jalur demo langkah 6, OUT OF SCOPE X4.
- TDD (acuan sementara): Rencana Teknis §1.3 Langkah 8 (sketsa `src/server/neo4j.ts`: `readCypher`, `WRITE` deny-list, `defaultAccessMode: READ`, `timeout: 5000`), Langkah 9 (kontrak `{ jawaban, klaim: [{ teks, bukti_ids }] }`, validator membuang klaim yang `bukti_ids`-nya tidak muncul di hasil tool; `src/server/ai/`), §3.4 "F10 · Guardrail & validasi sitasi" (ID F10 milik Rencana, bukan ID PRD), §2.1 (keamanan).
- Keputusan yang dikunci:
  - Semua query, termasuk dari LLM dan konsol, melewati `readCypher`.
  - Session bertipe READ; deny-list klausa tulis; `LIMIT` dipaksa; timeout 5 detik.
  - Prinsip "tanpa path, tanpa klaim": klaim wajib bersandar pada ID node dari hasil tool.
  - Kutipan harus substring dari teks sumber.

## 3. User Stories & Acceptance Criteria
- User story: Sebagai Laras, saya ingin setiap jawaban AI hanya memuat klaim yang ada buktinya, agar saya tidak tertipu kutipan karangan.
- Acceptance criteria:
  - Diberikan query apa pun, ketika dijalankan lewat `readCypher`, maka session bertipe READ, klausa tulis ditolak, `LIMIT` dipaksa, dan timeout 5 detik.
  - Diberikan jawaban LLM, ketika divalidasi, maka klaim tanpa `bukti_ids` yang ada di hasil tool dibuang atau ditandai.
  - Diberikan kutipan, ketika divalidasi, maka kutipan harus berupa substring dari teks sumber.
- Kriteria teknis tambahan:
  - (tambahan teknis) Penolakan query tulis menghasilkan error yang jelas (pesan "Hanya query baca yang diizinkan", sesuai sketsa Rencana Teknis) dan tidak pernah sampai ke Aura.
  - (tambahan teknis) Setiap keputusan validator (klaim lolos/dibuang/ditandai) dicatat di log server agar metrik "klaim tanpa bukti lolos = 0" bisa dibuktikan saat drill.
  - (tambahan teknis) Nilai `Date`/Integer Neo4j yang keluar dari `readCypher` aman untuk di-serialize (konversi tetap di lapisan query, bukan di validator).

## 4. Ruang Lingkup Fitur
- Termasuk: pengerasan `readCypher` di `src/server/neo4j.ts` (deny-list, READ, LIMIT paksa, timeout); modul validator sitasi di `src/server/ai/` (cek `bukti_ids` terhadap hasil tool, cek kutipan substring); logging keputusan validator; pengujian.
- Tidak termasuk: driver dan koneksi dasar (00); tool AI dan system prompt (13, F-14); endpoint `/api/cypher` dan UI konsol (21, F-22, hanya memakai `readCypher`); tool `run_cypher` (F-28, Could, tanpa file); rendering chip ID/klaim ditandai di UI (13, F-14).
- Pengganti sementara: tidak ada. `readCypher` dasar dari 00 dipakai oleh 07 (F-08) dan 08 (F-09) sebelum pengerasan selesai.

## 5. API, Data & Komponen yang Disentuh
| Jenis | Nama | Aksi | Acuan TDD |
| --- | --- | --- | --- |
| Modul BE | `src/server/neo4j.ts` -- `readCypher(query, params)` | Ubah (pengerasan; dibuat dasar di 00) | Rencana Teknis Langkah 8 |
| Modul BE | Validator sitasi di `src/server/ai/` (nama berkas ⚠️ ASUMSI) | Buat | Rencana Teknis Langkah 9, §2.4 |
| Layanan eksternal | Neo4j AuraDB Free (session READ) | Pakai | Rencana Teknis §2.1 |
| Library | `neo4j-driver` (sudah ada di stack) | Pakai | Rencana Teknis §2.1 |
| Test | Berkas `*.test.ts` guardrail & validator (lokasi di bawah `tests/`, ⚠️ ASUMSI) | Buat | Rencana Teknis §2.1 (testing `bun test`) |
| Env var | `NEO4J_URI`, `NEO4J_USERNAME`, `NEO4J_PASSWORD` | Pakai | Rencana Teknis Langkah 2 |

## 6. Breakdown Task Implementasi
| ID | Task | Layer | Estimasi (jam) | Bergantung pada | Output terverifikasi |
| --- | --- | --- | --- | --- | --- |
| T09-01 | Pengerasan `readCypher`: session `defaultAccessMode: READ`, deny-list klausa tulis (`CREATE|MERGE|DELETE|DETACH|SET|REMOVE|DROP|FOREACH|LOAD CSV`), timeout transaksi 5000 ms, tolak multi-statement | BE | 0,5 | 00 (`src/server/neo4j.ts` dasar) | `readCypher("MATCH (n) DETACH DELETE n")` melempar error tanpa menyentuh DB; `readCypher("RETURN 1")` sukses |
| T09-02 | Paksa `LIMIT`: tambahkan batas bila query tidak punya `LIMIT` dan pangkas bila melebihi batas maksimum (nilai batas ⚠️ ASUMSI, konstanta yang dapat diubah) | BE | 0,25 | T09-01 | Query tanpa `LIMIT` yang mencocokkan banyak node mengembalikan ≤ batas; query ber-`LIMIT` kecil tidak diubah |
| T09-03 | Tes `readCypher`: variasi huruf besar/kecil klausa tulis, tulis tersembunyi di tengah query, LIMIT paksa, timeout (query berat dengan timeout diperkecil lewat parameter uji), dan penolakan tulis oleh server pada session READ | Test | 0,5 | T09-02 | `bun test` hijau; kasus tulis semuanya ditolak; kasus timeout gagal di sekitar batas, bukan menggantung |
| T09-04 | Validator sitasi: masukan `{ jawaban, klaim[] }` + himpunan ID dan teks dari hasil tool; buang klaim tanpa `bukti_ids` valid (ID tidak valid di klaim sebagian valid dibuang), cek tiap kutipan sebagai substring dari teks sumber (normalisasi spasi saja); keluaran klaim lolos + klaim dibuang | BE | 0,5 | T09-01 (kontrak hasil tool), 00 | Unit test: klaim dengan ID palsu dibuang; kutipan palsu dibuang/ditandai; klaim valid lolos utuh. **Bisa paralel** (fungsi murni dengan masukan tiruan) |
| T09-05 | Log keputusan validator (jumlah lolos/dibuang/ditandai + ID klaim) ke log server | BE | 0,25 | T09-04 | Satu panggilan validator menulis satu baris log terstruktur yang dapat dihitung untuk drill J15–16 |
| T09-06 | Tes validator: semua klaim dibuang → hasil kosong terdefinisi ("tidak ditemukan bukti"), kutipan beda spasi, kutipan non-substring, ID acak, klaim tanpa `bukti_ids` | Test | 0,5 | T09-04, T09-05 | `bun test` hijau; skenario "semua klaim dibuang" tidak melempar error |
| | **Total 2,5 jam (estimasi PRD: 1 jam)** | | | | |

## 7. Dependensi
- Bergantung pada fitur: 00 -- `src/server/neo4j.ts` dasar (driver, `/health` memakai `RETURN 1`), akses Aura, `.env.local`.
- Memblokir fitur: 13 (F-14), 16 (F-17), 21 (F-22). 07 (F-08) dan 08 (F-09) memakai `readCypher` dasar dari 00 lebih dulu, lalu otomatis terlindungi setelah pengerasan.
- Dependensi eksternal: instance Aura; format hasil tool dari F-14 (ID + teks properti) disepakati sebelum T09-04 selesai.
- Bisa mulai lebih dulu dengan mock: ya -- T09-03 untuk kasus tanpa DB dan T09-04/T09-06 dengan hasil tool tiruan; kasus READ-oleh-server dan timeout butuh Aura.

## 8. Cara Uji
| Acceptance criteria | Cara uji | Otomatis/Manual |
| --- | --- | --- |
| `readCypher` menolak klausa tulis (jalur error) | Test: `CREATE`, `MERGE`, `DETACH DELETE`, `SET`, `LOAD CSV`, huruf campur → error | Otomatis |
| Session bertipe READ | Test terhadap Aura: tulis yang lolos regex (kasus buatan) ditolak server | Otomatis (butuh Aura) |
| `LIMIT` dipaksa | Test: query tanpa `LIMIT` tidak mengembalikan baris di atas batas | Otomatis |
| Timeout 5 detik | Test dengan timeout diperkecil + query berat; verifikasi konfigurasi 5000 ms | Otomatis |
| Klaim tanpa bukti dibuang/ditandai | Unit test validator dengan ID yang tidak ada di hasil tool | Otomatis |
| Kutipan substring | Unit test validator: kutipan benar lolos, kutipan karangan ditolak | Otomatis |
| Metrik "klaim tanpa bukti lolos = 0" | Hitung log validator selama drill J15–16 | Manual |
| Happy path query baca | `readCypher("RETURN 1")` dan satu query ranking nyata | Otomatis |

## 9. Asumsi, Konflik & Risiko
- ⚠️ ASUMSI: Estimasi task 2,5 jam vs PRD 1 jam (+150%, di atas ambang 25%). Sketsa `readCypher` ada di Rencana Teknis, tetapi LIMIT paksa, logging, validator kutipan, dan pengujian berlapis tidak terhitung di angka PRD -- cara validasi: bandingkan jam nyata di J10.
- ⚠️ ASUMSI: Batas `LIMIT` maksimum, strategi menambah `LIMIT` ke query, dan penolakan multi-statement tidak ditetapkan di sumber -- cara validasi: tetapkan nilai di T09-02 dan uji dengan query nyata tool F-14.
- ⚠️ ASUMSI: Kutipan di klaim dikenali dari teks bertanda petik dalam `klaim.teks` karena kontrak `{ jawaban, klaim: [{ teks, bukti_ids }] }` tidak memiliki field kutipan; normalisasi hanya spasi (tanpa mengubah huruf besar/kecil) -- cara validasi: uji dengan 12 preset di F-14.
- ⚠️ ASUMSI: Teks sumber untuk cek substring adalah teks yang dikembalikan tool ke LLM (dikumpulkan dalam proses), bukan ambil ulang dari DB -- cara validasi: uji kutipan dari hasil `search_text` yang dipotong.
- ⚠️ ASUMSI: Teks `jawaban` bebas dapat memuat klaim yang tidak tercantum di `klaim[]`; validator hanya memeriksa `klaim[]` -- cara validasi: F-14 merender jawaban dari klaim lolos (lihat 13, T13-05) dan diuji pada drill.
- ⚠️ ASUMSI: Deny-list regex dapat memberi false positive bila kata terlarang muncul dalam literal string (mis. `'set'`) -- cara validasi: uji di T09-03; false positive diterima karena lebih aman.
- ⚠️ ASUMSI: Lokasi berkas uji di luar `tests/golden/` belum ditetapkan -- cara validasi: sepakati dengan Adrian agar `bun test` menjalankan semuanya.
- ⛔ KONFLIK (K-A): repo memuat Prisma/Supabase (commit a5d933a), PRD §9 + Rencana Teknis §2.3 tidak memakainya -- dipakai sementara: ikuti PRD; seluruh akses data lewat `readCypher` ke Neo4j, `src/lib/db.ts` tidak dipakai.
- 🔁 USULAN PERUBAHAN: tambahkan field opsional `kutipan[]` pada tiap klaim di kontrak `{ jawaban, klaim[] }` -- alasan: validasi substring menjadi deterministik, tidak bergantung pada parsing tanda petik di `klaim.teks`. Kontrak dimiliki 13 (F-14); sementara memakai ekstraksi tanda petik.
- Risiko: validator terlalu ketat sehingga menurunkan jumlah preset yang terjawab (gerbang J12 ≥6/12) -- mitigasi: log alasan pembuangan, longgarkan normalisasi spasi bila sah.
- Risiko: deny-list tidak menangkap semua bentuk tulis -- mitigasi: lapis kedua session READ di server; `/api/cypher` juga berada di belakang Basic Auth (00).

## 10. Definition of Done
- [ ] Semua acceptance criteria di section 3 lolos uji di section 8
- [ ] Semua task di section 6 selesai, atau sudah dipindah secara eksplisit
- [ ] Lint, typecheck, dan build lulus (script `typecheck` belum ada di `package.json` saat file ini ditulis)
- [ ] Tidak ada secret yang di-hardcode; konfigurasi lewat environment variable
- [ ] Implementasi sesuai kontrak dan skema TDD, tanpa perubahan yang tidak tercatat
- [ ] UI di jalur demo punya tampilan loading, kosong, dan error (tanggung jawab 13/F-14 dan 21/F-22; fitur ini menyediakan pesan error terdefinisi)
- [ ] Sudah dicek di lingkungan deploy (query tulis ditolak di URL produksi)
- [ ] PR sudah direview dan di-merge, lalu status di header file diperbarui
- [ ] Tidak ada jalur kode lain yang membuka session Neo4j mode WRITE di aplikasi (dicek dengan pencarian di `src/`)
- [ ] Log validator dapat dihitung untuk metrik drill "klaim tanpa bukti lolos = 0"
