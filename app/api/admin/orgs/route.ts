import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api/auth";
import { createOrg, deleteOrg, listOrgs } from "@/lib/org-spec/store";

/**
 * Admin org management (build spec B1). Admin-only, behind
 * ADMIN_SECRET, on the same pattern as key issuance. Deleting an org
 * removes its spec versions, exemplars, and check runs in one
 * transaction and clears the org link on its API keys.
 */

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
  const retentionDays =
    typeof body.retention_days === "number" && body.retention_days >= 0
      ? Math.floor(body.retention_days)
      : undefined;

  const org = await createOrg({
    name,
    retentionDays,
    embeddingsOptOut: body.embeddings_opt_out === true,
  });
  return NextResponse.json(org);
}

export async function GET(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  return NextResponse.json({ orgs: await listOrgs() });
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
      { error: 'Request body must include the org "id" to delete.' },
      { status: 400 }
    );
  }
  const deleted = await deleteOrg(id);
  if (!deleted) {
    return NextResponse.json(
      { error: "No org with that id." },
      { status: 404 }
    );
  }
  return NextResponse.json({ id, deleted: true });
}
