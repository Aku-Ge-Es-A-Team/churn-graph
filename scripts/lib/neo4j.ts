// Neo4j driver for the pipeline scripts (load, run-cypher, signals) and the tests that need Aura.
// Deliberately separate from `src/server/neo4j.ts`: that module is `server-only` and READ-only, whereas these scripts write.
// Credentials come only from the environment (Bun loads .env.local); there are no values in the code.
import neo4j, { type Driver } from "neo4j-driver";

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigError";
  }
}

export function readNeo4jEnv(env: Record<string, string | undefined> = process.env): { uri: string; user: string; password: string } {
  const missing = ["NEO4J_URI", "NEO4J_USERNAME", "NEO4J_PASSWORD"].filter((k) => !env[k]?.trim());
  if (missing.length > 0) throw new ConfigError(`Neo4j env is not set: ${missing.join(", ")}. Fill it in .env.local (see .env.example).`);
  return { uri: env.NEO4J_URI!.trim(), user: env.NEO4J_USERNAME!.trim(), password: env.NEO4J_PASSWORD! };
}

export function createDriver(env: Record<string, string | undefined> = process.env): Driver {
  const { uri, user, password } = readNeo4jEnv(env);
  return neo4j.driver(uri, neo4j.auth.basic(user, password), {
    disableLosslessIntegers: true, // Neo4j Integer → JS number
    connectionTimeout: 15_000,
    maxTransactionRetryTime: 15_000,
  });
}

/** Host of a URI (without credentials), to display before a destructive operation. */
export function hostFromUri(uri: string): string {
  try {
    return new URL(uri.replace(/^neo4j(\+s(sc)?)?:/, "https:").replace(/^bolt(\+s(sc)?)?:/, "https:")).host;
  } catch {
    return "(unreadable URI)";
  }
}

/** Split a .cypher file into statements (separated by `;`), dropping `//` comment lines. */
export function splitStatements(text: string): string[] {
  const withoutComments = text
    .split(/\r?\n/)
    .filter((line) => !line.trim().startsWith("//"))
    .join("\n");
  return withoutComments
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s !== "");
}

export { neo4j };
