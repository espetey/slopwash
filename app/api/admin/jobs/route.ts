import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api/auth";
import { purgeOldFlywheelTriples } from "@/lib/api/metering";
import { purgeExpiredCorpusPieces } from "@/lib/corpus/retention";

/**
 * Admin maintenance jobs. POST with { "job": "..." }.
 *
 * - flywheel-retention: delete flywheel triples past the 90-day raw
 *   retention window (item 3 section 7).
 * - corpus-retention: delete corpus pieces past their org's
 *   retention window (build spec D-4). Runs and measures stay.
 *
 * On Vercel these run from a cron hit or by hand; the route is the
 * job, the schedule is deployment configuration.
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

  const job = typeof body.job === "string" ? body.job : "";
  if (job === "flywheel-retention") {
    const deleted = await purgeOldFlywheelTriples();
    return NextResponse.json({ job, deleted });
  }
  if (job === "corpus-retention") {
    const deleted = await purgeExpiredCorpusPieces();
    return NextResponse.json({ job, deleted });
  }
  return NextResponse.json(
    {
      error: `Unknown job "${job}". Known jobs: flywheel-retention, corpus-retention.`,
    },
    { status: 400 }
  );
}
