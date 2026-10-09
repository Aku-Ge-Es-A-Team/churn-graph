// Rule 1 -- CHAMPION_KELUAR (R1 Orang). Initial weight 3 (Technical Plan Step 7).
// According to the CRM, the champion no longer works at that account (PERNAH_BEKERJA_DI ended <= $snapshot, with no active BEKERJA_DI to the same account).
// OPTIONAL: the new organization/account and the "pamit" (farewell) interaction. A farewell is recognized by a sender whose email is not yet resolved
// (dari_id kosong) tetapi bagian lokalnya = nama kontak bertitik (rina.hapsari), dalam ±30 hari dari tanggal selesai.
// (ASUMSI heuristik sampai F-16 menyelesaikan email lama; bila sudah terselesaikan, dari_id = kontak dipakai langsung.)
MATCH (k:Kontak)-[:CHAMPION_DARI]->(a:Akun {tipe: 'pelanggan'})
MATCH (k)-[lama:PERNAH_BEKERJA_DI]->(a)
WHERE lama.selesai <= date($snapshot)
  AND NOT EXISTS { (k)-[:BEKERJA_DI]->(a) }
WITH a, k, max(lama.selesai) AS selesai
OPTIONAL MATCH (k)-[baru:BEKERJA_DI]->(tujuan)
WHERE baru.mulai >= selesai
WITH a, k, selesai, collect(DISTINCT tujuan) AS tujuan, collect(DISTINCT baru.jabatan) AS jabatanBaru
OPTIONAL MATCH (pamit:Interaksi)-[:TENTANG]->(a)
WHERE pamit.template = false
  AND pamit.tanggal >= selesai - duration('P30D') AND pamit.tanggal <= selesai + duration('P30D')
  AND (pamit.dari_id = k.id
       OR (pamit.dari_id IS NULL AND pamit.dari IS NOT NULL
           AND toLower(split(pamit.dari, '@')[0]) = toLower(replace(k.nama, ' ', '.'))))
WITH a, k, selesai, tujuan, jabatanBaru, collect(DISTINCT pamit) AS pamit
RETURN a.id AS akun,
       'CHAMPION_KELUAR' AS kode,
       3 AS bobot,
       [a.id, k.id] + [x IN tujuan | x.id] + [p IN pamit | p.id] AS bukti_ids,
       {kontak: k.id, nama: k.nama, keluar: toString(selesai), pindah_ke: [x IN tujuan | x.id],
        jabatan_baru: jabatanBaru, interaksi_pamit: [p IN pamit | p.id]} AS fakta,
       selesai AS sejak
