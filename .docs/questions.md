# Pertanyaan Kompetensi Graph

> Sumber: Rencana Teknis Langkah 1 (8 inti Tim 1 + 4 lintas tim). Label dan relasi hanya dari tabel relasi Rencana Teknis Langkah 3. Status: draf Adrian (T00-01), disetujui Adrian 2026-10-09; persetujuan Dio dan Tegar belum dicatat.

Aturan baca: setiap pertanyaan punya satu pola path utama (Cypher-ish). Filter waktu memakai `$snapshot` = `SNAPSHOT_DATE` (`2026-10-01`). Pertanyaan yang tidak bisa dijawab oleh pola path ditandai **model belum lengkap**.

## Inti Tim 1

### Q1. Akun mana yang paling berisiko churn, dan mengapa?
```
(s:Sinyal)-[:PADA]->(a:Akun)-[:MEMILIKI]->(k:Kontrak), (s)-[:BUKTI]->(x:Entitas)
```
Urutan dari skor sinyal (skoring TypeScript); "mengapa" = `s.kode` + node `BUKTI`.

### Q2. Mengapa C01 kritis padahal dashboard hijau?
```
(k:Kontak)-[:CHAMPION_DARI {klaim:'crm'}]->(a:Akun {id:'C01'}),
(k)-[:PERNAH_BEKERJA_DI {selesai}]->(a), (k)-[:BEKERJA_DI {mulai}]->(p:Akun {id:'P01'}),
(e:Karyawan)-[:MENYETUJUI]->(d:Keputusan)-[:MENJANJIKAN {status_janji}]->(f:Fitur)
```
Kontras dengan properti `a.health_score_dashboard`.

### Q3. Apakah penurunan usage C03 berarti pelanggan berhenti memakai?
```
(a:Akun {id:'C03'})-[:MEMILIKI]->(o:Outlet {mode_offline:true})-[:MENCATAT]->(u:UsageBulan),
(o)-[:MENGALAMI]->(an:Anomali)-[:BERTEPATAN_DENGAN]->(r:Rilis {id:'v4.12'}),
(o)-[:MENJALANKAN_VERSI {sejak}]->(r), (b:Bug {id:'BUG-412'})-[:TERDAPAT_DI]->(r)
```
Kelompok kontrol: `(o2:Outlet {mode_offline:true})-[:MENCATAT]->(:UsageBulan)` tanpa `(o2)-[:MENJALANKAN_VERSI]->(:Rilis {id:'v4.12'})`.

### Q4. Akun mana lagi yang terdampak, atau berpotensi terdampak, BUG-412?
```
(a:Akun)-[:MEMILIKI]->(o:Outlet)-[:MEMBUKA_TIKET]->(t:Tiket)
  -[:DISEBABKAN_OLEH|KANDIDAT_DISEBABKAN_OLEH]->(b:Bug {id:'BUG-412'})-[:TERDAPAT_DI]->(r:Rilis)
```
Berpotensi: `(a)-[:MEMILIKI]->(o:Outlet {mode_offline:true})` yang belum `MENJALANKAN_VERSI` ke `r`.

### Q5. Janji apa yang pernah diberikan ke C01, siapa yang menyetujui, dan apakah ditepati?
```
(a:Akun {id:'C01'})-[:MEMILIKI]->(:Kontrak)-[:DIDASARKAN_PADA]->(d:Keputusan),
(e:Karyawan)-[:MENYETUJUI]->(d)-[:MENJANJIKAN {status_janji}]->(f:Fitur),
(d)-[:DIDASARKAN_PADA]->(i:Interaksi)-[:TENTANG]->(a)
```
Catatan: tabel Langkah 3 tidak punya relasi langsung Keputusan → Akun; keputusan tanpa kontrak maupun interaksi bukti (mis. eskalasi) hanya tersambung lewat properti `d.account_id`.

### Q6. Tindakan retensi apa untuk C04, dan preseden mana yang mendukungnya?
```
(s:Sinyal)-[:PADA]->(a:Akun {id:'C04'}),
(e:Karyawan)-[:MENYETUJUI]->(d:Keputusan {tipe})-[:DIDASARKAN_PADA]->(i:Interaksi)
```
Preseden dipilih dari `d.tipe` yang sesuai `s.kode` (pemetaan sinyal → tipe keputusan milik F-09).

### Q7. Berapa nilai kontrak yang berisiko dalam 90 hari ke depan?
```
(s:Sinyal)-[:PADA]->(a:Akun)-[:MEMILIKI]->(k:Kontrak)
WHERE k.tanggal_renewal <= date($snapshot) + duration({days:90})
```
Rupiah dari output skoring (`nilaiBerisiko`, Estimasi).

### Q8. Kontak pelanggan mana yang pindah perusahaan dalam 6 bulan terakhir?
```
(k:Kontak)-[lama:PERNAH_BEKERJA_DI]->(a:Akun), (k)-[baru:BEKERJA_DI]->(x)
WHERE lama.selesai >= date($snapshot) - duration({months:6}) AND baru.mulai >= lama.selesai
```
`x` bisa `Akun` atau `Organisasi`.

## Lintas tim

### Q9. Di mana Rina sekarang, dan apa dampaknya ke deal P01? (Tim 2/3)
```
(k:Kontak {id:'K017'})-[:BEKERJA_DI]->(p:Akun {id:'P01'})-[:MEMILIKI]->(dl:Deal),
(k)-[:CHAMPION_DARI]->(c:Akun {id:'C01'})
```

### Q10. Lewat siapa jalur terbaik menuju decision maker P01? (Tim 3)
```
shortestPath((e:Karyawan)-[:TERLIBAT_DI|BEKERJA_DI|PERNAH_BEKERJA_DI|SALING_KENAL*..4]-(dm:Kontak)),
(dm)-[:BEKERJA_DI {jabatan}]->(p:Akun {id:'P01'})
```
"Decision maker" ditentukan dari properti `jabatan`/isi interaksi, bukan relasi.

### Q11. Diskon tertinggi yang pernah disetujui, oleh siapa, dan apa alasannya? (Tim 4)
```
(e:Karyawan)-[:MENYETUJUI]->(d:Keputusan {tipe:'diskon'})-[:DIDASARKAN_PADA]->(i:Interaksi)
ORDER BY d.nilai DESC
```
`d.nilai` diparse menjadi persen di ETL; alasan dari `d.alasan`.

### Q12. Pelanggan mana yang akan melampaui batas outlet paketnya? (Tim 5)
```
(a:Akun)-[:MEMILIKI]->(k:Kontrak), (a)-[:MEMILIKI]->(o:Outlet), (i:Interaksi)-[:TENTANG]->(a)
```
Kondisi saat ini: `k.outlet_kontrak` vs `k.batas_outlet_paket` (`"tanpa batas"` dikecualikan).

## Celah model

- Tidak ada pertanyaan tanpa pola path, jadi tidak ada yang ditandai **model belum lengkap**.
- Sebagian (tercatat, bukan blokir):
  - Q12: rencana ekspansi (mis. C02 +6 cabang, C06 +10 outlet) hanya ada di teks bebas `Interaksi.isi`, sehingga dijawab lewat full-text index, bukan relasi.
  - Q5: Keputusan tanpa kontrak dan tanpa interaksi bukti hanya terhubung ke akun lewat properti `account_id`.
  - Q10: "decision maker" bergantung pada properti `jabatan`.
