import { createHash } from "crypto";
import { query, queryOne, withTransaction } from "@/lib/db";
import { ANALYZER_VERSION, RULESET_VERSION } from "@/lib/analyzer";
import { validateSpec, type OrgSpec } from "./types";
import type { OrgCheckResult } from "./check";

/**
 * Org storage (build spec section 3, Item B1). Orgs, immutable spec
 * versions, exemplars, and the check_runs audit trail, in the same
 * Postgres as the API keys (decision D-2).
 *
 * Check inputs are stored as a SHA-256 hash and a result summary
 * only (decision D-5, default no text). Spec version rows are never
 * updated after insert; a new setting is a new row.
 */

export interface OrgRow {
  id: string;
  name: string;
  created_at: string;
  retention_days: number;
  embeddings_opt_out: boolean;
}

export interface SpecVersionRow {
  id: string;
  org_id: string;
  version: number;
  spec: OrgSpec;
  created_by: string | null;
  created_at: string;
  note: string | null;
}

export interface ExemplarRow {
  id: string;
  org_id: string;
  title: string;
  source_url: string | null;
  text: string;
  text_hash: string;
  added_by: string | null;
  added_at: string;
}

export interface CheckRunRow {
  id: string;
  org_id: string;
  key_id: string;
  spec_version: number;
  ruleset_version: string;
  analyzer_version: string;
  surface: string;
  input_chars: number;
  input_hash: string;
  result: CheckRunSummary;
  created_at: string;
}

/** The result summary stored on a check run. No raw text, ever. */
export interface CheckRunSummary {
  score: number;
  orgScore: number;
  wordCount: number;
  perRuleCounts: Record<string, number>;
  densities: OrgCheckResult["densities"];
  orgFindingCounts: {
    termFindings: number;
    banned: number;
    replacement: number;
    required: number;
  };
}

export function hashText(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

export async function createOrg(input: {
  name: string;
  retentionDays?: number;
  embeddingsOptOut?: boolean;
}): Promise<OrgRow> {
  const rows = await query<OrgRow>(
    `INSERT INTO orgs (name, retention_days, embeddings_opt_out)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [
      input.name,
      input.retentionDays ?? 365,
      input.embeddingsOptOut ?? false,
    ]
  );
  return rows[0];
}

export async function getOrg(id: string): Promise<OrgRow | null> {
  return queryOne<OrgRow>("SELECT * FROM orgs WHERE id = $1", [id]);
}

export async function listOrgs(): Promise<OrgRow[]> {
  return query<OrgRow>("SELECT * FROM orgs ORDER BY created_at ASC");
}

export async function updateOrgSettings(
  id: string,
  input: { retentionDays?: number; embeddingsOptOut?: boolean }
): Promise<OrgRow | null> {
  const current = await getOrg(id);
  if (!current) return null;
  const rows = await query<OrgRow>(
    `UPDATE orgs SET retention_days = $2, embeddings_opt_out = $3
     WHERE id = $1
     RETURNING *`,
    [
      id,
      input.retentionDays ?? current.retention_days,
      input.embeddingsOptOut ?? current.embeddings_opt_out,
    ]
  );
  return rows[0] ?? null;
}

/**
 * Delete an org and everything stored under it, in one transaction:
 * spec versions, exemplars, check runs, corpus pieces, and corpus
 * runs are deleted; API keys keep existing with their org link
 * cleared (a key with no org behaves exactly as item 3 specced).
 */
export async function deleteOrg(id: string): Promise<boolean> {
  const org = await getOrg(id);
  if (!org) return false;
  await withTransaction(async (client) => {
    await client.query("DELETE FROM check_runs WHERE org_id = $1", [id]);
    await client.query("DELETE FROM corpus_runs WHERE org_id = $1", [id]);
    await client.query("DELETE FROM corpus_pieces WHERE org_id = $1", [id]);
    await client.query("DELETE FROM org_spec_versions WHERE org_id = $1", [
      id,
    ]);
    await client.query("DELETE FROM org_exemplars WHERE org_id = $1", [id]);
    await client.query("UPDATE api_keys SET org_id = NULL WHERE org_id = $1", [
      id,
    ]);
    await client.query("DELETE FROM orgs WHERE id = $1", [id]);
  });
  return true;
}

export async function addSpecVersion(input: {
  orgId: string;
  spec: OrgSpec;
  createdBy?: string | null;
}): Promise<SpecVersionRow> {
  const spec = validateSpec(input.spec);
  if (spec.orgId !== input.orgId) {
    throw new Error(
      `Spec orgId ${spec.orgId} does not match the org ${input.orgId}.`
    );
  }
  const rows = await query<SpecVersionRow>(
    `INSERT INTO org_spec_versions (org_id, version, spec, created_by, note)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [
      input.orgId,
      spec.version,
      JSON.stringify(spec),
      input.createdBy ?? null,
      spec.note ?? null,
    ]
  );
  return rows[0];
}

export async function getSpecVersion(
  orgId: string,
  version: number
): Promise<SpecVersionRow | null> {
  return queryOne<SpecVersionRow>(
    "SELECT * FROM org_spec_versions WHERE org_id = $1 AND version = $2",
    [orgId, version]
  );
}

export async function getLatestSpec(
  orgId: string
): Promise<SpecVersionRow | null> {
  return queryOne<SpecVersionRow>(
    `SELECT * FROM org_spec_versions
     WHERE org_id = $1
     ORDER BY version DESC
     LIMIT 1`,
    [orgId]
  );
}

export async function listSpecVersions(
  orgId: string
): Promise<SpecVersionRow[]> {
  return query<SpecVersionRow>(
    `SELECT * FROM org_spec_versions
     WHERE org_id = $1
     ORDER BY version ASC`,
    [orgId]
  );
}

export async function addExemplar(input: {
  orgId: string;
  title: string;
  sourceUrl?: string | null;
  text: string;
  addedBy?: string | null;
}): Promise<ExemplarRow> {
  const rows = await query<ExemplarRow>(
    `INSERT INTO org_exemplars (org_id, title, source_url, text, text_hash, added_by)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      input.orgId,
      input.title,
      input.sourceUrl ?? null,
      input.text,
      hashText(input.text),
      input.addedBy ?? null,
    ]
  );
  return rows[0];
}

export async function listExemplars(orgId: string): Promise<ExemplarRow[]> {
  return query<ExemplarRow>(
    "SELECT * FROM org_exemplars WHERE org_id = $1 ORDER BY added_at ASC",
    [orgId]
  );
}

export async function deleteExemplar(
  orgId: string,
  exemplarId: string
): Promise<boolean> {
  const rows = await query<{ id: string }>(
    "DELETE FROM org_exemplars WHERE org_id = $1 AND id = $2 RETURNING id",
    [orgId, exemplarId]
  );
  return rows.length > 0;
}

/** Summarize a check for the audit trail: counts and densities only. */
export function summarizeCheck(result: OrgCheckResult): CheckRunSummary {
  const perRuleCounts: Record<string, number> = {};
  for (const v of result.universal.violations) {
    perRuleCounts[v.rule] = (perRuleCounts[v.rule] ?? 0) + 1;
  }
  const term = result.org.termFindings;
  return {
    score: result.universal.score,
    orgScore: result.org.score,
    wordCount: result.universal.wordCount,
    perRuleCounts,
    densities: result.densities,
    orgFindingCounts: {
      termFindings: term.length,
      banned: term.filter((v) => v.rule === "org.banned").length,
      replacement: term.filter((v) => v.rule === "org.replacement").length,
      required: term.filter((v) => v.rule === "org.required").length,
    },
  };
}

export async function recordCheckRun(input: {
  orgId: string;
  keyId: string;
  specVersion: number;
  surface: "api" | "mcp" | "audit";
  text: string;
  result: OrgCheckResult;
}): Promise<CheckRunRow> {
  const rows = await query<CheckRunRow>(
    `INSERT INTO check_runs
       (org_id, key_id, spec_version, ruleset_version, analyzer_version,
        surface, input_chars, input_hash, result)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      input.orgId,
      input.keyId,
      input.specVersion,
      RULESET_VERSION,
      ANALYZER_VERSION,
      input.surface,
      input.text.length,
      hashText(input.text),
      JSON.stringify(summarizeCheck(input.result)),
    ]
  );
  return rows[0];
}

export async function listCheckRuns(
  orgId: string,
  limit = 50
): Promise<CheckRunRow[]> {
  return query<CheckRunRow>(
    `SELECT * FROM check_runs
     WHERE org_id = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [orgId, Math.min(Math.max(limit, 1), 500)]
  );
}
