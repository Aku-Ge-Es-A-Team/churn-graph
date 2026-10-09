// Aturan 2 -- JANJI_DILANGGAR (R2 Janji). Bobot awal 3.
// Karyawan menyetujui Keputusan yang MENJANJIKAN sebuah Fitur, dan status janjinya belum ditepati.
// Akun dari Keputusan.account_id (tabel relasi tidak punya Keputusan → Akun); Kontrak yang DIDASARKAN_PADA keputusan itu
// dan interaksi bukti keputusan dilampirkan bila ada.
MATCH (e:Karyawan)-[:MENYETUJUI]->(d:Keputusan)-[j:MENJANJIKAN]->(f:Fitur)
MATCH (a:Akun {tipe: 'pelanggan'})
WHERE a.id = d.account_id
  AND toLower(j.status_janji) STARTS WITH 'belum'
OPTIONAL MATCH (k:Kontrak)-[:DIDASARKAN_PADA]->(d)
OPTIONAL MATCH (d)-[:DIDASARKAN_PADA]->(bukti:Interaksi)
WITH a, e, d, j, f, collect(DISTINCT k) AS kontrak, collect(DISTINCT bukti) AS bukti
RETURN a.id AS akun,
       'JANJI_DILANGGAR' AS kode,
       3 AS bobot,
       [a.id, d.id, f.id, e.id] + [x IN kontrak | x.id] + [x IN bukti | x.id] AS bukti_ids,
       {keputusan: d.id, tipe: d.tipe, disetujui_oleh: e.id, fitur: f.id, nama_fitur: f.nama,
        status_janji: j.status_janji, status_fitur: f.status,
        target_awal: f.target_awal, target_terkini: f.target_terkini,
        tanggal_keputusan: toString(d.tanggal)} AS fakta,
       d.tanggal AS sejak
