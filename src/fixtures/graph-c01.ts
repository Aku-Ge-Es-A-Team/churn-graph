// Fixture GraphPayload jalur bukti C01 (T00-10), dari Brief §4 dan data/raw.
// Dipakai /accounts/[id] sampai getAccountEvidence() (F-08) tersedia.
// Mengikuti kontrak GraphPayload versi `src/types/graph.ts` (draf Dio, hasil merge 2026-10-09).
// Asumsi fixture (ditinjau di PR):
// - id relasi = `${type}:${source}->${target}` (format belum ditetapkan dokumen).
// - ID kompetitor `KOMP-kasirpro` (dataset tidak memberi ID kompetitor).
// - source_id riwayat kerja = `<contact_id>|<mulai>` (file tidak punya kolom ID baris).
// - Kontrak baru tidak punya `sumber`/`highlight`; penyorotan disimpan terpisah di `graphC01Highlight`.
import type { GraphPayload } from "@/types/graph";

/** Node jalur bukti utama C01 yang disorot di UI (di luar kontrak GraphPayload). */
export const graphC01Highlight = ["C01", "K017", "P01", "D-2025-11", "FEAT-07", "I0331", "KOMP-kasirpro"];

const CRM_ACC = "crm_accounts.csv";
const CONTACTS = "crm_contacts.csv";
const EMP_HIST = "contact_employment_history.csv";
const INTER = "interactions.json";
const DECISION = "decision_log.csv";
const TICKETS = "support_tickets.csv";

export const graphC01Fixture = {
  nodes: [
    { id: "C01", label: "Akun", props: { nama: "Kopi Lintas Nusantara", health_score_dashboard: "Hijau", paket: "Enterprise" }, source_file: CRM_ACC, source_id: "C01" },
    { id: "P01", label: "Akun", props: { nama: "Grup Ritel Mandala", tipe: "prospek" }, source_file: CRM_ACC, source_id: "P01" },
    { id: "DL-001", label: "Deal", props: { stage: "Proposal", outlet: 60, nilai_tahunan: 252_000_000 }, source_file: "crm_deals.csv", source_id: "DL-001" },
    { id: "K017", label: "Kontak", props: { nama: "Rina Hapsari", jabatan_saat_ini: "GM Operations" }, source_file: CONTACTS, source_id: "K017" },
    { id: "K134", label: "Kontak", props: { nama: "Yoga Pratama", jabatan_saat_ini: "CFO" }, source_file: CONTACTS, source_id: "K134" },
    { id: "K050", label: "Kontak", props: { nama: "Fikri Ramadhan", jabatan_saat_ini: "IT Supervisor" }, source_file: CONTACTS, source_id: "K050" },
    { id: "E01", label: "Karyawan", props: { nama: "Andi Wiratama", jabatan: "VP Sales" }, source_file: "employees.csv", source_id: "E01" },
    { id: "E03", label: "Karyawan", props: { nama: "Sari Puspita", jabatan: "Account Manager" }, source_file: "employees.csv", source_id: "E03" },
    { id: "E09", label: "Karyawan", props: { nama: "Arif Setiawan", jabatan: "Head of Product" }, source_file: "employees.csv", source_id: "E09" },
    { id: "K-C01", label: "Kontrak", props: { tanggal_renewal: "2026-12-15", diskon_pct: 15, nilai_tahunan: 149_940_000 }, source_file: "contracts_billing.csv", source_id: "K-C01" },
    { id: "D-2025-11", label: "Keputusan", props: { tanggal: "2025-11-28", tipe: "diskon", nilai: 15, keputusan: "Disetujui" }, source_file: DECISION, source_id: "D-2025-11" },
    { id: "FEAT-07", label: "Fitur", props: { nama: "Integrasi akuntansi (Jurnal & Accurate)", target_awal: "2026-Q3", target_terkini: "Belum ditetapkan" }, source_file: "features.csv", source_id: "FEAT-07" },
    { id: "KOMP-kasirpro", label: "Kompetitor", props: { nama: "KasirPro" }, source_file: "crm_deals.csv", source_id: "DL-002" },
    { id: "I0061", label: "Interaksi", props: { tanggal: "2025-11-28", subjek: "Re: Approval diskon 15% Kopi Lintas", template: false }, source_file: INTER, source_id: "I0061" },
    { id: "I0224", label: "Interaksi", props: { tanggal: "2026-06-17", subjek: "Re: Jadwal integrasi akuntansi", template: false }, source_file: INTER, source_id: "I0224" },
    { id: "I0258", label: "Interaksi", props: { tanggal: "2026-07-20", subjek: "Update roadmap Q3", template: false }, source_file: INTER, source_id: "I0258" },
    { id: "I0290", label: "Interaksi", props: { tanggal: "2026-08-14", subjek: "Pamit", template: false }, source_file: INTER, source_id: "I0290" },
    { id: "I0331", label: "Interaksi", props: { tanggal: "2026-09-18", subjek: "Meeting perkenalan dengan CFO baru", template: false }, source_file: INTER, source_id: "I0331" },
    { id: "T0382", label: "Tiket", props: { judul: "Ekspor jurnal ke Accurate gagal", prioritas: "Tinggi", status: "Terbuka" }, source_file: TICKETS, source_id: "T0382" },
    { id: "T0407", label: "Tiket", props: { judul: "Mapping akun COA untuk integrasi", prioritas: "Tinggi", status: "Terbuka" }, source_file: TICKETS, source_id: "T0407" },
    { id: "T0537", label: "Tiket", props: { judul: "Rekonsiliasi manual 42 outlet memakan 3 hari", prioritas: "Kritis", status: "Terbuka" }, source_file: TICKETS, source_id: "T0537" },
  ],
  edges: [
    { id: "CHAMPION_DARI:K017->C01", source: "K017", target: "C01", type: "CHAMPION_DARI", derived: false, props: { klaim: "crm" }, source_file: CRM_ACC, source_id: "C01" },
    { id: "PERNAH_BEKERJA_DI:K017->C01", source: "K017", target: "C01", type: "PERNAH_BEKERJA_DI", derived: false, props: { mulai: "2021-03-01", selesai: "2026-08-15", jabatan: "Head of Operations" }, source_file: EMP_HIST, source_id: "K017|2021-03-01" },
    { id: "BEKERJA_DI:K017->P01", source: "K017", target: "P01", type: "BEKERJA_DI", derived: false, props: { mulai: "2026-09-01", jabatan: "GM Operations" }, source_file: EMP_HIST, source_id: "K017|2026-09-01" },
    { id: "MEMILIKI:P01->DL-001", source: "P01", target: "DL-001", type: "MEMILIKI", derived: false, props: {}, source_file: "crm_deals.csv", source_id: "DL-001" },
    { id: "TERLIBAT_DI:K017->I0290", source: "K017", target: "I0290", type: "TERLIBAT_DI", derived: false, props: { peran: "pengirim" }, source_file: INTER, source_id: "I0290" },
    { id: "TENTANG:I0290->C01", source: "I0290", target: "C01", type: "TENTANG", derived: false, props: {}, source_file: INTER, source_id: "I0290" },
    { id: "BEKERJA_DI:K134->C01", source: "K134", target: "C01", type: "BEKERJA_DI", derived: false, props: { mulai: "2026-07-01", jabatan: "CFO" }, source_file: EMP_HIST, source_id: "K134|2026-07-01" },
    { id: "TERLIBAT_DI:K134->I0331", source: "K134", target: "I0331", type: "TERLIBAT_DI", derived: false, props: { peran: "peserta" }, source_file: INTER, source_id: "I0331" },
    { id: "TENTANG:I0331->C01", source: "I0331", target: "C01", type: "TENTANG", derived: false, props: {}, source_file: INTER, source_id: "I0331" },
    { id: "MENYEBUT:I0331->KOMP-kasirpro", source: "I0331", target: "KOMP-kasirpro", type: "MENYEBUT", derived: true, props: {}, rule: "kamus_kompetitor", source_file: INTER, source_id: "I0331" },
    { id: "MEMILIKI:C01->K-C01", source: "C01", target: "K-C01", type: "MEMILIKI", derived: false, props: {}, source_file: "contracts_billing.csv", source_id: "K-C01" },
    { id: "DIDASARKAN_PADA:K-C01->D-2025-11", source: "K-C01", target: "D-2025-11", type: "DIDASARKAN_PADA", derived: false, props: {}, source_file: "contracts_billing.csv", source_id: "K-C01" },
    { id: "MENYETUJUI:E01->D-2025-11", source: "E01", target: "D-2025-11", type: "MENYETUJUI", derived: false, props: {}, source_file: DECISION, source_id: "D-2025-11" },
    { id: "DIDASARKAN_PADA:D-2025-11->I0061", source: "D-2025-11", target: "I0061", type: "DIDASARKAN_PADA", derived: false, props: {}, source_file: DECISION, source_id: "D-2025-11" },
    { id: "MENJANJIKAN:D-2025-11->FEAT-07", source: "D-2025-11", target: "FEAT-07", type: "MENJANJIKAN", derived: false, props: { status_janji: "Belum ditepati" }, source_file: DECISION, source_id: "D-2025-11" },
    { id: "TERLIBAT_DI:E03->I0224", source: "E03", target: "I0224", type: "TERLIBAT_DI", derived: false, props: { peran: "pengirim" }, source_file: INTER, source_id: "I0224" },
    { id: "TERLIBAT_DI:K017->I0224", source: "K017", target: "I0224", type: "TERLIBAT_DI", derived: false, props: { peran: "penerima" }, source_file: INTER, source_id: "I0224" },
    { id: "TENTANG:I0224->C01", source: "I0224", target: "C01", type: "TENTANG", derived: false, props: {}, source_file: INTER, source_id: "I0224" },
    { id: "TERLIBAT_DI:E09->I0258", source: "E09", target: "I0258", type: "TERLIBAT_DI", derived: false, props: { peran: "pengirim" }, source_file: INTER, source_id: "I0258" },
    { id: "TERLIBAT_DI:E01->I0258", source: "E01", target: "I0258", type: "TERLIBAT_DI", derived: false, props: { peran: "penerima" }, source_file: INTER, source_id: "I0258" },
    { id: "MEMBUKA_TIKET:K050->T0382", source: "K050", target: "T0382", type: "MEMBUKA_TIKET", derived: false, props: {}, source_file: TICKETS, source_id: "T0382" },
    { id: "MEMBUKA_TIKET:K050->T0407", source: "K050", target: "T0407", type: "MEMBUKA_TIKET", derived: false, props: {}, source_file: TICKETS, source_id: "T0407" },
    { id: "MEMBUKA_TIKET:K050->T0537", source: "K050", target: "T0537", type: "MEMBUKA_TIKET", derived: false, props: {}, source_file: TICKETS, source_id: "T0537" },
  ],
  meta: { akun: "C01", jumlahNode: 21, jumlahRelasi: 23 },
} satisfies GraphPayload;
