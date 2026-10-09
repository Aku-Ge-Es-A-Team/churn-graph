// GET /api/evidence: parameter validation and status codes (F-08 T07-03). The graph access is mocked.
import { beforeEach, describe, expect, mock, spyOn, test } from "bun:test";

type Result = { status: "ok"; payload: unknown } | { status: "account_not_found" } | { status: "signal_not_found" };
let next: () => Promise<Result>;
const calls: [string, string | undefined][] = [];

mock.module("next/server", () => ({ connection: async () => {} }));
mock.module("../../../src/server/queries", () => ({
  getAccountEvidence: async (account: string, code?: string) => {
    calls.push([account, code]);
    return next();
  },
}));

const { GET } = await import("../../../src/app/api/evidence/route");

const get = (query: string) => GET(new Request(`http://localhost/api/evidence${query}`));

beforeEach(() => {
  calls.length = 0;
  next = async () => ({ status: "ok", payload: { nodes: [], edges: [], highlight: [], meta: { account: "C01", nodeCount: 0, edgeCount: 0 } } });
});

describe("GET /api/evidence", () => {
  test("200 with the GraphPayload", async () => {
    const res = await get("?account=C01");
    expect(res.status).toBe(200);
    expect((await res.json()).meta.account).toBe("C01");
    expect(calls).toEqual([["C01", undefined]]);
  });

  test("passes the signal code through", async () => {
    await get("?account=C01&signal=CHAMPION_KELUAR");
    expect(calls).toEqual([["C01", "CHAMPION_KELUAR"]]);
  });

  test("the Indonesian parameter names from the PRD (akun, sinyal) are accepted as aliases", async () => {
    expect((await get("?akun=C01&sinyal=JANJI_DILANGGAR")).status).toBe(200);
    expect(calls).toEqual([["C01", "JANJI_DILANGGAR"]]);
  });

  test("400 when the account is missing or empty", async () => {
    for (const q of ["", "?account=", "?account=%20%20"]) {
      const res = await get(q);
      expect(res.status).toBe(400);
      expect((await res.json()).error).toBe("missing_parameter");
    }
    expect(calls).toEqual([]);
  });

  test("400 for malformed identifiers (injection attempts never reach the query layer)", async () => {
    for (const q of ["?account=C01'%20OR%201=1", "?account=C01&signal=A;B", "?account=" + "x".repeat(60)]) {
      const res = await get(q);
      expect(res.status).toBe(400);
      expect((await res.json()).error).toBe("invalid_parameter");
    }
    expect(calls).toEqual([]);
  });

  test("404 for an unknown account and for an unknown signal", async () => {
    next = async () => ({ status: "account_not_found" });
    const a = await get("?account=ZZZ");
    expect(a.status).toBe(404);
    expect((await a.json()).error).toBe("account_not_found");

    next = async () => ({ status: "signal_not_found" });
    const s = await get("?account=C01&signal=NOPE");
    expect(s.status).toBe(404);
    expect((await s.json()).error).toBe("signal_not_found");
  });

  test("503 with a structured body that does not leak connection details when the graph is unavailable", async () => {
    next = async () => {
      throw new Error("Failed to connect to neo4j+s://secret-host.databases.neo4j.io password=hunter2");
    };
    const quiet = spyOn(console, "error").mockImplementation(() => {});
    const res = await get("?account=C01");
    quiet.mockRestore();
    expect(res.status).toBe(503);
    const text = await res.text();
    expect(JSON.parse(text)).toEqual({ error: "graph_unavailable", message: "The graph database could not be reached." });
    expect(text).not.toContain("secret-host");
    expect(text).not.toContain("hunter2");
  });
});
