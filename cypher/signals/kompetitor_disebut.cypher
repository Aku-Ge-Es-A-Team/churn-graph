// Aturan 3 -- KOMPETITOR_DISEBUT. Bobot awal 2.
// Interaksi NON-template (Z3) yang menyebut kompetitor dan membahas akun pelanggan. Satu sinyal per (akun, kompetitor).
// Kontak yang hadir di interaksi itu ikut jadi bukti (mis. CFO baru).
MATCH (i:Interaksi {template: false})-[:MENYEBUT]->(c:Kompetitor)
MATCH (i)-[:TENTANG]->(a:Akun {tipe: 'pelanggan'})
WHERE i.tanggal <= date($snapshot)
OPTIONAL MATCH (p:Kontak)-[:TERLIBAT_DI]->(i)
WITH a, c, i, collect(DISTINCT p) AS peserta
ORDER BY i.tanggal, i.id
WITH a, c, collect(i) AS ix, collect(peserta) AS pesertaPerInteraksi
WITH a, c, ix, reduce(semua = [], ps IN pesertaPerInteraksi | semua + [p IN ps WHERE NOT p IN semua]) AS kontak
RETURN a.id AS akun,
       'KOMPETITOR_DISEBUT' AS kode,
       2 AS bobot,
       [a.id, c.id] + [x IN ix | x.id] + [p IN kontak | p.id] AS bukti_ids,
       {kompetitor: c.nama, jumlah_interaksi: size(ix), interaksi: [x IN ix | x.id], kontak: [p IN kontak | p.id]} AS fakta,
       ix[0].tanggal AS sejak
