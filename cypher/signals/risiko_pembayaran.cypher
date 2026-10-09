// Aturan 5 -- RISIKO_PEMBAYARAN. Bobot awal 2.
// Kontrak dengan keterlambatan bayar berulang (≥ 2 dalam 12 bulan; ambang = ASUMSI, kalibrasi di T04-07).
// Bukti pendukung (bila ada): keputusan yang menyangkut pembayaran dan tiket billing akun itu.
MATCH (a:Akun {tipe: 'pelanggan'})-[:MEMILIKI]->(k:Kontrak)
WHERE k.keterlambatan_bayar_12bln >= 2
OPTIONAL MATCH (d:Keputusan)
WHERE d.account_id = a.id AND toLower(coalesce(d.nilai_teks, '')) CONTAINS 'bayar'
WITH a, k, d
ORDER BY d.tanggal, d.id
WITH a, k, collect(d) AS keputusan
OPTIONAL MATCH (t:Tiket {account_id: a.id, kategori: 'billing'})
WITH a, k, keputusan, t
ORDER BY t.dibuat, t.id
WITH a, k, keputusan, collect(t) AS tiket
RETURN a.id AS akun,
       'RISIKO_PEMBAYARAN' AS kode,
       2 AS bobot,
       [a.id, k.id] + [x IN keputusan | x.id] + [x IN tiket | x.id] AS bukti_ids,
       {kontrak: k.id, keterlambatan_bayar_12bln: k.keterlambatan_bayar_12bln,
        keputusan: [x IN keputusan | x.id], tiket_billing: [x IN tiket | x.id]} AS fakta,
       coalesce(keputusan[0].tanggal, date($snapshot) - duration('P12M')) AS sejak
