import { NextRequest, NextResponse } from "next/server";
import { requireOrgKey } from "@/lib/api/auth";
import {
  DuplicatePieceError,
  ingestPiece,
  listPieces,
} from "@/lib/corpus/ingest";
import { GENRES } from "@/lib/corpus/genres";

/**
 * Corpus ingest (build spec D2). Keyed, org-bound, corpus scope.
 * A piece arrives as text or as a URL the server fetches, with a
 * genre from the v1 list and an org-defined period label. A
 * duplicate text within the org and period is refused with 409 and
 * the existing piece named.
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
  const genre = typeof body.genre === "string" ? body.genre : "";
  if (!period || !genre) {
    return NextResponse.json(
      { error: 'Request body must include "period" and "genre" strings.' },
      { status: 400 }
    );
  }

  try {
    const piece = await ingestPiece({
      orgId,
      period,
      genre,
      title: typeof body.title === "string" ? body.title : null,
      sourceUrl:
        typeof body.source_url === "string" ? body.source_url : null,
      text: typeof body.text === "string" ? body.text : undefined,
      url: typeof body.url === "string" ? body.url : undefined,
    });
    return NextResponse.json({
      id: piece.id,
      org_id: piece.org_id,
      period: piece.period,
      genre: piece.genre,
      title: piece.title,
      source_url: piece.source_url,
      text_hash: piece.text_hash,
      chars: piece.text.length,
      ingested_at: piece.ingested_at,
      retention_until: piece.retention_until,
    });
  } catch (err) {
    if (err instanceof DuplicatePieceError) {
      return NextResponse.json(
        { error: err.message, existing_piece_id: err.existing.id },
        { status: 409 }
      );
    }
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      {
        error: message,
        ...(message.includes("genre list") ? { genres: GENRES } : {}),
      },
      { status: 400 }
    );
  }
}

export async function GET(req: NextRequest) {
  const auth = await requireOrgKey(req, "corpus");
  if (!auth.ok) return auth.response;
  const orgId = auth.key.org_id!;

  const period = req.nextUrl.searchParams.get("period") ?? undefined;
  const genre = req.nextUrl.searchParams.get("genre") ?? undefined;
  const pieces = await listPieces({ orgId, period, genre });
  return NextResponse.json({
    pieces: pieces.map((p) => ({
      id: p.id,
      period: p.period,
      genre: p.genre,
      title: p.title,
      source_url: p.source_url,
      text_hash: p.text_hash,
      chars: p.text.length,
      ingested_at: p.ingested_at,
      retention_until: p.retention_until,
    })),
  });
}
