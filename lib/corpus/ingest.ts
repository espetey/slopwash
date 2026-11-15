import { query, queryOne } from "@/lib/db";
import { getOrg } from "@/lib/org-spec/store";
import { hashText } from "@/lib/org-spec/store";
import { isGenre } from "./genres";

/**
 * Corpus ingest (build spec section 4, Item C1). Pieces arrive as
 * text or as a URL the server fetches. Published pieces only: drafts
 * belong to the check flow of Item D1.
 *
 * A duplicate text_hash within an org and period is rejected with
 * the existing piece named. Pieces are stored under the org, carry
 * a retention_until computed from the org's retention_days at
 * ingest, and never enter the flywheel.
 */

export interface CorpusPieceRow {
  id: string;
  org_id: string;
  period: string;
  genre: string;
  title: string | null;
  source_url: string | null;
  text: string;
  text_hash: string;
  ingested_at: string;
  retention_until: string;
}

export class DuplicatePieceError extends Error {
  existing: CorpusPieceRow;
  constructor(existing: CorpusPieceRow) {
    super(
      `This text is already in the corpus for this period as "${existing.title ?? existing.id}" (piece ${existing.id}).`
    );
    this.existing = existing;
  }
}

function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export async function fetchPieceText(url: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "user-agent": "Slopwash corpus ingest" },
    });
    if (!res.ok) {
      throw new Error(`Fetching ${url} returned ${res.status}.`);
    }
    const body = await res.text();
    const contentType = res.headers.get("content-type") ?? "";
    return contentType.includes("html") ? htmlToText(body) : body.trim();
  } finally {
    clearTimeout(timeout);
  }
}

export async function ingestPiece(input: {
  orgId: string;
  period: string;
  genre: string;
  title?: string | null;
  sourceUrl?: string | null;
  text?: string;
  url?: string;
}): Promise<CorpusPieceRow> {
  if (!isGenre(input.genre)) {
    throw new Error(
      `Genre "${input.genre}" is not in the v1 genre list.`
    );
  }
  const org = await getOrg(input.orgId);
  if (!org) throw new Error("No org with that id.");

  let text = input.text?.trim() ?? "";
  let sourceUrl = input.sourceUrl ?? null;
  if (!text && input.url) {
    text = await fetchPieceText(input.url);
    sourceUrl = input.url;
  }
  if (!text) {
    throw new Error('A piece needs "text" or a "url" to fetch.');
  }

  const textHash = hashText(text);
  const existing = await queryOne<CorpusPieceRow>(
    `SELECT * FROM corpus_pieces
     WHERE org_id = $1 AND period = $2 AND text_hash = $3`,
    [input.orgId, input.period, textHash]
  );
  if (existing) throw new DuplicatePieceError(existing);

  const rows = await query<CorpusPieceRow>(
    `INSERT INTO corpus_pieces
       (org_id, period, genre, title, source_url, text, text_hash, retention_until)
     VALUES ($1, $2, $3, $4, $5, $6, $7, now() + ($8 || ' days')::interval)
     RETURNING *`,
    [
      input.orgId,
      input.period,
      input.genre,
      input.title ?? null,
      sourceUrl,
      text,
      textHash,
      String(org.retention_days),
    ]
  );
  return rows[0];
}

export async function listPieces(input: {
  orgId: string;
  period?: string;
  genre?: string;
}): Promise<CorpusPieceRow[]> {
  const conditions = ["org_id = $1"];
  const params: unknown[] = [input.orgId];
  if (input.period) {
    params.push(input.period);
    conditions.push(`period = $${params.length}`);
  }
  if (input.genre) {
    params.push(input.genre);
    conditions.push(`genre = $${params.length}`);
  }
  return query<CorpusPieceRow>(
    `SELECT * FROM corpus_pieces
     WHERE ${conditions.join(" AND ")}
     ORDER BY ingested_at ASC`,
    params
  );
}

export async function countPieces(input: {
  orgId: string;
  period?: string;
  genre?: string;
}): Promise<number> {
  const pieces = await listPieces(input);
  return pieces.length;
}
