// Graph schema (F-02, T02-01). Run by `scripts/load.ts` before loading data.
// One unique constraint per label + :Entitas (the secondary label of every node) + the full-text index `teks_bebas`.
// Everything is `IF NOT EXISTS`, so it is safe to run repeatedly. A new label MUST be added here and to the `LABEL` allowlist in scripts/load.ts.

CREATE CONSTRAINT entitas_id IF NOT EXISTS FOR (n:Entitas) REQUIRE n.id IS UNIQUE;

CREATE CONSTRAINT akun_id IF NOT EXISTS FOR (n:Akun) REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT anomali_id IF NOT EXISTS FOR (n:Anomali) REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT bug_id IF NOT EXISTS FOR (n:Bug) REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT deal_id IF NOT EXISTS FOR (n:Deal) REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT fitur_id IF NOT EXISTS FOR (n:Fitur) REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT interaksi_id IF NOT EXISTS FOR (n:Interaksi) REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT karyawan_id IF NOT EXISTS FOR (n:Karyawan) REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT keputusan_id IF NOT EXISTS FOR (n:Keputusan) REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT kompetitor_id IF NOT EXISTS FOR (n:Kompetitor) REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT kontak_id IF NOT EXISTS FOR (n:Kontak) REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT kontrak_id IF NOT EXISTS FOR (n:Kontrak) REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT organisasi_id IF NOT EXISTS FOR (n:Organisasi) REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT outlet_id IF NOT EXISTS FOR (n:Outlet) REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT rilis_id IF NOT EXISTS FOR (n:Rilis) REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT sinyal_id IF NOT EXISTS FOR (n:Sinyal) REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT tiket_id IF NOT EXISTS FOR (n:Tiket) REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT usagebulan_id IF NOT EXISTS FOR (n:UsageBulan) REQUIRE n.id IS UNIQUE;

CREATE FULLTEXT INDEX teks_bebas IF NOT EXISTS FOR (n:Interaksi|Tiket) ON EACH [n.subjek, n.isi, n.judul, n.deskripsi];
