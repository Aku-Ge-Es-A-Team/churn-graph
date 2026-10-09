import neo4j, { type Driver } from "neo4j-driver";
import { neo4jEnv } from "./env";
import { guardCypher } from "./cypher-guard";

// Terklasifikasi agar pemanggil (mis. route /api/ask) bisa membedakan ini dari error driver
// dan menampilkan `alasan` ke LLM tanpa membocorkan query mentah.
export class CypherGuardError extends Error {
  alasan: string;
  constructor(alasan: string) {
    super(alasan);
    this.name = "CypherGuardError";
    this.alasan = alasan;
  }
}

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

export async function readCypher<T = Record<string, unknown>>(
  query: string,
  params: Record<string, unknown> = {},
): Promise<T[]> {
  const guarded = guardCypher(query);
  if (!guarded.ok) {
    throw new CypherGuardError(guarded.alasan);
  }

  // Pengamanan berlapis: guard di atas MENOLAK klausa tulis/berbahaya; defaultAccessMode READ
  // di bawah ini adalah lapis kedua yang independen di level driver, bukan pengganti guard.
  const session = getDriver().session({
    database: neo4jEnv().NEO4J_DATABASE,
    defaultAccessMode: neo4j.session.READ,
  });
  try {
    const result = await session.executeRead((tx) => tx.run(guarded.query, params), {
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
