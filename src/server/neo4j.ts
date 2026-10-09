// Single entry point for every read query (app, LLM tools, console): READ session, write clauses denied,
// LIMIT forced, 5 second transaction timeout. See cypher-guard.ts for the pure part of the guard.
import "server-only";
import neo4j, { type Driver } from "neo4j-driver";
import { guardCypher, READ_ONLY_MESSAGE } from "./cypher-guard";
import { toPlainValue } from "./neo4j-values";

const ENV_KEYS = ["NEO4J_URI", "NEO4J_USERNAME", "NEO4J_PASSWORD"] as const;
export const QUERY_TIMEOUT_MS = 5000;

/** The connection configuration is incomplete — distinguished from errors returned by the Neo4j server. */
export class Neo4jConfigError extends Error {
  constructor(missing: string[]) {
    super(`Neo4j environment variables are not set: ${missing.join(", ")}`);
    this.name = "Neo4jConfigError";
  }
}

/** A query was rejected by the guard before it reached the database. */
export class QueryRejectedError extends Error {
  constructor(reason: string) {
    super(`${READ_ONLY_MESSAGE}: ${reason}`);
    this.name = "QueryRejectedError";
  }
}

let driver: Driver | undefined;

// Created lazily: missing env or a bad URI becomes an error the caller can catch, not a crash at import time.
function getDriver(): Driver {
  if (driver) return driver;
  const missing = ENV_KEYS.filter((key) => !process.env[key]);
  if (missing.length > 0) throw new Neo4jConfigError(missing);

  driver = neo4j.driver(process.env.NEO4J_URI!, neo4j.auth.basic(process.env.NEO4J_USERNAME!, process.env.NEO4J_PASSWORD!), {
    disableLosslessIntegers: true, // Neo4j Integer → JS number
    connectionTimeout: 10_000,
    maxTransactionRetryTime: 5_000, // an unreachable host fails fast instead of retrying for 30 seconds
  });
  return driver;
}

export type ReadOptions = {
  /** Upper bound for the forced LIMIT. Trusted internal queries may raise it; the console and the LLM keep the default. */
  maxLimit?: number;
};

/** Runs a read query and returns plain objects (dates as ISO strings, integers as numbers). */
export async function readCypher<T = Record<string, unknown>>(
  query: string,
  params: Record<string, unknown> = {},
  options: ReadOptions = {},
): Promise<T[]> {
  const guarded = guardCypher(query, { maxLimit: options.maxLimit });
  if (!guarded.ok) throw new QueryRejectedError(guarded.reason);

  const session = getDriver().session({ defaultAccessMode: neo4j.session.READ });
  try {
    const result = await session.executeRead((tx) => tx.run(guarded.query, params), { timeout: QUERY_TIMEOUT_MS });
    return result.records.map((record) => toPlainValue(record.toObject()) as T);
  } finally {
    await session.close();
  }
}
