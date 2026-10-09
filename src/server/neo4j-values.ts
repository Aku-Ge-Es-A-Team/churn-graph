// Converts values returned by neo4j-driver into plain JSON values: Date → "YYYY-MM-DD", Integer → number.
// Pure (no database access), so it is shared by the server runner, the pipeline scripts and the tests.
import neo4j from "neo4j-driver";

/** "YYYY-MM-DD" from a driver Date ({year, month, day}); null for anything else. */
export function toIsoDate(value: unknown): string | null {
  if (value && typeof value === "object" && "year" in value && "month" in value && "day" in value) {
    const d = value as { year: unknown; month: unknown; day: unknown };
    const n = (x: unknown) => Number(x);
    return `${String(n(d.year)).padStart(4, "0")}-${String(n(d.month)).padStart(2, "0")}-${String(n(d.day)).padStart(2, "0")}`;
  }
  return null;
}

export function toPlainValue(value: unknown): unknown {
  const date = toIsoDate(value);
  if (date) return date;
  if (Array.isArray(value)) return value.map(toPlainValue);
  if (value && typeof value === "object") {
    if (neo4j.isInt(value)) return (value as { toNumber(): number }).toNumber();
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, toPlainValue(v)]));
  }
  return value;
}
