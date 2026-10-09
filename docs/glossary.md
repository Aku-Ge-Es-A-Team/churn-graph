# Glosarium: kosakata dokumen (Indonesia) ↔ identifier kode (Inggris)

Konvensi (keputusan Adrian, 2026-10-09): semua identifier, konten aplikasi, dan UI memakai bahasa Inggris; dokumentasi tetap berbahasa Indonesia. Kosakata graph yang **sudah tersimpan di Aura** dan ditetapkan dokumen produk tidak diterjemahkan, supaya data, query Cypher, dan dokumen tetap sinkron. Query server menerjemahkannya di batas (lihat `src/server/queries/`).

## Yang berubah menjadi bahasa Inggris di kode

| Dokumen | Kode / UI |
| --- | --- |
| Kritis / Tinggi / Waspada / Aman | `Critical` / `High` / `Watch` / `Safe` |
| Hijau / Kuning / Merah (health score dashboard) | `Green` / `Yellow` / `Red` |
| `RiskRow`: `akun`, `nama`, `skor`, `divergen`, `renewalHari`, `nilaiTahunan`, `rupiahBerisiko`, `sinyalTeratas` | `account`, `name`, `score`, `diverges`, `renewalDays`, `annualValue`, `atRiskValue`, `topSignals` |
| Sinyal: `kode`, `bobot`, `bukti_ids`, `fakta`, `sejak` | `code`, `weight`, `evidenceIds`, `facts`, `since` |
| Klaim: `teks`, `bukti_ids`, `kutipan`; jawaban: `jawaban`, `klaim` | `text`, `evidenceIds`, `quote`; `answer`, `claims` |
| `getRanking({ fokus })` | `getRanking({ focus })` |
| `GET /api/evidence?akun=&sinyal=` | `GET /api/evidence?account=&signal=` (`akun` dan `sinyal` diterima sebagai alias) |
| Penjelasan akun aman, kartu bukti, kartu tindakan, papan peringkat | `explanation`, `source comparison card`, `retention card`, `ranking board` |
| Estimasi | Estimate |

## Yang tetap Indonesia (kosakata graph / dataset / rute)

| Kelompok | Nilai |
| --- | --- |
| Label node | `Akun`, `Kontak`, `Karyawan`, `Organisasi`, `Kompetitor`, `Outlet`, `UsageBulan`, `Tiket`, `Bug`, `Rilis`, `Fitur`, `Deal`, `Kontrak`, `Interaksi`, `Keputusan`, `Anomali`, `Sinyal` |
| Tipe relasi | `BEKERJA_DI`, `PERNAH_BEKERJA_DI`, `CHAMPION_DARI`, `DIPEGANG_OLEH`, `MEMILIKI`, `MEMBUKA_TIKET`, `DISEBABKAN_OLEH`, `TERDAPAT_DI`, `TERKAIT`, `MENCATAT`, `TERLIBAT_DI`, `TENTANG`, `MENYETUJUI`, `DIDASARKAN_PADA`, `MENJANJIKAN`, `MENYEBUT`, `MENJALANKAN_VERSI`, `MENGALAMI`, `BERTEPATAN_DENGAN`, `MEMBALAS`, `KANDIDAT_DISEBABKAN_OLEH`, `PADA`, `BUKTI` |
| Kode sinyal (nilai tersimpan) | `CHAMPION_KELUAR`, `JANJI_DILANGGAR`, `KOMPETITOR_DISEBUT`, `OUTREACH_TAK_BERBALAS`, `RISIKO_PEMBAYARAN`, `TIKET_BUG_TAK_TERTAUT`, `ANOMALI_USAGE_RILIS_BUG`, `TIKET_TAK_DIREPRODUKSI` (UI menampilkan label Inggris, mis. "Champion left") |
| Nama properti di graph | mengikuti kolom dataset: `nama`, `tipe`, `paket`, `nilai_tahunan`, `tanggal`, `mulai`, `selesai`, `status_janji`, ... |
| Nilai dataset | `pelanggan`, `prospek`, `permintaan_fitur`, `Belum ditepati`, `Ditepati (...)`, `Disetujui`, `Ditolak`, `Menunggu`, `Gratis 1 bulan`, `Tempo bayar N hari` |
| Rute dan endpoint dari PRD | `/`, `/akun/[id]`, `/tanya`, `/explore`, `/health`, `/api/evidence` |

Bila kelak seluruh kosakata graph diterjemahkan, itu perubahan skema (ETL, loader, aturan Cypher, data di Aura, dan dokumen) yang harus dikerjakan sekaligus.
