import { query } from "@/lib/db";

/**
 * Corpus retention (build spec section 7 and decision D-4). A piece
 * is deleted once its age passes its org's current retention_days;
 * an org that sets retention to 0 days deletes its pieces at the
 * next job run. Corpus runs and their measures are kept: the
 * readings stay reproducible from the stored measures after the
 * text is gone.
 */
export async function purgeExpiredCorpusPieces(): Promise<number> {
  const rows = await query<{ count: string }>(
    `WITH deleted AS (
       DELETE FROM corpus_pieces p
       USING orgs o
       WHERE p.org_id = o.id
         AND p.ingested_at + (o.retention_days || ' days')::interval <= now()
       RETURNING p.id
     )
     SELECT COUNT(*) AS count FROM deleted`
  );
  return Number(rows[0]?.count ?? 0);
}
