import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api/auth";
import { getOrg } from "@/lib/org-spec/store";
import { getRun, listRuns } from "@/lib/corpus/store";
import { renderGenreReport } from "@/lib/corpus/report";

/**
 * Admin read of one stored corpus report (Phase 3 console): the
 * run's measures, floors, and the rendered genre report. The keyed
 * route at /api/corpus/reports/[runId] serves the same body to the
 * org's own keys.
 */

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; runId: string }> }
) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  const { id, runId } = await params;

  const org = await getOrg(id);
  if (!org) {
    return NextResponse.json(
      { error: "No org with that id." },
      { status: 404 }
    );
  }
  const run = await getRun(runId);
  if (!run || run.org_id !== id) {
    return NextResponse.json(
      { error: "No corpus run with that id for this org." },
      { status: 404 }
    );
  }
  const genreRuns = await listRuns({ orgId: id, genre: run.genre });
  return NextResponse.json({
    run: {
      id: run.id,
      period: run.period,
      genre: run.genre,
      reading: run.reading,
      spec_version: run.spec_version,
      analyzer_version: run.analyzer_version,
      embedder: run.embedder,
      created_at: run.created_at,
    },
    measures: run.measures,
    floors: run.floors,
    report: renderGenreReport({
      orgName: org.name,
      genre: run.genre,
      runs: genreRuns,
    }),
  });
}
