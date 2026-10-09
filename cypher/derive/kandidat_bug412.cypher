// Derived relation: tickets that were PROBABLY caused by the offline-sync bug but have not been linked by Support (F-03, T03-04).
// Conditions (all must hold):
//   1. the outlet uses offline mode (mode_offline = true);
//   2. the outlet runs the release that contains the bug -- the version comes from the USAGE DATA (MENJALANKAN_VERSI), not from the ticket's version column;
//   3. the ticket was created on/after the date the outlet started running that release;
//   4. the ticket has no DISEBABKAN_OLEH to any bug yet;
//   5. the ticket title contains a symptom word. The symptom dictionary comes from real ticket titles in the dataset
//      (kept in the dataset's own language): "Sinkronisasi", "Selisih transaksi", "Laporan tidak sesuai", "Data penjualan hilang".
// The ticket category is deliberately NOT used as a filter (the same symptoms are logged both as bugs and as questions);
// filtering out permintaan_fitur is done on the signal side (Z1, cypher/signals).
// Golden expectation: 14 tickets (C03: 8, C05: 6).

// Bersihkan hasil lama berkas ini agar perubahan kamus tidak meninggalkan relasi usang.
MATCH ()-[r:KANDIDAT_DISEBABKAN_OLEH]->()
WHERE r.source_file = 'cypher/derive/kandidat_bug412.cypher'
DELETE r;

MATCH (b:Bug {id: 'BUG-412'})-[:TERDAPAT_DI]->(v:Rilis)
MATCH (o:Outlet {mode_offline: true})-[mv:MENJALANKAN_VERSI]->(v)
MATCH (o)-[:MEMBUKA_TIKET]->(t:Tiket)
WHERE t.dibuat >= mv.sejak
  AND NOT EXISTS { (t)-[:DISEBABKAN_OLEH]->(:Bug) }
  AND t.judul =~ '(?i).*(sinkron|laporan tidak sesuai|selisih transaksi|data penjualan hilang).*'
MERGE (t)-[r:KANDIDAT_DISEBABKAN_OLEH {key: 'KANDIDAT_DISEBABKAN_OLEH:' + t.id + '->' + b.id}]->(b)
SET r.derived = true,
    r.rule = 'offline+versi_usage+gejala',
    r.confidence = 0.8,
    r.source_file = 'cypher/derive/kandidat_bug412.cypher',
    r.source_id = t.id;
