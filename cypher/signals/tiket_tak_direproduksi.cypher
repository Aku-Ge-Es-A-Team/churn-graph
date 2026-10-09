// Aturan 8 -- TIKET_TAK_DIREPRODUKSI. Bobot awal 1. (Slot ke-8 = ASUMSI A13; sumber: PRD §1, 4 dari 14 tiket bergejala sinkronisasi.)
// Tiket yang bergejala sinkronisasi (KANDIDAT_DISEBABKAN_OLEH) tetapi ditutup "tidak dapat direproduksi".
// Z1: permintaan_fitur dikecualikan. Satu sinyal per (akun, bug).
MATCH (t:Tiket)-[:KANDIDAT_DISEBABKAN_OLEH]->(b:Bug)
MATCH (a:Akun {tipe: 'pelanggan'})
WHERE a.id = t.account_id
  AND t.kategori <> 'permintaan_fitur'
  AND toLower(t.status) CONTAINS 'tidak dapat direproduksi'
WITH a, b, t
ORDER BY t.dibuat, t.id
WITH a, b, collect(t) AS tiket
RETURN a.id AS akun,
       'TIKET_TAK_DIREPRODUKSI' AS kode,
       1 AS bobot,
       [a.id, b.id] + [x IN tiket | x.id] AS bukti_ids,
       {bug: b.id, jumlah_tiket: size(tiket), tiket: [x IN tiket | x.id]} AS fakta,
       tiket[0].dibuat AS sejak
