import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api/auth";
import { createKey, listKeys, revokeKey, type Tier } from "@/lib/api/keys";

/**
 * Admin key issuance (item 3a). Admin-only, behind ADMIN_SECRET.
 * There is no self-serve signup in this phase; keys are created for
 * design partners by hand. The plaintext key is returned exactly
 * once, in the creation response, and is never stored or shown again.
 */

const TIERS: Tier[] = ["free", "pro", "scale"];
const KNOWN_SCOPES = ["score", "rewrite", "corpus", "benchmark", "admin"];

export async function POST(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON." },
      { status: 400 }
    );
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) {
    return NextResponse.json(
      { error: 'Request body must include a "name" string.' },
      { status: 400 }
    );
  }
  const tier = TIERS.includes(body.tier as Tier)
    ? (body.tier as Tier)
    : "free";
  const scopes = Array.isArray(body.scopes)
    ? body.scopes.filter(
        (s): s is string => typeof s === "string" && KNOWN_SCOPES.includes(s)
      )
    : undefined;
  const orgId =
    typeof body.org_id === "string" && body.org_id ? body.org_id : null;

  const { key, plaintext } = await createKey({
    name,
    tier,
    scopes,
    flywheelOptOut: body.flywheel_opt_out === true,
    orgId,
  });

  return NextResponse.json({
    id: key.id,
    key: plaintext,
    key_prefix: key.key_prefix,
    name: key.name,
    tier: key.tier,
    scopes: key.scopes,
    org_id: key.org_id,
    created_at: key.created_at,
    note: "This is the only time the full key is shown. Store it now.",
  });
}

export async function GET(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;

  const keys = await listKeys();
  return NextResponse.json({
    keys: keys.map((k) => ({
      id: k.id,
      key_prefix: k.key_prefix,
      name: k.name,
      tier: k.tier,
      scopes: k.scopes,
      flywheel_opt_out: k.flywheel_opt_out,
      org_id: k.org_id,
      created_at: k.created_at,
      revoked_at: k.revoked_at,
      last_used_at: k.last_used_at,
    })),
  });
}

export async function DELETE(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON." },
      { status: 400 }
    );
  }
  const id = typeof body.id === "string" ? body.id : "";
  if (!id) {
    return NextResponse.json(
      { error: 'Request body must include the key "id" to revoke.' },
      { status: 400 }
    );
  }
  const revoked = await revokeKey(id);
  if (!revoked) {
    return NextResponse.json(
      { error: "No active key with that id." },
      { status: 404 }
    );
  }
  return NextResponse.json({ id, revoked: true });
}
