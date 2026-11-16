import { getPool } from "./index";

/**
 * Schema migrations, applied in order by scripts/migrate.ts and tracked
 * in the schema_migrations table. Every statement is written to be
 * safe to re-run (IF NOT EXISTS / IF EXISTS guards), so a partial or
 * repeated run converges on the same schema.
 *
 * Order matters across specs:
 *   0001  item 3a: api_keys, usage_events, flywheel_triples
 *   0002  build spec Phase 1 (B1): orgs, org_spec_versions,
 *         org_exemplars, check_runs
 *   0003  build spec Phase 2 (C1): corpus_pieces, corpus_runs
 *   0004  flywheel opt-in: api_keys.flywheel_opt_in
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
  {
    id: "0002_b1_orgs_specs_exemplars_check_runs",
    sql: `
CREATE TABLE IF NOT EXISTS orgs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  retention_days integer NOT NULL DEFAULT 365,
  embeddings_opt_out boolean NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS org_spec_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES orgs(id),
  version integer NOT NULL,
  spec jsonb NOT NULL,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  note text,
  UNIQUE (org_id, version)
);

CREATE TABLE IF NOT EXISTS org_exemplars (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES orgs(id),
  title text NOT NULL,
  source_url text,
  text text NOT NULL,
  text_hash text NOT NULL,
  added_by text,
  added_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS org_exemplars_org ON org_exemplars (org_id);

CREATE TABLE IF NOT EXISTS check_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES orgs(id),
  key_id uuid NOT NULL REFERENCES api_keys(id),
  spec_version integer NOT NULL,
  ruleset_version text NOT NULL,
  analyzer_version text NOT NULL,
  surface text NOT NULL,
  input_chars integer NOT NULL DEFAULT 0,
  input_hash text NOT NULL,
  result jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS check_runs_org_created ON check_runs (org_id, created_at);
`,
  },
  {
    id: "0003_c1_corpus_pieces_runs",
    sql: `
CREATE TABLE IF NOT EXISTS corpus_pieces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES orgs(id),
  period text NOT NULL,
  genre text NOT NULL,
  title text,
  source_url text,
  text text NOT NULL,
  text_hash text NOT NULL,
  ingested_at timestamptz NOT NULL DEFAULT now(),
  retention_until timestamptz NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS corpus_pieces_org_period_hash
  ON corpus_pieces (org_id, period, text_hash);
CREATE INDEX IF NOT EXISTS corpus_pieces_org_period_genre
  ON corpus_pieces (org_id, period, genre);

CREATE TABLE IF NOT EXISTS corpus_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES orgs(id),
  period text NOT NULL,
  genre text NOT NULL,
  spec_version integer,
  analyzer_version text NOT NULL,
  embedder text NOT NULL DEFAULT 'none',
  measures jsonb NOT NULL,
  reading text NOT NULL,
  floors jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS corpus_runs_org_genre ON corpus_runs (org_id, genre, created_at);
`,
  },
  {
    // Policy change, Nov 15, 2026 (Erik's call): flywheel retention
    // flips from opt-out to opt-in. Draft/rewrite triples are stored
    // only for keys with flywheel_opt_in = true; the default is that
    // nothing is kept. The old flywheel_opt_out column stays in place
    // for history and is no longer read or written.
    id: "0004_flywheel_opt_in",
    sql: `
ALTER TABLE api_keys
  ADD COLUMN IF NOT EXISTS flywheel_opt_in boolean NOT NULL DEFAULT false;
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
