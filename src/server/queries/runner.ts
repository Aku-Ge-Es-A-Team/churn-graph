/** Runs one read query and returns plain objects (dates as ISO strings, integers as numbers). */
export type CypherRunner = (query: string, params?: Record<string, unknown>) => Promise<Record<string, unknown>[]>;
