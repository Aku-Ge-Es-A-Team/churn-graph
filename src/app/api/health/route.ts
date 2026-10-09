import { connection } from "next/server";
import { readCypher } from "@/server/neo4j";

// Dengan cacheComponents, `runtime`/`dynamic` tidak boleh diekspor (runtime default sudah nodejs);
// connection() yang membuat route ini dinamis per request.

export async function GET() {
  await connection();
  const start = performance.now();
  try {
    await readCypher("RETURN 1 AS ok");
    return Response.json({
      status: "ok",
      neo4j: true,
      latencyMs: Math.round(performance.now() - start),
    });
  } catch (err) {
    // Detail hanya ke log server, tidak ke klien.
    console.error("[health] cek Neo4j gagal:", err instanceof Error ? err.message : err);
    return Response.json({ status: "error", neo4j: false }, { status: 503 });
  }
}
