// Zod schema per file (T01-02). All CSV columns are read as strings (dynamicTyping: false),
// then converted here: version "4.10" stays a string, an empty cell → null (not 0).
// The schema keys mirror the dataset's CSV headers and therefore stay as they are in the source files.
import { z } from "zod";
import { isIsoDate, parseDecisionValue, parseLimit, parseYesNo } from "./clean";

const req = z.string().trim().min(1, "required");
const opt = z.string().trim().transform((v) => (v === "" ? null : v));
const date = z.string().trim().refine(isIsoDate, "not a YYYY-MM-DD date");
const dateOpt = z
  .string()
  .trim()
  .refine((v) => v === "" || isIsoDate(v), "not a YYYY-MM-DD date")
  .transform((v) => (v === "" ? null : v));
const int = z.string().trim().regex(/^-?\d+$/, "not an integer").transform(Number);
const intOpt = z
  .string()
  .trim()
  .refine((v) => v === "" || /^-?\d+$/.test(v), "not an integer")
  .transform((v) => (v === "" ? null : Number(v)));

export type Definition<S extends z.ZodType> = { file: string; columns: string[]; schema: S };
function define<S extends z.ZodType>(file: string, columns: string[], schema: S): Definition<S> {
  return { file, columns, schema };
}
function object<T extends z.ZodRawShape>(file: string, shape: T) {
  return define(file, Object.keys(shape), z.object(shape));
}

export const ACCOUNT = object("crm_accounts.csv", {
  account_id: req,
  nama: req,
  tipe: z.enum(["pelanggan", "prospek"]),
  industri: opt,
  kota: opt,
  paket: opt,
  jumlah_outlet: int,
  account_owner_id: req,
  champion_contact_id: opt,
  nps_terakhir: intOpt,
  health_score_dashboard: opt,
});

export const CONTACT = object("crm_contacts.csv", {
  contact_id: req,
  nama: req,
  email: opt,
  account_id_saat_ini: opt,
  jabatan_saat_ini: opt,
});

export const EMPLOYMENT_HISTORY = object("contact_employment_history.csv", {
  contact_id: req,
  account_id: opt,
  organisasi: req,
  jabatan: opt,
  mulai: date,
  selesai: dateOpt,
});

export const EMPLOYEE = object("employees.csv", {
  employee_id: req,
  nama: req,
  jabatan: req,
  email: req,
});

export const DEAL = object("crm_deals.csv", {
  deal_id: req,
  account_id: req,
  tipe: req,
  stage: req,
  stage_sejak: date,
  dibuat: date,
  owner_id: req,
  outlet: int,
  nilai_tahunan: int,
  status: req,
  alasan_kalah: opt,
  kompetitor: opt,
});

export const OUTLET = define(
  "outlets.csv",
  ["outlet_id", "account_id", "kota", "mode_offline_aktif"],
  z
    .object({
      outlet_id: req,
      account_id: req,
      kota: opt,
      mode_offline_aktif: z.string().trim().refine((v) => parseYesNo(v) !== null, "must be 'ya' or 'tidak'"),
    })
    .transform((r) => ({ outlet_id: r.outlet_id, account_id: r.account_id, kota: r.kota, mode_offline: parseYesNo(r.mode_offline_aktif) === true })),
);

export const USAGE = object("product_usage_daily.csv", {
  tanggal: date,
  outlet_id: req,
  account_id: req,
  versi_aplikasi: req, // string: "4.10" ≠ 4.1
  jumlah_transaksi: int,
  transaksi_offline_tersinkron: intOpt, // empty = outlet does not use offline mode → null, not 0
});

export const TICKET = object("support_tickets.csv", {
  ticket_id: req,
  dibuat: date,
  account_id: req,
  outlet_id: opt,
  pelapor_contact_id: opt,
  kategori: req,
  prioritas: req,
  status: req,
  versi_aplikasi: opt,
  judul: req,
  deskripsi: opt,
  bug_id: opt,
  diselesaikan: dateOpt,
});

export const BUG = object("bugs.csv", {
  bug_id: req,
  judul: req,
  versi_terdampak: req,
  status: req,
  dibuat: date,
  selesai: dateOpt,
  fitur_terkait: opt,
});

export const RELEASE = object("releases.csv", {
  versi: req,
  tanggal_rilis: date,
});

export const FEATURE = object("features.csv", {
  feature_id: req,
  nama: req,
  status: req,
  target_awal: opt,
  target_terkini: opt,
  catatan: opt,
});

export const CONTRACT = define(
  "contracts_billing.csv",
  ["contract_id", "account_id", "paket", "outlet_kontrak", "batas_outlet_paket", "mulai", "tanggal_renewal", "harga_per_outlet_bulan", "diskon_pct", "nilai_tahunan", "keterlambatan_bayar_12bln", "decision_id"],
  z
    .object({
      contract_id: req,
      account_id: req,
      paket: req,
      outlet_kontrak: int,
      batas_outlet_paket: z.string().trim().refine((v) => parseLimit(v) !== null, "must be a number or 'tanpa batas'"),
      mulai: date,
      tanggal_renewal: date,
      harga_per_outlet_bulan: int,
      diskon_pct: int,
      nilai_tahunan: int,
      keterlambatan_bayar_12bln: int,
      decision_id: opt,
    })
    .transform((r) => {
      const limit = parseLimit(r.batas_outlet_paket)!;
      return { ...r, batas_outlet_paket: limit.limit, tanpa_batas: limit.unlimited };
    }),
);

export const DECISION = define(
  "decision_log.csv",
  ["decision_id", "tanggal", "tipe", "account_id", "deal_id", "diminta_oleh", "diputuskan_oleh", "keputusan", "nilai", "alasan", "bukti_interaction_id", "fitur_dijanjikan", "status_janji"],
  z
    .object({
      decision_id: req,
      tanggal: date,
      tipe: req,
      account_id: opt,
      deal_id: opt,
      diminta_oleh: opt,
      diputuskan_oleh: req,
      keputusan: req,
      nilai: z.string().trim(),
      alasan: opt,
      bukti_interaction_id: opt,
      fitur_dijanjikan: opt,
      status_janji: opt,
    })
    .transform((r, ctx) => {
      const parsed = parseDecisionValue(r.tipe, r.nilai);
      if (!parsed) {
        ctx.issues.push({ code: "custom", message: `value '${r.nilai}' is not a percentage for type ${r.tipe}`, input: r.nilai });
        return z.NEVER;
      }
      const { nilai, ...rest } = r;
      void nilai; // the raw value is replaced by nilai_teks/nilai_persen
      return { ...rest, ...parsed };
    }),
);

export const INTERACTION = object("interactions.jsonl", {
  interaction_id: req,
  tanggal: date,
  tipe: z.enum(["email", "email_internal", "catatan_meeting"]),
  account_id: opt,
  dari: opt,
  ke: opt,
  peserta: z.string().trim().transform((v) => v.split(";").map((x) => x.trim()).filter((x) => x !== "")),
  subjek: opt,
  isi: z.string().trim(),
  membalas_id: opt,
});

export type Row<T extends Definition<z.ZodType>> = z.output<T["schema"]>;
