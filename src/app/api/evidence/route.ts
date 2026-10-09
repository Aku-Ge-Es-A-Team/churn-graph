import { connection } from "next/server";
import { getAccountEvidence } from "@/server/queries";

// GET /api/evidence?account=C01[&signal=CHAMPION_KELUAR]
// The parameter names `akun` / `sinyal` from PRD F-08 are accepted as aliases.
// Responses: 200 GraphPayload · 400 invalid or missing parameter · 404 unknown account/signal · 503 graph unavailable.
const ID_PATTERN = /^[A-Za-z0-9_-]{1,40}$/;

const error = (status: number, code: string, message: string) => Response.json({ error: code, message }, { status });

export async function GET(request: Request) {
  await connection();
  const params = new URL(request.url).searchParams;
  const account = (params.get("account") ?? params.get("akun") ?? "").trim();
  const signal = (params.get("signal") ?? params.get("sinyal") ?? "").trim();

  if (!account) return error(400, "missing_parameter", "The `account` query parameter is required.");
  if (!ID_PATTERN.test(account)) return error(400, "invalid_parameter", "`account` must be an account ID such as C01.");
  if (signal && !ID_PATTERN.test(signal)) return error(400, "invalid_parameter", "`signal` must be a signal code.");

  try {
    const result = await getAccountEvidence(account, signal || undefined);
    if (result.status === "account_not_found") return error(404, "account_not_found", `Account ${account} does not exist.`);
    if (result.status === "signal_not_found") return error(404, "signal_not_found", `Account ${account} has no signal ${signal}.`);
    return Response.json(result.payload);
  } catch (e) {
    // Details go to the server log only; the response never exposes connection information.
    console.error("[api/evidence] graph query failed:", e instanceof Error ? e.message : e);
    return error(503, "graph_unavailable", "The graph database could not be reached.");
  }
}
