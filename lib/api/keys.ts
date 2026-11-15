import { createHash, randomBytes } from "crypto";
import { query, queryOne } from "@/lib/db";

/**
 * API keys (item 3a). Format: sw_live_ plus 32 random base62 characters.
 * The database stores only the SHA-256 hash; the plaintext is returned
 * exactly once, in the creation response, and never stored.
 */

export type Tier = "free" | "pro" | "scale";

export interface ApiKeyRow {
  id: string;
  key_hash: string;
  key_prefix: string;
  name: string;
  tier: Tier;
  scopes: string[];
  flywheel_opt_out: boolean;
  org_id: string | null;
  created_at: string;
  revoked_at: string | null;
  last_used_at: string | null;
}

const BASE62 =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

export function generateKeyPlaintext(): string {
  const bytes = randomBytes(32);
  let suffix = "";
  for (let i = 0; i < 32; i++) {
    suffix += BASE62[bytes[i] % BASE62.length];
  }
  return `sw_live_${suffix}`;
}

export function hashKey(plaintext: string): string {
  return createHash("sha256").update(plaintext).digest("hex");
}

export async function createKey(input: {
  name: string;
  tier?: Tier;
  scopes?: string[];
  flywheelOptOut?: boolean;
  orgId?: string | null;
}): Promise<{ key: ApiKeyRow; plaintext: string }> {
  const plaintext = generateKeyPlaintext();
  const keyHash = hashKey(plaintext);
  const keyPrefix = plaintext.slice(0, 12);
  const rows = await query<ApiKeyRow>(
    `INSERT INTO api_keys (key_hash, key_prefix, name, tier, scopes, flywheel_opt_out, org_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      keyHash,
      keyPrefix,
      input.name,
      input.tier ?? "free",
      input.scopes ?? ["score", "rewrite"],
      input.flywheelOptOut ?? false,
      input.orgId ?? null,
    ]
  );
  return { key: rows[0], plaintext };
}

export async function findKeyByPlaintext(
  plaintext: string
): Promise<ApiKeyRow | null> {
  return queryOne<ApiKeyRow>("SELECT * FROM api_keys WHERE key_hash = $1", [
    hashKey(plaintext),
  ]);
}

export async function listKeys(): Promise<ApiKeyRow[]> {
  return query<ApiKeyRow>("SELECT * FROM api_keys ORDER BY created_at DESC");
}

export async function revokeKey(id: string): Promise<boolean> {
  const rows = await query<{ id: string }>(
    `UPDATE api_keys SET revoked_at = now()
     WHERE id = $1 AND revoked_at IS NULL
     RETURNING id`,
    [id]
  );
  return rows.length > 0;
}

export async function touchKeyLastUsed(id: string): Promise<void> {
  await query("UPDATE api_keys SET last_used_at = now() WHERE id = $1", [id]);
}
