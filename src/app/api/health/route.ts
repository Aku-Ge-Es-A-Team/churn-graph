import { connection } from "next/server";
import { readCypher } from "@/server/neo4j";

// With cacheComponents, `runtime`/`dynamic` must not be exported (the default runtime is already nodejs);
// connection() is what makes this route dynamic per request.

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
    // Details go to the server log only, never to the client.
    console.error("[health] Neo4j check failed:", err instanceof Error ? err.message : err);
    return Response.json({ status: "error", neo4j: false }, { status: 503 });
  }
}
