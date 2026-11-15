import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api/auth";
import {
  addExemplar,
  deleteExemplar,
  getOrg,
  listExemplars,
} from "@/lib/org-spec/store";

/**
 * Exemplars for one org (build spec B1): the org's named best work.
 * Per-document checks do not read exemplars in this phase; the corpus
 * engine (Phase 2) and the spec drafting aid do. Exemplar text is
 * stored under the org and never enters the flywheel.
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
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const text = typeof body.text === "string" ? body.text : "";
  if (!title || !text.trim()) {
    return NextResponse.json(
      { error: 'Request body must include "title" and "text" strings.' },
      { status: 400 }
    );
  }

  const row = await addExemplar({
    orgId: id,
    title,
    sourceUrl: typeof body.source_url === "string" ? body.source_url : null,
    text,
    addedBy: typeof body.added_by === "string" ? body.added_by : null,
  });
  return NextResponse.json({
    id: row.id,
    org_id: row.org_id,
    title: row.title,
    source_url: row.source_url,
    text_hash: row.text_hash,
    chars: row.text.length,
    added_by: row.added_by,
    added_at: row.added_at,
  });
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
  const exemplars = await listExemplars(id);
  return NextResponse.json({
    exemplars: exemplars.map((e) => ({
      id: e.id,
      title: e.title,
      source_url: e.source_url,
      text_hash: e.text_hash,
      chars: e.text.length,
      added_by: e.added_by,
      added_at: e.added_at,
    })),
  });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON." },
      { status: 400 }
    );
  }
  const exemplarId = typeof body.id === "string" ? body.id : "";
  if (!exemplarId) {
    return NextResponse.json(
      { error: 'Request body must include the exemplar "id" to delete.' },
      { status: 400 }
    );
  }
  const deleted = await deleteExemplar(id, exemplarId);
  if (!deleted) {
    return NextResponse.json(
      { error: "No exemplar with that id for this org." },
      { status: 404 }
    );
  }
  return NextResponse.json({ id: exemplarId, deleted: true });
}
