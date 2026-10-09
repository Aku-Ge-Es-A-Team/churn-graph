// Fixture GraphPayload jalur bukti C01 (T00-10), dari Brief §4 dan data/raw.
// Dipakai /akun/[id] sampai getAccountEvidence() (F-08) tersedia.
// Asumsi fixture (ditinjau di PR):
// - key node = id; key relasi = `${type}:${from}->${to}` (format belum ditetapkan dokumen).
// - ID kompetitor `KOMP-kasirpro` (dataset tidak memberi ID kompetitor).
// - source_id riwayat kerja = `<contact_id>|<mulai>` (file tidak punya kolom ID baris).
// - sumber untuk Fitur = "tiket" (data produk; union Sumber tidak punya nilai khusus produk).
import type { GraphPayload } from "@/types/graph";

const CRM_ACC = "crm_accounts.csv";
const CONTACTS = "crm_contacts.csv";
const EMP_HIST = "contact_employment_history.csv";
const INTER = "interactions.json";
const DECISION = "decision_log.csv";
const TICKETS = "support_tickets.csv";

export const graphC01Fixture = {
  nodes: [
    { key: "C01", id: "C01", label: "Akun", sumber: "crm", props: { nama: "Kopi Lintas Nusantara", health_score_dashboard: "Hijau", paket: "Enterprise", source_file: CRM_ACC, source_id: "C01" } },
    { key: "P01", id: "P01", label: "Akun", sumber: "crm", props: { nama: "Grup Ritel Mandala", tipe: "prospek", source_file: CRM_ACC, source_id: "P01" } },
    { key: "DL-001", id: "DL-001", label: "Deal", sumber: "crm", props: { stage: "Proposal", outlet: 60, nilai_tahunan: 252_000_000, source_file: "crm_deals.csv", source_id: "DL-001" } },
    { key: "K017", id: "K017", label: "Kontak", sumber: "crm", props: { nama: "Rina Hapsari", jabatan_saat_ini: "GM Operations", source_file: CONTACTS, source_id: "K017" } },
    { key: "K134", id: "K134", label: "Kontak", sumber: "crm", props: { nama: "Yoga Pratama", jabatan_saat_ini: "CFO", source_file: CONTACTS, source_id: "K134" } },
    { key: "K050", id: "K050", label: "Kontak", sumber: "crm", props: { nama: "Fikri Ramadhan", jabatan_saat_ini: "IT Supervisor", source_file: CONTACTS, source_id: "K050" } },
    { key: "E01", id: "E01", label: "Karyawan", sumber: "crm", props: { nama: "Andi Wiratama", jabatan: "VP Sales", source_file: "employees.csv", source_id: "E01" } },
    { key: "E03", id: "E03", label: "Karyawan", sumber: "crm", props: { nama: "Sari Puspita", jabatan: "Account Manager", source_file: "employees.csv", source_id: "E03" } },
    { key: "E09", id: "E09", label: "Karyawan", sumber: "crm", props: { nama: "Arif Setiawan", jabatan: "Head of Product", source_file: "employees.csv", source_id: "E09" } },
    { key: "K-C01", id: "K-C01", label: "Kontrak", sumber: "kontrak", props: { tanggal_renewal: "2026-12-15", diskon_pct: 15, nilai_tahunan: 149_940_000, source_file: "contracts_billing.csv", source_id: "K-C01" } },
    { key: "D-2025-11", id: "D-2025-11", label: "Keputusan", sumber: "keputusan", props: { tanggal: "2025-11-28", tipe: "diskon", nilai: 15, keputusan: "Disetujui", source_file: DECISION, source_id: "D-2025-11" } },
    { key: "FEAT-07", id: "FEAT-07", label: "Fitur", sumber: "tiket", props: { nama: "Integrasi akuntansi (Jurnal & Accurate)", target_awal: "2026-Q3", target_terkini: "Belum ditetapkan", source_file: "features.csv", source_id: "FEAT-07" } },
    { key: "KOMP-kasirpro", id: "KOMP-kasirpro", label: "Kompetitor", sumber: "crm", props: { nama: "KasirPro", source_file: "crm_deals.csv", source_id: "DL-002" } },
    { key: "I0061", id: "I0061", label: "Interaksi", sumber: "interaksi", props: { tanggal: "2025-11-28", subjek: "Re: Approval diskon 15% Kopi Lintas", template: false, source_file: INTER, source_id: "I0061" } },
    { key: "I0224", id: "I0224", label: "Interaksi", sumber: "interaksi", props: { tanggal: "2026-06-17", subjek: "Re: Jadwal integrasi akuntansi", template: false, source_file: INTER, source_id: "I0224" } },
    { key: "I0258", id: "I0258", label: "Interaksi", sumber: "interaksi", props: { tanggal: "2026-07-20", subjek: "Update roadmap Q3", template: false, source_file: INTER, source_id: "I0258" } },
    { key: "I0290", id: "I0290", label: "Interaksi", sumber: "interaksi", props: { tanggal: "2026-08-14", subjek: "Pamit", template: false, source_file: INTER, source_id: "I0290" } },
    { key: "I0331", id: "I0331", label: "Interaksi", sumber: "interaksi", props: { tanggal: "2026-09-18", subjek: "Meeting perkenalan dengan CFO baru", template: false, source_file: INTER, source_id: "I0331" } },
    { key: "T0382", id: "T0382", label: "Tiket", sumber: "tiket", props: { judul: "Ekspor jurnal ke Accurate gagal", prioritas: "Tinggi", status: "Terbuka", source_file: TICKETS, source_id: "T0382" } },
    { key: "T0407", id: "T0407", label: "Tiket", sumber: "tiket", props: { judul: "Mapping akun COA untuk integrasi", prioritas: "Tinggi", status: "Terbuka", source_file: TICKETS, source_id: "T0407" } },
    { key: "T0537", id: "T0537", label: "Tiket", sumber: "tiket", props: { judul: "Rekonsiliasi manual 42 outlet memakan 3 hari", prioritas: "Kritis", status: "Terbuka", source_file: TICKETS, source_id: "T0537" } },
  ],
  edges: [
    { key: "CHAMPION_DARI:K017->C01", type: "CHAMPION_DARI", from: "K017", to: "C01", derived: false, props: { klaim: "crm", source_file: CRM_ACC, source_id: "C01" } },
    { key: "PERNAH_BEKERJA_DI:K017->C01", type: "PERNAH_BEKERJA_DI", from: "K017", to: "C01", derived: false, props: { mulai: "2021-03-01", selesai: "2026-08-15", jabatan: "Head of Operations", source_file: EMP_HIST, source_id: "K017|2021-03-01" } },
    { key: "BEKERJA_DI:K017->P01", type: "BEKERJA_DI", from: "K017", to: "P01", derived: false, props: { mulai: "2026-09-01", jabatan: "GM Operations", source_file: EMP_HIST, source_id: "K017|2026-09-01" } },
    { key: "MEMILIKI:P01->DL-001", type: "MEMILIKI", from: "P01", to: "DL-001", derived: false, props: { source_file: "crm_deals.csv", source_id: "DL-001" } },
    { key: "TERLIBAT_DI:K017->I0290", type: "TERLIBAT_DI", from: "K017", to: "I0290", derived: false, props: { peran: "pengirim", source_file: INTER, source_id: "I0290" } },
    { key: "TENTANG:I0290->C01", type: "TENTANG", from: "I0290", to: "C01", derived: false, props: { source_file: INTER, source_id: "I0290" } },
    { key: "BEKERJA_DI:K134->C01", type: "BEKERJA_DI", from: "K134", to: "C01", derived: false, props: { mulai: "2026-07-01", jabatan: "CFO", source_file: EMP_HIST, source_id: "K134|2026-07-01" } },
    { key: "TERLIBAT_DI:K134->I0331", type: "TERLIBAT_DI", from: "K134", to: "I0331", derived: false, props: { peran: "peserta", source_file: INTER, source_id: "I0331" } },
    { key: "TENTANG:I0331->C01", type: "TENTANG", from: "I0331", to: "C01", derived: false, props: { source_file: INTER, source_id: "I0331" } },
    { key: "MENYEBUT:I0331->KOMP-kasirpro", type: "MENYEBUT", from: "I0331", to: "KOMP-kasirpro", derived: true, props: { rule: "kamus_kompetitor", source_file: INTER, source_id: "I0331" } },
    { key: "MEMILIKI:C01->K-C01", type: "MEMILIKI", from: "C01", to: "K-C01", derived: false, props: { source_file: "contracts_billing.csv", source_id: "K-C01" } },
    { key: "DIDASARKAN_PADA:K-C01->D-2025-11", type: "DIDASARKAN_PADA", from: "K-C01", to: "D-2025-11", derived: false, props: { source_file: "contracts_billing.csv", source_id: "K-C01" } },
    { key: "MENYETUJUI:E01->D-2025-11", type: "MENYETUJUI", from: "E01", to: "D-2025-11", derived: false, props: { source_file: DECISION, source_id: "D-2025-11" } },
    { key: "DIDASARKAN_PADA:D-2025-11->I0061", type: "DIDASARKAN_PADA", from: "D-2025-11", to: "I0061", derived: false, props: { source_file: DECISION, source_id: "D-2025-11" } },
    { key: "MENJANJIKAN:D-2025-11->FEAT-07", type: "MENJANJIKAN", from: "D-2025-11", to: "FEAT-07", derived: false, props: { status_janji: "Belum ditepati", source_file: DECISION, source_id: "D-2025-11" } },
    { key: "TERLIBAT_DI:E03->I0224", type: "TERLIBAT_DI", from: "E03", to: "I0224", derived: false, props: { peran: "pengirim", source_file: INTER, source_id: "I0224" } },
    { key: "TERLIBAT_DI:K017->I0224", type: "TERLIBAT_DI", from: "K017", to: "I0224", derived: false, props: { peran: "penerima", source_file: INTER, source_id: "I0224" } },
    { key: "TENTANG:I0224->C01", type: "TENTANG", from: "I0224", to: "C01", derived: false, props: { source_file: INTER, source_id: "I0224" } },
    { key: "TERLIBAT_DI:E09->I0258", type: "TERLIBAT_DI", from: "E09", to: "I0258", derived: false, props: { peran: "pengirim", source_file: INTER, source_id: "I0258" } },
    { key: "TERLIBAT_DI:E01->I0258", type: "TERLIBAT_DI", from: "E01", to: "I0258", derived: false, props: { peran: "penerima", source_file: INTER, source_id: "I0258" } },
    { key: "MEMBUKA_TIKET:K050->T0382", type: "MEMBUKA_TIKET", from: "K050", to: "T0382", derived: false, props: { source_file: TICKETS, source_id: "T0382" } },
    { key: "MEMBUKA_TIKET:K050->T0407", type: "MEMBUKA_TIKET", from: "K050", to: "T0407", derived: false, props: { source_file: TICKETS, source_id: "T0407" } },
    { key: "MEMBUKA_TIKET:K050->T0537", type: "MEMBUKA_TIKET", from: "K050", to: "T0537", derived: false, props: { source_file: TICKETS, source_id: "T0537" } },
  ],
  highlight: ["C01", "K017", "P01", "D-2025-11", "FEAT-07", "I0331", "KOMP-kasirpro"],
} satisfies GraphPayload;
