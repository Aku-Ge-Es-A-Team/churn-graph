// Rule 7 -- ANOMALI_USAGE_RILIS_BUG. Initial weight 2.
// An outlet of the account shows a usage drop (Anomali, F-03) that BERTEPATAN_DENGAN a release which still has open bugs.
// Z2: a drop like this is interpreted as "bug, bukan churn" -- it is not evidence that the customer stopped using the product.
// Attached bugs: the release's bugs that have tickets (candidate/linked) from the same account; if there are none, all open bugs of that release.
MATCH (a:Akun {tipe: 'pelanggan'})-[:MEMILIKI]->(o:Outlet)-[:MENGALAMI]->(n:Anomali)-[bd:BERTEPATAN_DENGAN]->(r:Rilis)
MATCH (b:Bug)-[:TERDAPAT_DI]->(r)
WHERE b.selesai IS NULL
WITH a, r, o, n, bd, collect(DISTINCT b) AS bugs
ORDER BY o.id
WITH a, r, collect(o) AS outlet, collect(n) AS anomali, min(bd.sejak) AS sejak, bugs
WITH a, r, outlet, anomali, sejak,
     [b IN bugs WHERE EXISTS { MATCH (t:Tiket)-[:KANDIDAT_DISEBABKAN_OLEH|DISEBABKAN_OLEH]->(b) WHERE t.account_id = a.id }] AS bugTerkait,
     bugs
WITH a, r, outlet, anomali, sejak,
     CASE WHEN size(bugTerkait) > 0 THEN bugTerkait ELSE bugs END AS bug
RETURN a.id AS akun,
       'ANOMALI_USAGE_RILIS_BUG' AS kode,
       2 AS bobot,
       [a.id] + [x IN outlet | x.id] + [x IN anomali | x.id] + [r.id] + [x IN bug | x.id] AS bukti_ids,
       {tafsir: 'bug, bukan churn', rilis: r.id, bug: [x IN bug | x.id], jumlah_outlet: size(outlet), outlet: [x IN outlet | x.id],
        delta_pct_min: reduce(m = 0.0, x IN anomali | CASE WHEN x.delta_pct < m THEN x.delta_pct ELSE m END),
        delta_pct_maks: reduce(m = -100.0, x IN anomali | CASE WHEN x.delta_pct > m THEN x.delta_pct ELSE m END),
        metrik: anomali[0].metrik, jendela: anomali[0].jendela} AS fakta,
       sejak
