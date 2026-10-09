// Aturan 6 -- TIKET_BUG_TAK_TERTAUT (R3 kamus gejala). Bobot awal 1.
// Akun punya ≥ 3 tiket yang KANDIDAT_DISEBABKAN_OLEH sebuah bug padahal Support belum menautkannya (derive F-03).
// Z1: tiket permintaan_fitur tidak pernah dihitung sebagai sinyal negatif. Ambang 3 = ASUMSI (kalibrasi T04-07).
MATCH (t:Tiket)-[:KANDIDAT_DISEBABKAN_OLEH]->(b:Bug)
MATCH (a:Akun {tipe: 'pelanggan'})
WHERE a.id = t.account_id AND t.kategori <> 'permintaan_fitur'
WITH a, b, t
ORDER BY t.dibuat, t.id
WITH a, b, collect(t) AS tiket
WHERE size(tiket) >= 3
RETURN a.id AS akun,
       'TIKET_BUG_TAK_TERTAUT' AS kode,
       1 AS bobot,
       [a.id, b.id] + [x IN tiket | x.id] AS bukti_ids,
       {bug: b.id, judul_bug: b.judul, jumlah_tiket: size(tiket), tiket: [x IN tiket | x.id]} AS fakta,
       tiket[0].dibuat AS sejak
