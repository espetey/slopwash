/**
 * Apply pending schema migrations.
 * Usage: DATABASE_URL=... npx tsx scripts/migrate.ts
 */
import { runMigrations } from "../lib/db/migrations";
import { getPool } from "../lib/db";

async function main() {
  const applied = await runMigrations();
  if (applied.length === 0) {
    console.log("Schema is current. No migrations applied.");
  } else {
    for (const id of applied) console.log(`Applied ${id}`);
  }
  await getPool()?.end();
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
