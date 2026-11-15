import { NextRequest, NextResponse } from "next/server";
import { requireOrgKey } from "@/lib/api/auth";
import { runPeriod } from "@/lib/corpus/store";

/**
 * Close a period and run it (build spec D2). One corpus_runs row
 * per genre present in the period, and one usage_events row per
 * genre with endpoint corpus_run: one run over one genre-period is
 * one corpus read, the unit the tiers price (allowances are D-3,
 * unset; the routes run for admin-issued keys with no quota row).
 */

export async function POST(req: NextRequest) {
  const auth = await requireOrgKey(req, "corpus");
  if (!auth.ok) return auth.response;
  const orgId = auth.key.org_id!;

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON." },
      { status: 400 }
    );
  }
  const period = typeof body.period === "string" ? body.period.trim() : "";
  if (!period) {
    return NextResponse.json(
      { error: 'Request body must include a "period" string.' },
      { status: 400 }
    );
  }

  const runs = await runPeriod({ orgId, period, keyId: auth.key.id });
  if (runs.length === 0) {
    return NextResponse.json(
      { error: `No pieces stored for period "${period}" in this org.` },
      { status: 404 }
    );
  }
  return NextResponse.json({
    runs: runs.map((r) => ({
      id: r.id,
      period: r.period,
      genre: r.genre,
      reading: r.reading,
      spec_version: r.spec_version,
      analyzer_version: r.analyzer_version,
      embedder: r.embedder,
      piece_count: r.measures.pieceCount,
      created_at: r.created_at,
    })),
  });
}
