import { getPool } from "./index";

/**
 * Schema migrations, applied in order by scripts/migrate.ts and tracked
 * in the schema_migrations table. Every statement is written to be
 * safe to re-run (IF NOT EXISTS / IF EXISTS guards), so a partial or
 * repeated run converges on the same schema.
 *
 * Order matters across specs:
 *   0001  item 3a: api_keys, usage_events, flywheel_triples
 * Later migrations land with the phases that need them (orgs and
 * check_runs with build spec Phase 1, corpus tables with Phase 2).
 */

export interface Migration {
  id: string;
  sql: string;
}

export const MIGRATIONS: Migration[] = [
  {
    id: "0001_item3a_keys_metering_flywheel",
    sql: `
CREATE TABLE IF NOT EXISTS api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key_hash text NOT NULL UNIQUE,
  key_prefix text NOT NULL,
  name text NOT NULL,
  tier text NOT NULL DEFAULT 'free',
  scopes text[] NOT NULL DEFAULT '{score,rewrite}',
  flywheel_opt_out boolean NOT NULL DEFAULT false,
  org_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  last_used_at timestamptz
);

CREATE TABLE IF NOT EXISTS usage_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key_id uuid NOT NULL REFERENCES api_keys(id),
  endpoint text NOT NULL,
  ts timestamptz NOT NULL DEFAULT now(),
  input_chars integer NOT NULL DEFAULT 0,
  tokens_in integer,
  tokens_out integer,
  est_cost_usd numeric(12, 6) NOT NULL DEFAULT 0,
  org_id uuid,
  spec_version integer
);
CREATE INDEX IF NOT EXISTS usage_events_key_ts ON usage_events (key_id, ts);
CREATE INDEX IF NOT EXISTS usage_events_ts ON usage_events (ts);

CREATE TABLE IF NOT EXISTS flywheel_triples (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key_id uuid NOT NULL REFERENCES api_keys(id),
  ts timestamptz NOT NULL DEFAULT now(),
  draft text NOT NULL,
  rewrite text NOT NULL,
  score_before integer NOT NULL,
  score_after integer NOT NULL,
  model text NOT NULL,
  tokens_in integer,
  tokens_out integer
);
CREATE INDEX IF NOT EXISTS flywheel_triples_ts ON flywheel_triples (ts);
`,
  },
];

export async function runMigrations(): Promise<string[]> {
  const pool = getPool();
  if (!pool) {
    throw new Error(
      "No database connection string configured (DATABASE_URL or POSTGRES_URL)."
    );
  }
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    );
  `);
  const applied: string[] = [];
  for (const migration of MIGRATIONS) {
    const existing = await pool.query(
      "SELECT id FROM schema_migrations WHERE id = $1",
      [migration.id]
    );
    if (existing.rows.length > 0) continue;
    await pool.query(migration.sql);
    await pool.query("INSERT INTO schema_migrations (id) VALUES ($1)", [
      migration.id,
    ]);
    applied.push(migration.id);
  }
  return applied;
}
