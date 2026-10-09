// Aturan 4 -- OUTREACH_TAK_BERBALAS. Bobot awal 2.
// Karyawan mengirim ≥ 2 email non-template ke kontak akun yang tidak pernah dibalas (tanpa MEMBALAS), dan klien tidak
// mengirim email apa pun sesudah email tak berbalas yang pertama. Email template klien tetap dihitung sebagai bukti
// kontak terakhir (Z3: tanggalnya sah, isinya tidak). Ambang 2 email = ASUMSI, dikalibrasi di T04-07.
MATCH (a:Akun {tipe: 'pelanggan'})
MATCH (i:Interaksi {tipe: 'email', template: false})-[:TENTANG]->(a)
MATCH (e:Karyawan {id: i.dari_id})
MATCH (k:Kontak {id: i.ke_id})
WHERE i.tanggal <= date($snapshot)
  AND NOT EXISTS { (:Interaksi)-[:MEMBALAS]->(i) }
WITH a, i
ORDER BY i.tanggal, i.id
WITH a, collect(i) AS tak
WHERE size(tak) >= 2
WITH a, tak, tak[0].tanggal AS pertama
OPTIONAL MATCH (m:Interaksi {tipe: 'email'})-[:TENTANG]->(a)
WHERE m.tanggal <= date($snapshot) AND EXISTS { MATCH (:Kontak {id: m.dari_id}) }
WITH a, tak, pertama, max(m.tanggal) AS terakhirKlien
WHERE terakhirKlien IS NULL OR terakhirKlien < pertama
RETURN a.id AS akun,
       'OUTREACH_TAK_BERBALAS' AS kode,
       2 AS bobot,
       [a.id] + [x IN tak | x.id] AS bukti_ids,
       {jumlah_tak_berbalas: size(tak), interaksi: [x IN tak | x.id],
        kontak_terakhir_klien: CASE WHEN terakhirKlien IS NULL THEN null ELSE toString(terakhirKlien) END,
        hari_sejak_kontak_klien: CASE WHEN terakhirKlien IS NULL THEN null ELSE duration.inDays(terakhirKlien, date($snapshot)).days END} AS fakta,
       pertama AS sejak
