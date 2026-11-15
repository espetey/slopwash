/**
 * Phase 3 verification: the org console page serves, and its two
 * admin corpus read routes return the summary and the rendered
 * report behind ADMIN_SECRET. The console itself is a thin client
 * over the admin and corpus APIs verified in Phases 1 and 2; the
 * checks here cover the routes that exist only for the console.
 *
 * Environment: BASE_URL (default http://localhost:3100),
 * ADMIN_SECRET, DATABASE_URL (unused directly; kept for symmetry).
 */
const BASE = process.env.BASE_URL ?? "http://localhost:3100";
const ADMIN = process.env.ADMIN_SECRET ?? "";

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
  if (!ADMIN) {
    console.error("ADMIN_SECRET must be set.");
    process.exit(1);
  }

  const page = await fetch(`${BASE}/admin/orgs`);
  const pageHtml = await page.text();
  check(
    "console page serves with the gate copy",
    page.status === 200 &&
      pageHtml.includes("Org console") &&
      pageHtml.includes("item 3c"),
    `status ${page.status}`
  );

  const orgRes = await call("/api/admin/orgs", {
    method: "POST",
    headers: adminHeaders,
    body: JSON.stringify({ name: "Console Fixture Org" }),
  });
  const orgId = orgRes.json.id as string;
  check("create org", orgRes.status === 200, orgRes.text);

  const keyRes = await call("/api/admin/keys", {
    method: "POST",
    headers: adminHeaders,
    body: JSON.stringify({
      name: "Console corpus key",
      tier: "pro",
      org_id: orgId,
      scopes: ["score", "corpus"],
    }),
  });
  const key = keyRes.json.key as string;
  const keyHeaders = {
    "content-type": "application/json",
    authorization: `Bearer ${key}`,
  };

  for (let i = 0; i < 3; i++) {
    await call("/api/corpus/pieces", {
      method: "POST",
      headers: keyHeaders,
      body: JSON.stringify({
        period: "2026-Q4",
        genre: "blog post",
        title: `Piece ${i + 1}`,
        text: `Console fixture piece ${i + 1}. The update ships on Friday and the notes cover setup, billing, and reports for the whole team.`,
      }),
    });
  }
  const runRes = await call("/api/corpus/runs", {
    method: "POST",
    headers: keyHeaders,
    body: JSON.stringify({ period: "2026-Q4" }),
  });
  const runId = runRes.json.runs?.[0]?.id as string;
  check("period run through the keyed route", Boolean(runId), runRes.text);

  const summary = await call(`/api/admin/orgs/${orgId}/corpus`, {
    headers: adminHeaders,
  });
  check(
    "admin corpus summary lists the piece group and the run",
    summary.status === 200 &&
      summary.json.piece_groups?.[0]?.pieces === 3 &&
      summary.json.runs?.[0]?.id === runId,
    `status ${summary.status}: ${summary.text.slice(0, 200)}`
  );

  const report = await call(
    `/api/admin/orgs/${orgId}/corpus/reports/${runId}`,
    { headers: adminHeaders }
  );
  check(
    "admin corpus report renders the genre report",
    report.status === 200 &&
      (report.json.report as string).includes("Genre: blog post") &&
      (report.json.report as string).includes("insufficient data"),
    `status ${report.status}`
  );

  const denied = await call(`/api/admin/orgs/${orgId}/corpus`, {
    headers: { "x-admin-secret": "wrong-secret" },
  });
  check(
    "admin corpus routes refuse a wrong secret",
    denied.status === 401,
    `status ${denied.status}`
  );

  const crossOrg = await call(
    `/api/admin/orgs/${orgId}/corpus/reports/00000000-0000-0000-0000-000000000000`,
    { headers: adminHeaders }
  );
  check(
    "unknown run id reads as not found",
    crossOrg.status === 404,
    `status ${crossOrg.status}`
  );

  if (failures > 0) {
    console.error(`${failures} checks failed.`);
    process.exit(1);
  }
  console.log("All Phase 3 checks pass.");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
