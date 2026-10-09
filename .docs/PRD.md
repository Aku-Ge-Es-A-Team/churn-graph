# PRD -- Churn Early Warning Graph
> Ide asal: Tim 1, tanpa kode Fase 2 (⚠️ ASUMSI A1) · Hackathon: Road to PENS Hackathon 2026 · Durasi: ±24 jam on-the-spot, sisa ±18 jam = 42 jam-orang (⚠️ ASUMSI A2, A3) · Status: Draf MVP

Konvensi:
- ID fitur F-xx adalah ID baru PRD. ID Pxx dalam kurung adalah ID fitur di Priority Matrix, BUKAN kode prospek P01–P05.
- jo = jam-orang. J = jam relatif sejak tim mulai coding.
- Owner: D = Adrian (Data Graph), B = Dio (Backend & AI), F = Tegar (Frontend, pitch & demo).
- Setiap ⚠️ ASUMSI diberi nomor An dan dikumpulkan di section 8.

## 1. Problem Statement

**Kalimat inti:** Tim Customer Success KasirNusa kesulitan mengetahui akun mana yang benar-benar akan churn saat menyiapkan renewal, karena sinyalnya tersebar dan saling bertentangan di 6 sistem. Akibatnya, akun bernilai tinggi yang dinilai "hijau" oleh dashboard bisa lepas tanpa ada tindakan retensi.

**Kondisi saat ini:**
- CS mengandalkan health score dashboard. Skor ini salah menilai 4 dari 6 akun fokus (fakta, Brief).
- Bukti yang menjelaskan risiko ada di sumber terpisah: CRM, email & meeting, product usage, tiket support, kontrak & billing, dan log keputusan. Menyatukannya butuh baca manual lintas sistem.
- Penurunan usage langsung dibaca sebagai churn, padahal bisa disebabkan bug. Sebaliknya, volume tiket yang tinggi dibaca negatif, padahal isinya usulan fitur.
- Tindakan retensi diputuskan tanpa melihat preseden di log keputusan.

**Bukti pendukung, fakta (analisis dataset di Brief):**
- C01, dashboard hijau:
  - champion pindah ke prospek P01;
  - CFO baru menyebut kompetitor KasirPro;
  - diskon 15% diberikan dengan janji FEAT-07 yang belum ditepati.
  - C01 bernilai 6,1% dari total Rp 2.461 jt/tahun. Kehilangan C01 saja membuat retensi pendapatan turun di bawah target 95%.
- C04, dashboard hijau: renewal 5 Nov 2026, 3 email renewal tak berbalas, 2 kali telat bayar.
- C03, dashboard kuning: "usage turun 35%" adalah transaksi offline yang tidak tersinkron (BUG-412, v4.12), bukan pelanggan berhenti memakai.
- C05, dashboard hijau: bug yang sama di 5 outlet.
- C02, dashboard kuning: 9 tiketnya semua usulan fitur, dan pemilik berencana membuka 6 cabang.
- C06: tidak ada sinyal negatif.
- Kualitas data:
  - 318 dari 350 interaksi berisi kalimat template;
  - 14 tiket bergejala sinkronisasi tidak ditautkan ke BUG-412, 4 di antaranya ditutup "tidak dapat direproduksi";
  - champion di CRM sudah usang.

**Bukti pendukung, asumsi:**
- ⚠️ ASUMSI A14: CS benar-benar bekerja dengan cara di atas. Studi kasus tidak memuat wawancara pengguna.

## 2. Visi & Tujuan Solusi

**Visi:** Tidak ada akun KasirNusa yang churn tanpa peringatan. Setiap risiko terlihat berbulan-bulan sebelum renewal, lengkap dengan bukti dan tindakan yang pernah berhasil.

**Value proposition:** Satu context graph yang menyatukan 6 sumber dan menunjukkan di mana sumber-sumber itu saling bertentangan. CS mendapat peringkat risiko, jalur bukti yang bisa diklik, dan tindakan retensi berbasis preseden, bukan sekadar skor.
- ⚠️ ASUMSI A18: kalimat pitch belum ada; value proposition ini adalah draf PRD.

**Tujuan MVP (harus terbukti saat demo):**

| # | Yang harus terbukti | Kriteria juri |
| --- | --- | --- |
| T1 | Peringkat 40 akun menempatkan C01 di Kritis padahal dashboard hijau. Peringkat ini dibuktikan oleh jalur relasi lintas ≥3 sumber yang tidak terlihat dari satu sumber saja. | Kualitas context graph 25%, Penalaran AI & explainability 20% |
| T2 | Setiap akun berisiko punya tindakan retensi dengan estimasi rupiah dan rujukan preseden `decision_log`. Penyimpangan dari preseden dijelaskan. | Dampak bisnis 25%, Penalaran AI 20% |
| T3 | Pertanyaan baru juri, termasuk tentang akun di luar C01–C06, dijawab langsung pada dataset penuh dengan ID node sebagai bukti. | Eksekusi teknis 20%, UX & demo 10% |

## 3. Target Persona & Kasus Penggunaan

**Persona primer: Laras, Head of Customer Success KasirNusa** (⚠️ ASUMSI A14)
- Konteks: memegang 40 akun dan memimpin rapat retensi mingguan bersama Account Manager.
- Kebutuhan: daftar akun yang harus ditangani minggu ini, alasannya, dan tindakan yang bisa langsung disetujui.
- Frustrasi:
  - health score hijau ternyata keliru;
  - bukti harus dicari manual di CRM, inbox, dan tiket;
  - tidak tahu preseden diskon atau kompensasi.
- Melek teknologi: menengah. Terbiasa dashboard SaaS, tidak menulis query (⚠️ ASUMSI A22).

**Persona sekunder: Bima, Account Manager** (⚠️ ASUMSI A14)
- Konteks: memegang beberapa akun, termasuk akun yang mendekati renewal.
- Kebutuhan: bukti spesifik per akun untuk menyiapkan percakapan renewal, dan jawaban cepat atas pertanyaan ad-hoc.
- Frustrasi: kontak lama tidak membalas, tetapi ia tidak tahu kontak itu sudah pindah perusahaan.
- Melek teknologi: menengah (⚠️ ASUMSI A22).

**Kasus penggunaan:**
1. ★ **JALUR DEMO UTAMA:** Saat menyiapkan rapat retensi, Laras ingin melihat akun yang paling berisiko churn beserta alasannya, agar ia bisa menyetujui tindakan retensi untuk C01 sebelum renewal.
2. Saat dashboard menandai C03 kuning karena usage turun, Laras ingin tahu apakah penurunan itu churn atau bug, agar ia tidak salah memberi diskon.
3. Saat renewal C04 tinggal beberapa minggu dan email tidak berbalas, Bima ingin tahu siapa yang harus dihubungi dan tindakan apa yang pernah berhasil, agar renewal tidak lepas.
4. Saat ditanya hal baru di rapat, misalnya "kenapa C02 tidak berisiko?", Bima ingin bertanya langsung ke graph, agar jawabannya disertai bukti dan bukan opini.

## 4. Metrik Keberhasilan

**Metrik demo:**

| Metrik | Target | Cara mengukur |
| --- | --- | --- |
| Jalur demo utama selesai tanpa error | 2 kali gladi berturut-turut tanpa error | Gladi resik di URL produksi, J15–17 |
| Golden test peringkat | C01 Kritis peringkat 1; C03 & C04 Tinggi; C05 Waspada; C02 & C06 Aman (input) | `bun test` di `tests/golden/` |
| Pertanyaan preset terjawab dengan bukti | ≥6 dari 12 di J12 (input); ≥10 dari 12 di J15 (⚠️ ASUMSI A16) | Jalankan 12 preset; hitung jawaban yang semua klaimnya punya `bukti_ids` valid |
| Pertanyaan kejutan terjawab | ≥7 dari 10 pada drill (⚠️ ASUMSI A16) | Anggota yang tidak membangun P14 menulis 10 pertanyaan baru, lalu hasilnya dinilai bersama |
| Klaim tanpa bukti yang lolos ke UI | 0 | Log validator F-10 selama drill |
| Waktu dari Radar ke tindakan C01 | ≤2 menit (⚠️ ASUMSI A16) | Stopwatch saat gladi |
| Sumber di jalur bukti C01 | ≥4 dari 6 sumber (⚠️ ASUMSI A16) | Hitung `source_file` unik di `GraphPayload` C01 |

**Metrik produk (pasca-hackathon):**

| Metrik | Target | Cara mengukur |
| --- | --- | --- |
| Lead time peringatan sebelum renewal | ≥90 hari untuk akun Kritis/Tinggi (⚠️ ASUMSI A16). Acuan: sinyal pertama C01 muncul ±148 hari sebelum renewal (Priority Matrix) | Selisih `sejak` sinyal pertama dan `tanggal_renewal` |
| Precision flag Kritis/Tinggi | ≥70% benar-benar churn atau downgrade (⚠️ ASUMSI A16) | Bandingkan flag dengan hasil renewal per kuartal |
| Retensi pendapatan | ≥95% (target perusahaan, Brief) | Nilai kontrak yang diperpanjang dibagi nilai yang jatuh tempo |
| Tindakan retensi yang disetujui | ≥80% akun Kritis punya tindakan dalam 7 hari (⚠️ ASUMSI A16) | Log persetujuan (butuh F-25 Could atau versi lanjutan) |

## 5. Batasan & Ruang Lingkup

**Batasan:**
- **Waktu:** ±24 jam on-the-spot, 9–10 Okt 2026, Hotel Platinum Surabaya. Jam resmi tidak diketahui; sisa ±18 jam dihitung pada 9 Okt pukul 16.36 WIB (⚠️ ASUMSI A2).
- **Kapasitas:** 3 anggota × 14 jam efektif = **42 jo** (⚠️ ASUMSI A3).
  - Batas Must 60% = 25,2 jo.
  - Cadangan 40% = 16,8 jo untuk setup, integrasi, bug, polish, dan pitch.
- **Teknologi:** stack tim sudah ditetapkan (section 9). Semua layanan tier gratis (⚠️ ASUMSI A10). Internet venue dianggap stabil (⚠️ ASUMSI A17).
- **Data:**
  - 12 file wajib di `dump/dataset_kasirnusa`. `decision_log.xlsx` diabaikan.
  - Usage harian (226.300 baris) diagregasi bulanan menjadi ±7.440 node, karena batas AuraDB Free (⚠️ ASUMSI A9).
- **Aturan acara:**
  - minimal 3 sumber terhubung + visualisasi graph;
  - setiap rekomendasi menyebut node dan relasinya;
  - penyimpangan dari preseden dijelaskan;
  - aplikasi menjawab pertanyaan baru pada dataset penuh.

**IN SCOPE (dibangun sungguhan):**
- ETL 12 file → Neo4j dengan relasi bertanggal dan provenance (`source_file`, `source_id`).
- Relasi turunan v1 dan Inconsistency Radar: 8 aturan Cypher + penekan Z1–Z3, generik untuk 40 akun.
- Skor berbobot, level, rupiah berisiko, dan pembanding "Dashboard vs Temuan".
- Kartu bukti "Sumber A vs Sumber B", penjelasan akun aman, dan tindakan retensi berbasis preseden.
- Viewer subgraph bukti, papan peringkat, Tanya Graph versi sempit, dan guardrail sitasi.
- Deploy Vercel + AuraDB.

**Pengganti sementara:**

| Yang tampil di demo | Cara memalsukan / menyederhanakan |
| --- | --- |
| Rupiah berisiko | `nilai_tahunan × p(level)`. Nilai p di-hardcode (Kritis 0,6 · Tinggi 0,4 · Waspada 0,2 · Aman 0,05) dan ditampilkan sebagai Estimasi di UI (⚠️ ASUMSI A15) |
| Login | Gerbang Basic Auth satu akun demo di `src/proxy.ts` |
| Data "live" | Snapshot statis; `bun run rebuild` memuat ulang penuh |
| Jawaban pertanyaan preset | Hasil P14 di-cache sebagai JSON (F-15, Should) |
| UI sebelum J9 | Fixture JSON dari jalur bukti Brief §4 (internal, tidak tampil di demo final) |
| Email lama yang tidak terselesaikan | `aliases.csv` diisi manual bila F-16 dipotong |
| Cadangan demo | Video demo + konsol Neo4j Aura dengan query tersimpan |

**OUT OF SCOPE:**

| Item | Alasan |
| --- | --- |
| Model ML prediksi churn (X1) | Hanya 40 sampel tanpa label churn, sehingga tidak bisa divalidasi. |
| GraphRAG / vector embeddings (X2) | ±91% teks interaksi adalah template; full-text index Neo4j sudah cukup. |
| Visualisasi seluruh graph 40 akun (X3) | Hasilnya hairball; juri butuh path, bukan peta penuh. |
| Autentikasi multi-user, RBAC, write-back (X4) | Tidak dinilai; Basic Auth demo sudah cukup. |
| Konektor real-time / ingestion inkremental (X5) | Dataset adalah snapshot statis. |
| Membersihkan artefak sintetis (X6) | Cukup disebut sebagai keterbatasan di laporan kualitas. |
| Chatbot bebas serba bisa (X7) | Rawan gagal live; Tanya Graph sengaja dibuat sempit. |
| Replay timeline penuh semua akun (X8) | Data mayoritas snapshot; timeline statis sudah cukup. |
| Mengganti stack di tengah jalan (X9) | Dua kali kerja; stack dikunci sejak J0. |
| Filter berlapis, tooltip sinyal, ekspor CSV (P29) | Disepakati boleh dibuang; tidak menyentuh rubrik. |
| Notifikasi email/Slack ke CS | Tidak dinilai; peringatan cukup tampil di Radar. |
| Multi-bahasa UI | Juri dan pengguna berbahasa Indonesia. |

## 6. Kebutuhan Fungsional

**Tabel fitur** (estimasi per fitur adalah Estimasi, ⚠️ ASUMSI A4):

| ID | Nama (ID asal) | Prioritas | Estimasi (jo) | Owner |
| --- | --- | --- | --- | --- |
| F-01 | Pipeline ETL + rekonsiliasi (P01) | Must | 3,5 | D |
| F-02 | Graph loader & skema (P02) | Must | 1,5 | D |
| F-03 | Relasi turunan v1 (P03) | Must | 2,5 | D |
| F-04 | Inconsistency Radar: mesin aturan v1 (P04) | Must | 3,5 | D + B |
| F-05 | Skor, level, rupiah + Dashboard vs Temuan (P05) | Must | 1,5 | B |
| F-06 | Kartu bukti "Sumber A vs Sumber B" (P06) | Must | 1 | F |
| F-07 | Penjelasan akun aman / konsisten (P07) | Must | 0,5 | B + F |
| F-08 | API jalur bukti (P08) | Must | 1 | B |
| F-09 | Tindakan retensi berbasis preseden (P09) | Must | 2 | B |
| F-10 | Guardrail & validasi sitasi (P10) | Must | 1 | B |
| F-11 | Papan peringkat risiko / Radar home (P11) | Must | 1,5 | F |
| F-12 | Penampil subgraph bukti v1 (P12) | Must | 2,5 | F |
| F-14 | Tanya Graph versi sempit (P14) | Must | 3 | B |
| F-15 | Pertanyaan preset + cache jawaban (P13) | Should #1 | 1 | B/F |
| F-16 | Resolver email lama → kontak (P16) | Should #2 | 1,5 | D |
| F-17 | AI Claim Checker, batch (P15) | Should #3 | 3 | D |
| F-18 | Grafik usage terkoreksi vs rilis 4.12 (P17) | Should #4 | 1,5 | F |
| F-19 | Timeline inkonsistensi statis (P19) | Should #5 | 1,5 | F |
| F-20 | Insight lintas track (P18) | Should #6 | 1,5 | D |
| F-21 | Aturan lanjutan R5/R6 dll. (P20) | Should #7 | 2 | D |
| F-22 | Konsol Cypher read-only (P13+) | Should #8 | 0,5 | B |
| F-23 | `SALING_KENAL` + expand 1 hop (P21) | Should #9 | 1,5 | D/F |
| F-24 | Ringkasan total per tingkat + total ARR berisiko (P22) | Could | 0,3 | F |
| F-25 | Pemilik, tenggat, Setujui/Tolak tindakan (P25) | Could | 1 | F |
| F-26 | Laporan kualitas & keterbatasan data (P23) | Could | 1 | D |
| F-27 | Sinyal kontak tunggal S7 (P24) | Could | 0,5 | D |
| F-28 | `run_cypher` text-to-Cypher, mati saat demo (P26) | Could | 1,5 | B |
| F-29 | Simulasi what-if (P28) | Could | 2,5 | F |
| F-30 | Ekspor ringkasan akun Markdown (P27) | Could | 1,5 | F |

ID F-13 sengaja tidak dipakai. Pertanyaan preset dipindah ke F-15 karena prioritasnya turun.

**Hitungan kapasitas:**
- Total Must = 3,5 + 1,5 + 2,5 + 3,5 + 1,5 + 1 + 0,5 + 1 + 2 + 1 + 1,5 + 2,5 + 3 = **25 jo**.
- 25 / 42 = **59,5%**, di bawah batas 60%.
- Keputusan re-scope: Priority Matrix menghitung Must ±26 jo (62%). Pertanyaan preset (P13) diturunkan menjadi Should #1, bukan P14. Alasan:
  - rubrik Eksekusi teknis menuntut jawaban atas pertanyaan *baru*, yang tidak bisa dipenuhi preset;
  - preset hanya tombol yang memanggil F-14 lalu menyimpan cache-nya.
  - F-15 tetap dikerjakan pertama di Should karena menjadi fallback gerbang J12.
- Should total ±14 jo. Must + Should + ±6 jo uji, deploy, dan demo ≈ 45 jo, melebihi 42 jo. Karena itu urutan Should adalah garis potong.

### Fitur Must

**F-01 Pipeline ETL + rekonsiliasi**
- User story: Sebagai Laras, saya ingin data dari 6 sistem disatukan dengan benar, agar peringkat risiko tidak dibangun di atas data yang salah.
- Kriteria penerimaan:
  - Diberikan 12 file wajib, ketika `bun run etl` dijalankan, maka semua baris lolos `zod` atau tercatat alasannya di `quality-report.json`.
  - Diberikan `product_usage_daily.csv`, ketika diagregasi, maka terbentuk ±7.440 baris `UsageBulan` (620 outlet × 12 bulan).
  - Diberikan interaksi template, ketika diproses, maka flag `template=true` terpasang pada 318 baris.
  - Diberikan konflik nilai antara CRM dan kontrak, ketika direkonsiliasi, maka nilai kontrak dipakai sebagai sumber kebenaran.

**F-02 Graph loader & skema**
- User story: Sebagai Laras, saya ingin setiap fakta di graph bisa dilacak ke file dan baris asalnya, agar saya bisa mempercayai bukti yang ditampilkan.
- Kriteria penerimaan:
  - Diberikan JSONL dari F-01, ketika `bun run rebuild` dijalankan dua kali, maka jumlah node dan relasi identik (idempoten).
  - Diberikan setiap node dan relasi, ketika diperiksa, maka properti `source_file` dan `source_id` terisi.
  - Diberikan instance Aura, ketika skema dimuat, maka constraint unik dan full-text index aktif.

**F-03 Relasi turunan v1**
- User story: Sebagai Laras, saya ingin melihat hubungan yang tidak tercatat di sistem mana pun, misalnya penurunan usage yang disebabkan bug, agar saya tidak salah membaca bug sebagai churn.
- Kriteria penerimaan:
  - Diberikan graph termuat, ketika derive dijalankan, maka relasi `MENJALANKAN_VERSI`, `Anomali`, `MEMBALAS`, `MENYEBUT`, dan `KANDIDAT_DISEBABKAN_OLEH` terbentuk dengan properti `derived`, `rule`, dan `confidence`.
  - Diberikan 6 outlet C03, ketika anomali dihitung, maka penurunannya −34 s.d. −36% dan bertepatan dengan v4.12.
  - Diberikan versi outlet, ketika dipakai untuk aturan bug, maka versi diambil dari data usage, bukan dari kolom tiket (kasus T0531, T0600, T0636).

**F-04 Inconsistency Radar: mesin aturan v1**
- User story: Sebagai Laras, saya ingin sistem menandai titik di mana sumber-sumber saling bertentangan, agar risiko yang disembunyikan health score terlihat.
- Kriteria penerimaan:
  - Diberikan 40 akun, ketika runner aturan dijalankan, maka setiap sinyal mengikuti kontrak `{akun, kode, bobot, bukti_ids, fakta, sejak}` dan tidak ada ID akun yang di-hardcode.
  - Diberikan 8 aturan + Z1–Z3, ketika golden test dijalankan, maka C01 terpicu R1 (Orang), R2 (Janji), dan kompetitor disebut; C04 terpicu outreach tak berbalas dan risiko pembayaran.
  - Diberikan tiket `permintaan_fitur` C02, ketika Z1–Z3 diterapkan, maka tiket itu tidak menghasilkan sinyal negatif.
  - Gerbang J8: golden test lulus. Bila tidak, D berhenti di F-03 dan F-17 batal.

**F-05 Skor, level, rupiah + Dashboard vs Temuan**
- User story: Sebagai Laras, saya ingin melihat akun mana yang dinilai hijau oleh dashboard padahal berisiko, beserta rupiahnya, agar saya tahu prioritas tindakan.
- Kriteria penerimaan:
  - Diberikan sinyal F-04, ketika skor dihitung (Σ bobot × faktor renewal, tie-break hari renewal lalu ARR), maka C01 berada di peringkat 1 dengan level Kritis.
  - Diberikan akun dengan dashboard Hijau dan level ≥ Tinggi, ketika ditampilkan, maka kolom divergensi bernilai "ya".
  - Diberikan rupiah berisiko, ketika ditampilkan, maka nilainya berlabel "Estimasi" dan nilai p terlihat di UI.

**F-06 Kartu bukti "Sumber A vs Sumber B"**
- User story: Sebagai Bima, saya ingin melihat dua catatan dari sumber berbeda yang saling bertentangan berdampingan, agar saya bisa menjelaskan risiko ke klien dengan fakta.
- Kriteria penerimaan:
  - Diberikan satu temuan, ketika kartu dibuka, maka tampil ≥2 record dari sumber berbeda, lengkap dengan nama file, ID, dan tanggal.
  - Diberikan C01, ketika kartu champion dibuka, maka CRM (champion tercatat) tampil berdampingan dengan riwayat kerja (pindah ke P01).
  - Kartu tampil sebagai panel samping F-12, bukan halaman terpisah.

**F-07 Penjelasan akun aman / konsisten**
- User story: Sebagai Bima, saya ingin tahu mengapa sebuah akun dinilai aman, agar saya bisa menjawab "kenapa akun X tidak berisiko?".
- Kriteria penerimaan:
  - Diberikan akun tanpa temuan, ketika dibuka, maka tampil status "konsisten" + daftar aturan yang sudah dicek beserta nilainya.
  - Diberikan C02, ketika dibuka, maka 9 tiketnya dijelaskan sebagai usulan fitur (Z1).
  - Diberikan akun acak di luar C01–C06, ketika dibuka, maka penjelasan tetap muncul tanpa error.

**F-08 API jalur bukti**
- User story: Sebagai Laras, saya ingin setiap temuan punya jalur bukti di graph, agar rekomendasi bisa ditelusuri ke node dan relasinya.
- Kriteria penerimaan:
  - Diberikan `bukti_ids` sebuah sinyal, ketika `GET /api/evidence?akun=&sinyal=` dipanggil, maka API mengembalikan `GraphPayload` berupa induced subgraph tanpa node duplikat.
  - Diberikan setiap relasi di payload, ketika diperiksa, maka `source_file` ikut terkirim.
  - Diberikan akun mana pun dari 40 akun, ketika API dipanggil, maka respons < 2 detik (⚠️ ASUMSI A16).

**F-09 Tindakan retensi berbasis preseden**
- User story: Sebagai Laras, saya ingin tindakan retensi yang merujuk keputusan serupa di masa lalu, agar saya bisa menyetujuinya tanpa menebak.
- Kriteria penerimaan:
  - Diberikan akun berisiko, ketika kartu tindakan dibuka, maka tampil jenis tindakan, preseden `decision_id` + penyetuju (`MENYETUJUI`), serta biaya vs rupiah berisiko.
  - Diberikan usulan diskon >15%, ketika diperiksa, maka kartu menandai "menyimpang dari preseden D-2025-02" dan meminta alasan.
  - Diberikan C03, ketika tindakan dibuka, maka tindakannya adalah eskalasi bug + kompensasi, bukan diskon retensi.

**F-10 Guardrail & validasi sitasi**
- User story: Sebagai Laras, saya ingin setiap jawaban AI hanya memuat klaim yang ada buktinya, agar saya tidak tertipu kutipan karangan.
- Kriteria penerimaan:
  - Diberikan query apa pun, ketika dijalankan lewat `readCypher`, maka session bertipe READ, klausa tulis ditolak, `LIMIT` dipaksa, dan timeout 5 detik.
  - Diberikan jawaban LLM, ketika divalidasi, maka klaim tanpa `bukti_ids` yang ada di hasil tool dibuang atau ditandai.
  - Diberikan kutipan, ketika divalidasi, maka kutipan harus berupa substring dari teks sumber.

**F-11 Papan peringkat risiko (Radar home)**
- User story: Sebagai Laras, saya ingin satu layar berisi 40 akun yang diurutkan menurut risiko, agar saya tahu harus mulai dari mana.
- Kriteria penerimaan:
  - Diberikan halaman `/`, ketika dibuka, maka tampil 40 akun dengan kolom level, badge dashboard vs temuan, renewal H-x, rupiah berisiko, dan 3 sinyal teratas.
  - Diberikan filter "fokus", ketika diaktifkan, maka hanya C01–C06 yang tampil.
  - Diberikan baris divergen, ketika dirender, maka baris disorot dengan warna level.

**F-12 Penampil subgraph bukti v1**
- User story: Sebagai Bima, saya ingin melihat jalur bukti sebagai graph yang bisa diklik, agar saya paham bagaimana sinyal saling terhubung.
- Kriteria penerimaan:
  - Diberikan `GraphPayload` ≤80 node, ketika dirender, maka layout ELK kiri→kanan, warna node per sumber, dan relasi turunan bergaris putus-putus.
  - Diberikan klik pada node, ketika panel terbuka, maka properti + kartu F-06 tampil.
  - Diberikan C01, ketika graph dibuka, maka jalur champion → P01 dan janji FEAT-07 → `decision_log` terlihat dalam satu layar.

**F-14 Tanya Graph versi sempit**
- User story: Sebagai Bima, saya ingin mengetik pertanyaan baru dalam bahasa Indonesia dan mendapat jawaban dengan bukti, agar pertanyaan ad-hoc di rapat langsung terjawab.
- Kriteria penerimaan:
  - Diberikan pertanyaan, ketika `POST /api/ask` dipanggil, maka AI SDK hanya memakai tool tetap (ranking, sinyal, bukti, preseden, teks, koneksi) dan mengembalikan `{jawaban, klaim[]}` yang sudah lolos F-10.
  - Diberikan pertanyaan tentang akun di luar C01–C06, ketika dijawab, maka jawaban memakai data akun tersebut, bukan template.
  - Gerbang J12: ≥6 dari 12 preset terjawab dengan bukti. Bila tidak, demo memakai F-15 + konsol Aura.
  - Diberikan pertanyaan di luar kemampuan tool, ketika diproses, maka sistem menolak dengan sopan dan menyarankan preset.

### Fitur Should (urutan = garis potong; yang terakhir dibuang lebih dulu)

**F-15 Pertanyaan preset + cache jawaban**
- User story: Sebagai Bima, saya ingin tombol pertanyaan umum yang langsung terjawab, agar demo tetap lancar walau LLM lambat.
- Kriteria penerimaan:
  - Diberikan 12 tombol preset, ketika diklik, maka jawaban ber-cache tampil < 1 detik.
  - Diberikan F-14 gagal di J12, ketika demo berjalan, maka preset tetap menampilkan jawaban + bukti dari cache.

**F-16 Resolver email lama → kontak**
- User story: Sebagai Bima, saya ingin email dari alamat lama dikenali sebagai kontak yang benar, agar email pamit champion tersambung ke akunnya.
- Kriteria penerimaan:
  - Diberikan email `@kopilintas.co.id` milik Rina, ketika diresolusi, maka terbentuk `ALAMAT_EMAIL_DARI {confidence}` ke K017 dan I0290 masuk jalur bukti C01.
  - Diberikan email yang ambigu, ketika diproses, maka email itu masuk `aliases.csv` dan tidak ditebak.

**F-17 AI Claim Checker (batch)**
- User story: Sebagai Laras, saya ingin janji yang disampaikan ke klien dicocokkan dengan status sebenarnya, agar janji yang dilanggar terlihat.
- Kriteria penerimaan:
  - Diberikan ±32 interaksi non-template, ketika rebuild dijalankan, maka setiap kalimat diklasifikasi dan kalimat itu sendiri dipakai sebagai kutipan.
  - Diberikan klaim I0224 vs I0258, ketika dicocokkan ke data terstruktur, maka terbentuk node `Klaim` + sinyal "Janji internal vs eksternal".
  - Backend memakai TypeSafe Jev bila spike J9–10 lolos; selain itu AI SDK structured output. Fitur tidak dipanggil live saat demo.

**F-18 Grafik usage terkoreksi vs rilis 4.12**
- User story: Sebagai Laras, saya ingin melihat bahwa penurunan usage C03/C05 hanya terjadi pada outlet versi 4.12, agar saya yakin itu bug, bukan churn.
- Kriteria penerimaan:
  - Diberikan C03, ketika grafik dibuka, maka garis outlet terdampak vs 19 outlet kontrol tampil dengan garis rilis 2026-06-29.
  - Diberikan data, ketika dirender, maka sumbernya adalah `UsageBulan`, bukan data harian.

**F-19 Timeline inkonsistensi statis**
- User story: Sebagai Laras, saya ingin melihat kapan setiap sinyal pertama muncul, agar saya tahu seberapa dini risiko sebenarnya terdeteksi.
- Kriteria penerimaan:
  - Diberikan `sejak` dari F-04, ketika timeline C01 dibuka, maka tampil urutan 17-06 → 20-07 → 15-08 → 18-09 + label "H-x sebelum renewal".
  - Diberikan akun lain, ketika dibuka, maka timeline dibangun dari data yang sama tanpa hardcode.

**F-20 Insight lintas track**
- User story: Sebagai Laras, saya ingin tahu temuan yang memengaruhi tim Sales atau Produk, agar risiko dan peluang tidak terlewat.
- Kriteria penerimaan:
  - Diberikan K017, ketika insight dibuka, maka tampil jalur K017 → P01 (DL-001, Rp 252 jt).
  - Diberikan 19 outlet offline yang masih memakai 4.11, ketika insight dibuka, maka outlet itu ditandai berisiko BUG-412 bila di-upgrade.
  - Diberikan C02/C06, ketika insight dibuka, maka label peluang ekspansi vs batas paket tampil.

**F-21 Aturan lanjutan**
- User story: Sebagai Laras, saya ingin sinyal tambahan seperti decision maker baru dan diskon yang tak sesuai kontrak, agar penilaian risiko lebih lengkap.
- Kriteria penerimaan:
  - Diberikan R5 (Angka) dan R6 (Nilai), ketika dijalankan, maka sinyalnya mengikuti kontrak F-04 dan golden test tetap lulus.
  - Diberikan K134 Yoga, ketika aturan decision maker baru dijalankan, maka sinyal muncul di akun terkait.

**F-22 Konsol Cypher read-only**
- User story: Sebagai Bima, saya ingin menjalankan query sendiri bila pertanyaan juri tidak tercakup tool, agar tetap ada jalan menjawab.
- Kriteria penerimaan:
  - Diberikan query tulis, ketika dikirim ke `/api/cypher`, maka query ditolak oleh F-10.
  - Diberikan query baca, ketika dijalankan, maka hasilnya dirender di F-12 atau sebagai tabel.

**F-23 `SALING_KENAL` + expand 1 hop**
- User story: Sebagai Bima, saya ingin melihat siapa yang mengenal decision maker baru, agar saya punya jalur hangat untuk mendekatinya.
- Kriteria penerimaan:
  - Diberikan node kontak di F-12, ketika diklik "expand", maka tetangga 1 hop ditambahkan tanpa melebihi 120 node (⚠️ ASUMSI A16).
  - Diberikan relasi `SALING_KENAL`, ketika ditampilkan, maka dasar relasinya (interaksi bersama) bisa diklik.

### Fitur Could (hanya bila semua Must selesai)

- F-24: satu kalimat ringkasan jumlah akun per tingkat + total ARR berisiko, angkanya dicocokkan ke F-05.
- F-25: pemilik, tenggat, dan Setujui/Tolak per tindakan, disimpan di state lokal. Naik ke Should bila approval manusia ternyata dinilai.
- F-26: halaman `quality-report.json` + daftar artefak sintetis sebagai keterbatasan data.
- F-27: sinyal akun berkontak tunggal (S7), satu file Cypher.
- F-28: tool `run_cypher` di F-14, mati secara default saat demo.
- F-29: toggle sinyal what-if, skor dihitung ulang di client.
- F-30: ekspor ringkasan akun ke Markdown.

## 7. Rencana Development

Jam relatif J+0 = mulai coding. Durasi rencana 18 jam (⚠️ ASUMSI A2). Feature freeze di J15 (83%), bukan J14,4 (80%), mengikuti keputusan tim di Priority Matrix.

| Rentang | Aktivitas | Penanggung jawab | Output / checkpoint |
| --- | --- | --- | --- |
| J0–0,5 | Kunci 12 pertanyaan kompetensi + pola path | Semua | `docs/questions.md` |
| J0,5–2 | Setup: instance Aura, `.env.local`, `.gitignore` memuat `.env*.local`, `/health` di Vercel; spike API key LLM tool calling | B | URL produksi menjawab `RETURN 1`; 1 tool call berhasil |
| J0,5–2 | Skema graph + kontrak tipe `GraphPayload`, `RiskRow` | D + B | `cypher/schema.cypher`, `src/types/graph.ts` |
| J0,5–2 | Skeleton UI + fixture JSON dari Brief §4 | F | Halaman `/` dan `/akun/[id]` dengan fixture |
| J2–5 | F-01 ETL | D | JSONL + `quality-report.json` |
| J2–9 | F-11 Radar home (fixture → data nyata) | F | Tabel 40 akun |
| J4–5,5 | F-02 loader | D | `bun run rebuild` idempoten |
| J5,5–8 | F-03 relasi turunan v1 | D | Anomali C03 −34 s.d. −36% |
| J6–9 | F-04 Radar 8 aturan + Z1–Z3 + golden test | D + B | **Gerbang J8: golden test lulus** |
| J6–12 | F-12 viewer subgraph | F | Jalur C01 bisa diklik |
| J7–9 | F-08 API jalur bukti | B | `GraphPayload` nyata |
| J7–10 | F-06 kartu bukti (panel F-12) | F | Kartu C01 champion |
| J8–9 | F-05 skor, level, rupiah | B | C01 peringkat 1 |
| J9–10 | F-10 guardrail, F-07 akun aman | B (+F untuk F-07) | Query tulis ditolak; C02 "konsisten" |
| J9–10 | Spike TypeSafe ±1 jo (20 tiket berlabel) | D | Keputusan Jev ya/tidak |
| J9–11 | F-09 tindakan retensi | B | Kartu tindakan C01, C03, C04 |
| J9–13 | F-17 Claim Checker (hanya bila gerbang J8 lolos) | D | Node `Klaim` |
| J10–12 | F-14 Tanya Graph v1 | B | **Gerbang J12: ≥6/12 preset terjawab** |
| J11–12,5 | **Integrasi ujung ke ujung jalur demo** | Semua | Jalur ★ bisa diklik dari Radar sampai Tanya Graph |
| J11–13 | F-15 preset + cache | B/F | 12 jawaban ter-cache |
| J12–14 | Polish F-14, perbaikan bug integrasi | B | — |
| J12–13 | F-18 grafik usage | F | Grafik C03 vs kontrol |
| J13–14,5 | F-19 timeline, F-20 insight lintas track, F-21 aturan lanjutan | F, D, D | Sesuai garis potong |
| J14–15 | F-22 konsol Cypher, F-23 `SALING_KENAL` | B, D/F | Bila waktu ada |
| **J15** | **FEATURE FREEZE** | Semua | Tidak ada fitur baru |
| J15–16 | Drill 10 pertanyaan kejutan | Semua | Daftar perbaikan |
| J16–17 | Deploy final + smoke test produksi + gerbang Basic Auth | B | URL produksi lulus smoke test |
| J16–17,5 | Skrip demo, video cadangan, 2 kali gladi resik, submission | F + semua | Video + skrip final |
| J17,5–18 | Buffer | Semua | — |

**Urutan pemotongan bila terlambat:**
1. Fitur Could (F-24 s.d. F-30).
2. Should dari belakang: F-23 → F-22 → F-21 → F-20 → F-19 → F-18 → F-17 → F-16. F-15 dipotong paling akhir karena menjadi fallback J12.
3. Bila gerbang J8 gagal: F-17 batal, dan D membantu F-04 sampai golden test lulus.
4. Bila gerbang J12 gagal: F-14 dibekukan sebagai fitur beta, dan demo memakai F-15 + konsol Aura.
5. Bila F-12 terlambat: viewer hanya untuk C01–C06, dengan konsol Aura sebagai cadangan visual. Visualisasi graph tidak boleh dihapus karena diwajibkan aturan acara.

## 8. Asumsi, Risiko & Pertanyaan Terbuka

**Daftar ⚠️ ASUMSI:**

| ID | Asumsi | Dampak jika salah | Cara validasi | Batas waktu |
| --- | --- | --- | --- | --- |
| A1 | Tidak ada kode ide Fase 2; nama produk sementara "Churn Early Warning Graph" (kandidat: Canary, SignalGraph, Ripple). | Branding pitch berubah; fitur tidak terdampak. | Tim memilih nama. | Sebelum skrip demo, J16 |
| A2 | Sisa ±18 jam dihitung pada 9 Okt 16.36 WIB; jam resmi tidak diketahui. PRD ini ditulis 18.34 WIB, jadi ±2 jam sudah terpakai. | Kapasitas lebih kecil; garis potong maju. | Tanya panitia jam selesai dan jam demo. | J0 |
| A3 | Jam efektif 14 jam/orang, sehingga kapasitas 42 jo. | Bila 12 jam/orang (36 jo), Must 25 jo = 69%, dan F-14 harus turun ke Should. | Hitung ulang setelah A2 terjawab. | J0 |
| A4 | Estimasi per fitur (dari total Priority Matrix ±26 jo, dibagi per fitur di PRD ini); tim memakai AI coding assistant. | Effort nyata bisa 1,5–2×, sehingga gerbang J8/J12 lebih sering gagal. | Bandingkan jam nyata F-01 dengan estimasi di J5. | J5 |
| A5 | Tidak ada checkpoint panitia, mentoring, atau batas submission selain demo akhir. | Blok kerja terpotong agenda. | Tanya panitia. | J0 |
| A6 | Durasi pitch/demo tidak diketahui; perangkat laptop tim + URL Vercel. | Skrip demo terlalu panjang atau pendek. | Tanya panitia. | J8 |
| A7 | URL publik tidak diwajibkan; deploy dilakukan untuk ketahanan demo. | Bila wajib, deploy menjadi Must. | Baca ulang aturan / tanya panitia. | J2 |
| A8 | Tim punya API key LLM dengan tool calling; provider = endpoint OpenAI-compatible 9router (keputusan 2026-10-09; spike T00-12 lulus). | F-14 gugur, sehingga F-15 + F-22 menjadi jalur menjawab juri. | Spike tool call di J0,5–2. | J2 |
| A9 | Batas AuraDB Free 200 ribu node / 400 ribu relasi (belum dicek di halaman resmi). | Load gagal; agregasi harus lebih kasar. | Cek konsol Aura saat membuat instance. | J2 |
| A10 | Tanpa anggaran; semua layanan memakai tier gratis. | Bila kuota LLM habis, F-14 dan F-17 terhambat. | Cek kuota akun LLM dan TypeSafe. | J2 |
| A11 | Keahlian Dio tidak tersurat; inferensi lemah bahwa ia familier Python, sedangkan stack tim TypeScript/Bun. | Backend B lebih lambat. | Tanya Dio; bila perlu, D atau F pair di F-14. | J0 |
| A12 | Keahlian Tegar tidak tersurat. | F-12 (React Flow + ELK) terlambat. | Tanya Tegar; spike React Flow di J0,5–2. | J2 |
| A13 | Pemetaan kode sinyal Dio (S1–S8, Z1–Z3, A7) disusun dari konteks. | Aturan F-04 tidak sesuai ekspektasi Dio. | Konfirmasi ke Dio. | J0,5 |
| A14 | Persona Laras dan Bima fiktif, tidak berasal dari data validasi; alur kerja CS di section 1 diturunkan dari studi kasus. | Kasus penggunaan kurang tepat sasaran. | Tanya mentor/juri saat ada kesempatan. | Sebelum demo |
| A15 | Nilai p(level) untuk rupiah berisiko: 0,6 / 0,4 / 0,2 / 0,05. | Angka rupiah dipertanyakan juri. | Tampilkan sebagai asumsi yang bisa diubah di UI; siapkan jawaban. | J9 |
| A16 | Target angka metrik yang tidak berasal dari input: ≥10/12 preset di J15, ≥7/10 kejutan, ≤2 menit, ≥4 sumber, respons <2 detik, ≤120 node, metrik produk. | Metrik terlalu ketat atau longgar. | Ukur saat drill J15–16, lalu sesuaikan. | J16 |
| A17 | Internet venue stabil; Aura, Vercel, dan LLM berjalan di cloud. | Demo live gagal. | Uji di venue; siapkan video + cache. | J15 |
| A18 | Kalimat pitch belum ada; value proposition di section 2 adalah draf. | Pitch tidak tajam. | F menyusun kalimat pitch final. | J16 |
| A19 | Juri akan bertanya tentang akun di luar C01–C06 (studi kasus menyebut "dataset penuh"). | Bila tidak, sebagian pekerjaan generik tidak terpakai (risiko kecil). | — (dirancang generik) | — |
| A20 | Jev akurat untuk teks bahasa Indonesia. | R3/F-17 lebih buruk daripada kamus. | Spike 20 tiket berlabel. | J10 |
| A22 | Tingkat melek teknologi persona menengah. | UI terlalu teknis atau terlalu sederhana. | Uji alur dengan anggota yang tidak membangun UI. | J15 |

Nomor A21 sengaja tidak dipakai.

**3 risiko teratas:**

| Risiko | Mitigasi |
| --- | --- |
| F-04 tidak lulus golden test di J8 (aturan generik salah tangkap, kamus R3 belum disepakati 7+4 vs 8+6) | Kunci kamus R3 di J0,5 dan tulis golden test sebelum aturan. Gerbang J8: F-17 batal, D fokus ke F-04. |
| F-14 gagal menjawab pertanyaan kejutan secara live (LLM lambat, tool salah pilih, internet putus) | Tool tetap + validator F-10, F-15 cache, F-22 konsol, konsol Aura, dan video cadangan. Drill di J15–16. |
| Kapasitas lebih kecil dari 42 jo (A2, A3, A4) | Hitung ulang di J0. Bila Must > 60%, F-14 turun ke Should, dan F-15 + F-22 naik menjadi jalur menjawab juri. |

**Pertanyaan yang harus dijawab sebelum coding:**
1. Jam selesai resmi, jam demo, dan durasi pitch? (A2, A5, A6)
2. ~~Provider LLM apa, dan apakah API key sudah ada dengan kuota cukup?~~ Terjawab 2026-10-09: endpoint OpenAI-compatible 9router milik sendiri; kuota (A10) belum diverifikasi.
3. Kamus gejala R3 mana yang dipakai, dan berapa angka tiket yang dikunci di golden test (7+4 atau 8+6)?
4. Apakah pemetaan S1–S8 / Z1–Z3 / A7 sesuai maksud Dio? (A13)
5. Siapa yang memegang pitch dan presentasi, dan apakah approval manusia dinilai (menentukan nasib F-25)?
6. Nama produk final? (A1)

## 9. Ringkasan Handoff

**Jalur demo utama (★):**
1. Buka Radar (F-11). C01 berada di Kritis peringkat 1, dengan badge "Dashboard: Hijau vs Temuan: Kritis" dan rupiah berisiko (F-05).
2. Klik C01. Subgraph bukti terbuka (F-12, F-08): champion pindah ke P01, CFO baru menyebut KasirPro, dan janji FEAT-07 → `decision_log`.
3. Klik node champion. Kartu "CRM vs Riwayat kerja" tampil berdampingan (F-06).
4. Buka kartu tindakan C01 (F-09). Tampil preseden, penyetuju, biaya vs rupiah berisiko, dan tanda bila menyimpang dari batas diskon 15%.
5. Kembali ke Radar. C03 ditandai bug, bukan churn; C02 berstatus "konsisten" beserta alasannya (F-07).
6. Ketik pertanyaan baru di Tanya Graph (F-14), misalnya tentang akun di luar C01–C06. Jawaban tampil dengan chip ID bukti yang lolos validator (F-10).

**Fitur Must:**

| ID | Nama | User story utama |
| --- | --- | --- |
| F-01 | Pipeline ETL + rekonsiliasi | Sebagai Laras, saya ingin data 6 sistem disatukan dengan benar agar peringkat tidak dibangun di atas data salah. |
| F-02 | Graph loader & skema | Sebagai Laras, saya ingin setiap fakta bisa dilacak ke file asalnya agar bukti bisa dipercaya. |
| F-03 | Relasi turunan v1 | Sebagai Laras, saya ingin melihat hubungan yang tak tercatat di satu sistem agar bug tidak dibaca sebagai churn. |
| F-04 | Inconsistency Radar v1 | Sebagai Laras, saya ingin sistem menandai sumber yang saling bertentangan agar risiko tersembunyi terlihat. |
| F-05 | Skor, level, rupiah + Dashboard vs Temuan | Sebagai Laras, saya ingin tahu akun "hijau" yang sebenarnya berisiko beserta rupiahnya agar tahu prioritas. |
| F-06 | Kartu bukti Sumber A vs B | Sebagai Bima, saya ingin dua catatan yang bertentangan tampil berdampingan agar bisa menjelaskan risiko dengan fakta. |
| F-07 | Penjelasan akun aman | Sebagai Bima, saya ingin tahu mengapa akun dinilai aman agar bisa menjawab "kenapa tidak berisiko?". |
| F-08 | API jalur bukti | Sebagai Laras, saya ingin setiap temuan punya jalur bukti agar rekomendasi bisa ditelusuri. |
| F-09 | Tindakan retensi berbasis preseden | Sebagai Laras, saya ingin tindakan yang merujuk keputusan serupa agar bisa disetujui tanpa menebak. |
| F-10 | Guardrail & validasi sitasi | Sebagai Laras, saya ingin jawaban AI hanya memuat klaim berbukti agar tidak tertipu kutipan karangan. |
| F-11 | Radar home | Sebagai Laras, saya ingin 40 akun diurutkan menurut risiko agar tahu harus mulai dari mana. |
| F-12 | Penampil subgraph bukti v1 | Sebagai Bima, saya ingin jalur bukti sebagai graph yang bisa diklik agar paham keterkaitan sinyal. |
| F-14 | Tanya Graph versi sempit | Sebagai Bima, saya ingin bertanya hal baru dan mendapat jawaban berbukti agar pertanyaan rapat langsung terjawab. |

**Tech stack:**
- Next.js 16 (App Router) + React 19 + TypeScript.
- shadcn/ui (base-nova) + Tailwind CSS 4 + lucide-react.
- React Flow (@xyflow/react) + elkjs; shadcn Chart (Recharts).
- Next.js Route Handlers + `src/server/*`.
- Neo4j AuraDB Free + neo4j-driver (READ) + full-text index.
- Pipeline: Bun + papaparse + zod → JSONL.
- Analitik: aturan Cypher + skoring TypeScript.
- AI: Vercel AI SDK tool calling + validator sitasi.
- Testing: `bun test`.
- Deploy: Vercel Hobby, dengan `src/proxy.ts` sebagai gerbang demo.
- Opsional: TypeSafe Jev (`@typesafe-ai/sdk`, versi exact), hanya bila spike lolos.

**Pengganti sementara yang perlu di-mock:**
- p(level) hardcode untuk rupiah berisiko;
- Basic Auth satu akun demo;
- snapshot data statis;
- cache jawaban preset;
- fixture JSON untuk UI sebelum J9;
- `aliases.csv` manual bila F-16 dipotong;
- video demo cadangan + query tersimpan di konsol Aura.

Cek konsistensi: a [x] · b [x] · c [x] · d [x] · e [x] -- a: Must 25 jo = 59,5% dari 42 jo setelah P13 diturunkan ke Should; margin tipis dan bergantung pada A3. e: F-01–F-04 melayani jalur demo secara tidak langsung sebagai fondasi data untuk langkah 1–6.
