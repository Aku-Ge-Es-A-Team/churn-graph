import { Suspense } from "react";
import { connection } from "next/server";
import type { Metadata } from "next";
import { Neo4jConfigError, readCypher } from "@/server/neo4j";

export const metadata: Metadata = { title: "Health" };

type Status = { ok: true } | { ok: false; message: string };

async function checkNeo4j(): Promise<Status> {
  try {
    const rows = await readCypher<{ ok: number }>("RETURN 1 AS ok");
    return rows[0]?.ok === 1 ? { ok: true } : { ok: false, message: "Unexpected answer to RETURN 1" };
  } catch (error) {
    console.error("[health] Neo4j check failed:", error);
    if (error instanceof Neo4jConfigError) return { ok: false, message: error.message };
    // Only the error code is shown; the full detail stays in the server log.
    const code = (error as { code?: unknown })?.code;
    return { ok: false, message: `Could not run RETURN 1 against Neo4j${typeof code === "string" ? ` (${code})` : ""}` };
  }
}

async function HealthStatus() {
  await connection(); // always checked per request, never part of the static shell or a cache
  const status = await checkNeo4j();
  return status.ok ? (
    <p role="status" className="text-lg font-semibold text-primary">
      OK — Neo4j answered RETURN 1
    </p>
  ) : (
    <div role="alert" className="rounded-lg bg-destructive/10 p-4 text-destructive">
      <p className="font-semibold">ERROR</p>
      <p className="text-sm">{status.message}</p>
    </div>
  );
}

export default function HealthPage() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-4 p-8">
      <h1 className="text-2xl font-semibold">Health check</h1>
      <Suspense fallback={<p className="text-muted-foreground">Checking the Neo4j connection…</p>}>
        <HealthStatus />
      </Suspense>
    </main>
  );
}
