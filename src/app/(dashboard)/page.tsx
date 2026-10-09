import Link from "next/link";
import { riskRowsFixture } from "@/fixtures/risk-rows";

// Skeleton "/" (T00-11): sumber data sementara = fixture; diganti getRanking() di F-05/F-11.
const rupiah = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });

export default function Home() {
  const rows = riskRowsFixture;

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-4 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Peringkat risiko churn</h1>
        <p className="text-sm text-muted-foreground">Data fixture (sementara) · snapshot 2026-10-01 · nilai berisiko = Estimasi</p>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-lg border p-6 text-center text-muted-foreground">Belum ada akun untuk ditampilkan.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <caption className="sr-only">Akun pelanggan diurutkan menurut risiko churn</caption>
            <thead className="bg-muted text-left text-muted-foreground">
              <tr>
                <th scope="col" className="p-3">Akun</th>
                <th scope="col" className="p-3">Level</th>
                <th scope="col" className="p-3">Dashboard</th>
                <th scope="col" className="p-3 text-right">Skor</th>
                <th scope="col" className="p-3 text-right">Renewal</th>
                <th scope="col" className="p-3 text-right">Nilai berisiko (Estimasi)</th>
                <th scope="col" className="p-3">Sinyal</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.akun} className="border-t">
                  <th scope="row" className="p-3 text-left font-medium">
                    <Link href={`/akun/${row.akun}`} className="underline-offset-4 hover:underline">
                      {row.akun} · {row.nama}
                    </Link>
                  </th>
                  <td className="p-3">{row.level}</td>
                  <td className="p-3">
                    {row.dashboard}
                    {row.divergen ? <span className="ml-1 text-xs font-medium text-destructive">divergen</span> : null}
                  </td>
                  <td className="p-3 text-right tabular-nums">{row.skor}</td>
                  <td className="p-3 text-right tabular-nums">
                    {row.renewalHari === null ? "—" : `H-${row.renewalHari}`}
                  </td>
                  <td className="p-3 text-right tabular-nums">{rupiah.format(row.rupiahBerisiko)}</td>
                  <td className="p-3 text-muted-foreground">
                    {row.sinyalTeratas.length > 0 ? row.sinyalTeratas.map((s) => s.kode).join(", ") : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
