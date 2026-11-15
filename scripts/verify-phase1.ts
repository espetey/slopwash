/**
 * Phase 1 acceptance check (build spec B1 and D1), run against a
 * live server backed by a real database.
 *
 * Environment: BASE_URL (default http://localhost:3100),
 * ADMIN_SECRET, DATABASE_URL.
 *
 * Flow: create a fixture org through the admin flow, add two spec
 * versions that differ in one banned term, add an exemplar, issue an
 * org key, run the same text against both versions through the API,
 * re-run version 1 and demand a byte-identical response, check the
 * anonymous response shape, run an MCP analyze_text call with the
 * key, verify check_runs and usage_events rows, then delete the org
 * and confirm its rows are gone in one transaction.
 */
import { Client } from "pg";

const BASE = process.env.BASE_URL ?? "http://localhost:3100";
const ADMIN = process.env.ADMIN_SECRET ?? "";
const DB = process.env.DATABASE_URL ?? "";

let failures = 0;
function check(label: string, ok: boolean, detail = "") {
  if (ok) console.log(`ok   ${label}`);
  else {
    failures += 1;
    console.log(`FAIL ${label}${detail ? `: ${detail}` : ""}`);
  }
}

async function call(
  path: string,
  init: RequestInit
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<{ status: number; text: string; json: any }> {
  const res = await fetch(`${BASE}${path}`, init);
  const text = await res.text();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let json: any = {};
  try {
    json = JSON.parse(text);
  } catch {
    json = {};
  }
  return { status: res.status, text, json };
}

const adminHeaders = {
  "content-type": "application/json",
  "x-admin-secret": ADMIN,
};

async function main() {
  if (!ADMIN || !DB) {
    console.error("ADMIN_SECRET and DATABASE_URL must be set.");
    process.exit(1);
  }
  const db = new Client({ connectionString: DB });
  await db.connect();

  // Fixture org through the admin flow.
  const orgRes = await call("/api/admin/orgs", {
    method: "POST",
    headers: adminHeaders,
    body: JSON.stringify({ name: "Fixture Org" }),
  });
  check("create org", orgRes.status === 200, `status ${orgRes.status}`);
  const orgId = (orgRes.json as { id: string }).id;

  const specBase = {
    orgId,
    createdAt: "2026-11-14T00:00:00.000Z",
    terms: { banned: [{ term: "guarantee", variants: "inflect" }], required: [], replacements: [] },
    rules: { disabled: [], severityOverrides: {} },
  };
  const v1 = await call(`/api/admin/orgs/${orgId}/specs`, {
    method: "POST",
    headers: adminHeaders,
    body: JSON.stringify({ spec: { ...specBase, version: 1 } }),
  });
  check("add spec version 1", v1.status === 200, `status ${v1.status}: ${v1.text}`);
  const v2 = await call(`/api/admin/orgs/${orgId}/specs`, {
    method: "POST",
    headers: adminHeaders,
    body: JSON.stringify({
      spec: {
        ...specBase,
        version: 2,
        terms: {
          banned: [
            { term: "guarantee", variants: "inflect" },
            { term: "synergy", variants: "inflect" },
          ],
          required: [],
          replacements: [],
        },
      },
    }),
  });
  check("add spec version 2", v2.status === 200, `status ${v2.status}: ${v2.text}`);
  const v1again = await call(`/api/admin/orgs/${orgId}/specs`, {
    method: "POST",
    headers: adminHeaders,
    body: JSON.stringify({ spec: { ...specBase, version: 1 } }),
  });
  check("duplicate version refused with 409", v1again.status === 409, `status ${v1again.status}`);

  const exemplar = await call(`/api/admin/orgs/${orgId}/exemplars`, {
    method: "POST",
    headers: adminHeaders,
    body: JSON.stringify({
      title: "Fixture exemplar",
      text: "The warranty covers parts and labor for two years. Keep the receipt.",
    }),
  });
  check("add exemplar", exemplar.status === 200, `status ${exemplar.status}`);

  const draft = await call(`/api/admin/orgs/${orgId}/spec-draft`, {
    method: "POST",
    headers: adminHeaders,
    body: JSON.stringify({}),
  });
  check(
    "spec draft aid answers",
    draft.status === 200 && (draft.json as { exemplarCount: number }).exemplarCount === 1,
    `status ${draft.status}`
  );

  const keyRes = await call("/api/admin/keys", {
    method: "POST",
    headers: adminHeaders,
    body: JSON.stringify({ name: "Fixture key", tier: "pro", org_id: orgId }),
  });
  check("issue org key", keyRes.status === 200, `status ${keyRes.status}`);
  const plaintext = (keyRes.json as { key: string }).key;
  const keyId = (keyRes.json as { id: string }).id;

  const text =
    "Every unit is guaranteed for two full years. Our synergy with regional partners grows each quarter. The housing is cast and the seals are seated by hand.";
  const keyHeaders = {
    "content-type": "application/json",
    authorization: `Bearer ${plaintext}`,
  };

  const run1 = await call("/api/score", {
    method: "POST",
    headers: keyHeaders,
    body: JSON.stringify({ text, spec_version: 1 }),
  });
  const run1Json = run1.json as {
    org_spec_version?: number;
    org_findings?: { term_findings: unknown[] };
    analyzer_version?: string;
    ruleset_version?: string;
  };
  check(
    "API v1 names spec version 1",
    run1.status === 200 && run1Json.org_spec_version === 1,
    `status ${run1.status}: ${run1.text.slice(0, 200)}`
  );
  check(
    "API v1 org findings: one banned hit",
    run1Json.org_findings?.term_findings.length === 1,
    JSON.stringify(run1Json.org_findings?.term_findings)
  );
  check(
    "API v1 carries instrument versions",
    run1Json.analyzer_version === "1.0.0" && run1Json.ruleset_version === "1.0"
  );

  const run2 = await call("/api/score", {
    method: "POST",
    headers: keyHeaders,
    body: JSON.stringify({ text, spec_version: 2 }),
  });
  const run2Json = run2.json as {
    org_spec_version?: number;
    org_findings?: { term_findings: unknown[] };
  };
  check(
    "API v2 names spec version 2 with two banned hits",
    run2.status === 200 &&
      run2Json.org_spec_version === 2 &&
      run2Json.org_findings?.term_findings.length === 2,
    `status ${run2.status}: ${run2.text.slice(0, 200)}`
  );

  const run1Repeat = await call("/api/score", {
    method: "POST",
    headers: keyHeaders,
    body: JSON.stringify({ text, spec_version: 1 }),
  });
  check(
    "version 1 output reproduces byte-for-byte after version 2 exists",
    run1Repeat.text === run1.text
  );

  const anon = await call("/api/score", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ text }),
  });
  const anonKeys = Object.keys(anon.json as object).sort();
  check(
    "anonymous response shape is the pre-change shape plus two version fields",
    anon.status === 200 &&
      JSON.stringify(anonKeys) ===
        JSON.stringify([
          "analyzer_version",
          "categories",
          "ruleset_version",
          "score",
          "word_count",
        ]),
    `keys ${anonKeys.join(",")}`
  );

  // MCP analyze_text with the key header.
  const mcp = await call("/api/mcp", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json, text/event-stream",
      authorization: `Bearer ${plaintext}`,
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: { name: "analyze_text", arguments: { text } },
    }),
  });
  const mcpText =
    (mcp.json as { result?: { content?: { text?: string }[] } }).result
      ?.content?.[0]?.text ?? "";
  check(
    "MCP analyze_text with key prints the spec version line",
    mcp.status === 200 && mcpText.includes("spec version 2"),
    mcpText.slice(0, 300)
  );

  // Database rows.
  const runs = await db.query(
    "SELECT surface, spec_version FROM check_runs WHERE org_id = $1 ORDER BY created_at ASC",
    [orgId]
  );
  check(
    "check_runs holds one row per org call with matching versions",
    runs.rows.length === 4 &&
      runs.rows.map((r) => `${r.surface}:${r.spec_version}`).join(",") ===
        "api:1,api:2,api:1,mcp:2",
    JSON.stringify(runs.rows)
  );
  const usage = await db.query(
    "SELECT spec_version, org_id FROM usage_events WHERE key_id = $1 AND endpoint = 'score'",
    [keyId]
  );
  check(
    "usage_events rows carry org and spec version",
    usage.rows.length === 4 &&
      usage.rows.every((r) => r.org_id === orgId) &&
      usage.rows.map((r) => r.spec_version).sort().join(",") === "1,1,2,2",
    JSON.stringify(usage.rows)
  );

  // Delete the org: everything under it goes in one transaction.
  const del = await call("/api/admin/orgs", {
    method: "DELETE",
    headers: adminHeaders,
    body: JSON.stringify({ id: orgId }),
  });
  check("delete org", del.status === 200, `status ${del.status}`);
  const counts = await db.query(
    `SELECT
       (SELECT COUNT(*) FROM org_spec_versions WHERE org_id = $1) AS specs,
       (SELECT COUNT(*) FROM org_exemplars WHERE org_id = $1) AS exemplars,
       (SELECT COUNT(*) FROM check_runs WHERE org_id = $1) AS runs,
       (SELECT org_id FROM api_keys WHERE id = $2) AS key_org`,
    [orgId, keyId]
  );
  const row = counts.rows[0];
  check(
    "spec versions, exemplars, and check runs gone; key org link cleared",
    row.specs === "0" && row.exemplars === "0" && row.runs === "0" && row.key_org === null,
    JSON.stringify(row)
  );

  await db.end();
  if (failures > 0) {
    console.error(`${failures} checks failed.`);
    process.exit(1);
  }
  console.log("All Phase 1 checks pass.");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
