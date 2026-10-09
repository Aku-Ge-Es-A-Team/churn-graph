// Guard for Cypher queries that originate from an LLM or the console: a pure function with no database access.
// This layer works TOGETHER with the READ session of the driver (see neo4j.ts), it does not replace it.

const MAX_LIMIT = 200;

// Write / dangerous keywords. Matched on word boundaries, case-insensitive.
const DENIED_KEYWORDS = ["CREATE", "MERGE", "DELETE", "DETACH", "SET", "REMOVE", "DROP", "FOREACH", "START"];

// Replaces comment and string contents with spaces OF THE SAME LENGTH, so character positions stay aligned
// with the original query. The LIMIT clause is cut from the original text, not from the masked copy.
function stripCommentsAndStrings(query: string): string {
  const blank = (match: string) => " ".repeat(match.length);
  return query
    .replace(/\/\*[\s\S]*?\*\//g, blank)
    .replace(/\/\/.*$/gm, blank)
    .replace(/'(?:[^'\\]|\\.)*'/g, blank)
    .replace(/"(?:[^"\\]|\\.)*"/g, blank);
}

function hasWord(haystack: string, word: string): boolean {
  // \b also matches around newlines/tabs, so "DETACH\n DELETE" is still caught.
  return new RegExp(`\\b${word}\\b`, "i").test(haystack);
}

export type GuardResult = { ok: true; query: string } | { ok: false; reason: string };

export const READ_ONLY_MESSAGE = "Only read queries are allowed";

export function guardCypher(query: string, opts?: { maxLimit?: number }): GuardResult {
  const maxLimit = opts?.maxLimit ?? MAX_LIMIT;
  const trimmed = query.trim();
  if (!trimmed) return { ok: false, reason: "An empty query is not allowed." };

  // `withoutTrailingSemicolon` keeps the ORIGINAL text (used for the result); `cleaned` is only used for keyword checks.
  const withoutTrailingSemicolon = trimmed.replace(/;+\s*$/, "");
  const cleaned = stripCommentsAndStrings(withoutTrailingSemicolon);

  // A semicolon outside strings/comments means multiple statements.
  if (cleaned.includes(";")) return { ok: false, reason: "Only a single statement is allowed." };

  for (const keyword of DENIED_KEYWORDS) {
    if (hasWord(cleaned, keyword)) return { ok: false, reason: `The "${keyword}" clause is not allowed.` };
  }
  if (/\bLOAD\s+CSV\b/i.test(cleaned)) return { ok: false, reason: 'The "LOAD CSV" clause is not allowed.' };
  if (/\bapoc\s*\./i.test(cleaned)) return { ok: false, reason: 'The "apoc" namespace is not allowed.' };
  if (/\bdbms\s*\./i.test(cleaned)) return { ok: false, reason: 'The "dbms" namespace is not allowed.' };

  // Every CALL is denied except the full-text search procedure.
  for (const match of cleaned.matchAll(/\bCALL\s+([a-zA-Z0-9_.]+)/gi)) {
    if (match[1].toLowerCase() !== "db.index.fulltext.querynodes") return { ok: false, reason: "CALL procedures are not allowed." };
  }

  // Force a top-level LIMIT. A missing LIMIT gets the default; a LIMIT above the maximum is lowered (not rejected),
  // because the intent ("I need rows") is valid and only the volume must be bounded.
  const limitMatch = cleaned.match(/\bLIMIT\s+(\d+)\s*$/i);
  let finalQuery = withoutTrailingSemicolon;
  if (!limitMatch) {
    finalQuery = `${finalQuery} LIMIT ${maxLimit}`;
  } else if (parseInt(limitMatch[1], 10) > maxLimit) {
    finalQuery = withoutTrailingSemicolon.slice(0, limitMatch.index) + `LIMIT ${maxLimit}`;
  }
  return { ok: true, query: finalQuery };
}
