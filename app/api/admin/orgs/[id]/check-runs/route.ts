import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api/auth";
import { getOrg, listCheckRuns } from "@/lib/org-spec/store";

/**
 * The check audit trail for one org (build spec B1): one row per org
 * check, with the spec version, the instrument versions, the input
 * hash, and the result summary. Inputs are never stored as text.
 */

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
  const limitParam = Number(req.nextUrl.searchParams.get("limit") ?? 50);
  const runs = await listCheckRuns(
    id,
    Number.isFinite(limitParam) ? limitParam : 50
  );
  return NextResponse.json({ check_runs: runs });
}
