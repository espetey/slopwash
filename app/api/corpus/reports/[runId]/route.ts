import { NextRequest, NextResponse } from "next/server";
import { requireOrgKey } from "@/lib/api/auth";
import { getOrg } from "@/lib/org-spec/store";
import { getRun, listRuns } from "@/lib/corpus/store";
import { renderGenreReport } from "@/lib/corpus/report";

/**
 * A stored corpus report (build spec D2): the run's measures plus
 * the rendered genre report across all periods on record. A run
 * that belongs to another org reads as not found.
 */

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  const auth = await requireOrgKey(req, "corpus");
  if (!auth.ok) return auth.response;
  const orgId = auth.key.org_id!;
  const { runId } = await params;

  const run = await getRun(runId);
  if (!run || run.org_id !== orgId) {
    return NextResponse.json(
      { error: "No corpus run with that id for this org." },
      { status: 404 }
    );
  }
  const org = await getOrg(orgId);
  const genreRuns = await listRuns({ orgId, genre: run.genre });
  const report = renderGenreReport({
    orgName: org?.name ?? orgId,
    genre: run.genre,
    runs: genreRuns,
  });
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
    report,
  });
}
