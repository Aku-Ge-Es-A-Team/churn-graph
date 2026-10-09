import { Suspense } from "react";
import { connection } from "next/server";
import type { Metadata } from "next";
import { Neo4jConfigError, readCypher } from "@/server/neo4j";

export const metadata: Metadata = { title: "Health" };

type Status = { ok: true } | { ok: false; pesan: string };

async function cekNeo4j(): Promise<Status> {
  try {
    const rows = await readCypher<{ ok: number }>("RETURN 1 AS ok");
    return rows[0]?.ok === 1 ? { ok: true } : { ok: false, pesan: "Jawaban RETURN 1 tidak sesuai" };
  } catch (error) {
    console.error("[health] Neo4j gagal:", error);
    if (error instanceof Neo4jConfigError) return { ok: false, pesan: error.message };
    // Hanya kode error yang ditampilkan; detail lengkap ada di log server.
    const code = (error as { code?: unknown })?.code;
    return { ok: false, pesan: `Tidak bisa menjalankan RETURN 1 ke Neo4j${typeof code === "string" ? ` (${code})` : ""}` };
  }
}

async function HealthStatus() {
  await connection(); // selalu dicek per request, tidak masuk static shell / cache
  const status = await cekNeo4j();
  return status.ok ? (
    <p role="status" className="text-lg font-semibold text-primary">
      OK — Neo4j menjawab RETURN 1
    </p>
  ) : (
    <div role="alert" className="rounded-lg bg-destructive/10 p-4 text-destructive">
      <p className="font-semibold">ERROR</p>
      <p className="text-sm">{status.pesan}</p>
    </div>
  );
}

export default function HealthPage() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-4 p-8">
      <h1 className="text-2xl font-semibold">Health check</h1>
      <Suspense fallback={<p className="text-muted-foreground">Memeriksa koneksi Neo4j…</p>}>
        <HealthStatus />
      </Suspense>
    </main>
  );
}
