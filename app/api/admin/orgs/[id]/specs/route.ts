import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api/auth";
import {
  addSpecVersion,
  getOrg,
  listSpecVersions,
} from "@/lib/org-spec/store";

/**
 * Spec versions for one org (build spec B1). Versions are immutable:
 * POST adds a new row, and a version number that already exists for
 * the org is refused with 409. There is no update or delete.
 */

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  const { id } = await params;

  const org = await getOrg(id);
  if (!org) {
    return NextResponse.json(
      { error: "No org with that id." },
      { status: 404 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON." },
      { status: 400 }
    );
  }
  const spec = body.spec;
  if (typeof spec !== "object" || spec === null) {
    return NextResponse.json(
      { error: 'Request body must include a "spec" object.' },
      { status: 400 }
    );
  }

  try {
    const row = await addSpecVersion({
      orgId: id,
      spec: spec as never,
      createdBy:
        typeof body.created_by === "string" ? body.created_by : null,
    });
    return NextResponse.json({
      id: row.id,
      org_id: row.org_id,
      version: row.version,
      created_by: row.created_by,
      created_at: row.created_at,
      note: row.note,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const code = (err as { code?: string }).code;
    if (code === "23505") {
      return NextResponse.json(
        {
          error:
            "That spec version already exists for this org. Versions are immutable; add a new version number.",
        },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  const { id } = await params;

  const org = await getOrg(id);
  if (!org) {
    return NextResponse.json(
      { error: "No org with that id." },
      { status: 404 }
    );
  }
  const versions = await listSpecVersions(id);
  return NextResponse.json({
    versions: versions.map((v) => ({
      id: v.id,
      version: v.version,
      spec: v.spec,
      created_by: v.created_by,
      created_at: v.created_at,
      note: v.note,
    })),
  });
}
