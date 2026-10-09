import neo4j, { type Driver } from "neo4j-driver";
import { neo4jEnv } from "./env";

// Disimpan di globalThis agar hot-reload dev dan instance serverless tidak membuat driver baru tiap import.
const g = globalThis as typeof globalThis & { __neo4jDriver?: Driver };

function getDriver(): Driver {
  if (!g.__neo4jDriver) {
    const env = neo4jEnv();
    g.__neo4jDriver = neo4j.driver(
      env.NEO4J_URI,
      neo4j.auth.basic(env.NEO4J_USERNAME, env.NEO4J_PASSWORD),
      { disableLosslessIntegers: true },
    );
  }
  return g.__neo4jDriver;
}

const TX_TIMEOUT_MS = 5000;

// TODO(F-10): tolak klausa tulis (deny-list), tolak multi-statement, dan paksa LIMIT.
export async function readCypher<T = Record<string, unknown>>(
  query: string,
  params: Record<string, unknown> = {},
): Promise<T[]> {
  const session = getDriver().session({
    database: neo4jEnv().NEO4J_DATABASE,
    defaultAccessMode: neo4j.session.READ,
  });
  try {
    const result = await session.executeRead((tx) => tx.run(query, params), {
      timeout: TX_TIMEOUT_MS,
    });
    return result.records.map((r) => r.toObject() as T);
  } finally {
    await session.close();
  }
}

// Untuk script CLI, supaya proses bisa keluar.
export async function closeDriver(): Promise<void> {
  await g.__neo4jDriver?.close();
  g.__neo4jDriver = undefined;
}
