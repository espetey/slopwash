import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api/auth";
import { getOrg } from "@/lib/org-spec/store";
import { listPieces } from "@/lib/corpus/ingest";
import { listRuns } from "@/lib/corpus/store";

/**
 * Admin corpus summary for one org (Phase 3 console). Read-only:
 * piece counts by period and genre, and the run list. Ingest and
 * period runs stay on the keyed corpus routes, where the metering
 * rows are written.
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
  const pieces = await listPieces({ orgId: id });
  const groups = new Map<string, { period: string; genre: string; pieces: number; chars: number }>();
  for (const piece of pieces) {
    const key = `${piece.period}::${piece.genre}`;
    const group = groups.get(key) ?? {
      period: piece.period,
      genre: piece.genre,
      pieces: 0,
      chars: 0,
    };
    group.pieces += 1;
    group.chars += piece.text.length;
    groups.set(key, group);
  }
  const runs = await listRuns({ orgId: id });
  return NextResponse.json({
    piece_groups: [...groups.values()].sort((a, b) =>
      `${a.period}${a.genre}`.localeCompare(`${b.period}${b.genre}`)
    ),
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
