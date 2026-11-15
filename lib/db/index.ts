import { Pool } from "pg";

/**
 * Postgres access for the keyed API surface (item 3) and the org and
 * corpus tables (build spec, Phases 1 and 2).
 *
 * One database for keys, metering, orgs, and corpora (build spec D-2).
 * The connection string comes from DATABASE_URL, falling back to the
 * POSTGRES_URL name Vercel Postgres provisions.
 *
 * When no connection string is configured the deployment runs exactly
 * as it did before item 3: anonymous calls work, and any call that
 * presents an API key fails closed with a 503 from the auth layer,
 * because a key cannot be verified without the database.
 */

let pool: Pool | null = null;
let poolResolved = false;

export function dbConnectionString(): string | undefined {
  return process.env.DATABASE_URL || process.env.POSTGRES_URL || undefined;
}

export function isDbConfigured(): boolean {
  return dbConnectionString() !== undefined;
}

export function getPool(): Pool | null {
  if (!poolResolved) {
    poolResolved = true;
    const connectionString = dbConnectionString();
    if (connectionString) {
      pool = new Pool({ connectionString, max: 5 });
    }
  }
  return pool;
}

export async function query<T = Record<string, unknown>>(
  text: string,
  params: unknown[] = []
): Promise<T[]> {
  const active = getPool();
  if (!active) {
    throw new Error("Database is not configured on this deployment.");
  }
  const result = await active.query(text, params as never[]);
  return result.rows as T[];
}

export async function queryOne<T = Record<string, unknown>>(
  text: string,
  params: unknown[] = []
): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows.length > 0 ? rows[0] : null;
}

/** Run a set of statements in one transaction. Used for org deletion. */
export async function withTransaction(
  fn: (client: {
    query: (text: string, params?: unknown[]) => Promise<unknown>;
  }) => Promise<void>
): Promise<void> {
  const active = getPool();
  if (!active) {
    throw new Error("Database is not configured on this deployment.");
  }
  const client = await active.connect();
  try {
    await client.query("BEGIN");
    await fn({
      query: async (text, params = []) => {
        const result = await client.query(text, params as never[]);
        return result.rows;
      },
    });
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
