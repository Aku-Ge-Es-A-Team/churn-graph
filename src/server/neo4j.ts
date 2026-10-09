// Driver Neo4j dasar (Rencana Teknis Langkah 8, versi minimal T00-04).
// Pengerasan readCypher (deny-list klausa tulis, LIMIT dipaksa, timeout 5 detik) milik F-10.
import "server-only";
import neo4j, { type Driver } from "neo4j-driver";

const ENV_KEYS = ["NEO4J_URI", "NEO4J_USERNAME", "NEO4J_PASSWORD"] as const;

/** Konfigurasi koneksi tidak lengkap -- dibedakan dari error server Neo4j. */
export class Neo4jConfigError extends Error {
  constructor(missing: string[]) {
    super(`Env Neo4j belum di-set: ${missing.join(", ")}`);
    this.name = "Neo4jConfigError";
  }
}

let driver: Driver | undefined;

// Dibuat lazy: env kosong atau URI salah menjadi error yang bisa ditangkap pemanggil,
// bukan crash saat modul di-import.
function getDriver(): Driver {
  if (driver) return driver;
  const missing = ENV_KEYS.filter((key) => !process.env[key]);
  if (missing.length > 0) throw new Neo4jConfigError(missing);

  driver = neo4j.driver(
    process.env.NEO4J_URI!,
    neo4j.auth.basic(process.env.NEO4J_USERNAME!, process.env.NEO4J_PASSWORD!),
    {
      disableLosslessIntegers: true, // Integer Neo4j -> number JS
      connectionTimeout: 10_000,
      maxTransactionRetryTime: 5_000, // host tak terjangkau gagal cepat, tidak retry 30 detik
    },
  );
  return driver;
}

/** Jalankan query baca lewat session READ; mengembalikan record sebagai objek biasa. */
export async function readCypher<T = Record<string, unknown>>(
  query: string,
  params: Record<string, unknown> = {},
): Promise<T[]> {
  const session = getDriver().session({ defaultAccessMode: neo4j.session.READ });
  try {
    const result = await session.executeRead((tx) => tx.run(query, params));
    return result.records.map((record) => record.toObject() as T);
  } finally {
    await session.close();
  }
}
