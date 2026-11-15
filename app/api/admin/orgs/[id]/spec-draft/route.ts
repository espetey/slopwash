import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api/auth";
import { getOrg, listExemplars } from "@/lib/org-spec/store";
import {
  draftSpecFromExemplars,
  type Correction,
} from "@/lib/org-spec/draft";

/**
 * Spec drafting aid over an org's stored exemplars (build spec B1).
 * Returns proposals only; nothing here writes a spec version. A
 * person approves lines and adds them through the specs route.
 * Corrections from the org's own history may be posted with the
 * request: { corrections: [{ from, to? }] }.
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

  let corrections: Correction[] = [];
  try {
    const body = (await req.json()) as Record<string, unknown>;
    if (Array.isArray(body.corrections)) {
      corrections = body.corrections.filter(
        (c): c is Correction =>
          typeof c === "object" &&
          c !== null &&
          typeof (c as Correction).from === "string"
      );
    }
  } catch {
    // An empty body is fine; corrections are optional.
  }

  const exemplars = await listExemplars(id);
  const draft = draftSpecFromExemplars(
    exemplars.map((e) => e.text),
    corrections
  );
  return NextResponse.json(draft);
}
