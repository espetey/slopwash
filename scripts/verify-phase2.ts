/**
 * Phase 2 acceptance check (build spec C1 and D2), run against a
 * live server backed by a real database.
 *
 * Environment: BASE_URL (default http://localhost:3100),
 * ADMIN_SECRET, DATABASE_URL.
 *
 * Flow: load the C0 fixture sets as two periods of a fixture org
 * through the API ingest path, close both periods, confirm the
 * stored measures reproduce the harness numbers for the same texts,
 * confirm the report prints the collapse reading for the templated
 * period with floors and baseline named, confirm the corpus_run
 * usage rows and character totals, confirm a 12-piece genre renders
 * its insufficient-data line, confirm a key without the corpus scope
 * gets 403 and writes nothing, exercise the MCP corpus tools, then
 * set retention to 0 days, run the retention job, and confirm the
 * pieces are deleted while the runs and measures remain.
 */
import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import { Client } from "pg";
import { measureGenreSet, type CorpusPiece } from "../lib/corpus/measures";

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

function loadFolder(dir: string): { file: string; text: string }[] {
  return readdirSync(dir)
    .filter((f) => f.endsWith(".txt"))
    .sort()
    .map((f) => ({ file: f, text: readFileSync(join(dir, f), "utf8") }));
}

async function main() {
  if (!ADMIN || !DB) {
    console.error("ADMIN_SECRET and DATABASE_URL must be set.");
    process.exit(1);
  }
  const db = new Client({ connectionString: DB });
  await db.connect();

  const orgRes = await call("/api/admin/orgs", {
    method: "POST",
    headers: adminHeaders,
    body: JSON.stringify({ name: "Corpus Fixture Org" }),
  });
  const orgId = orgRes.json.id as string;
  check("create org", orgRes.status === 200, `status ${orgRes.status}`);

  const specRes = await call(`/api/admin/orgs/${orgId}/specs`, {
    method: "POST",
    headers: adminHeaders,
    body: JSON.stringify({
      spec: {
        orgId,
        version: 1,
        createdAt: "2026-11-14T00:00:00.000Z",
        terms: { banned: [], required: [], replacements: [] },
        rules: { disabled: [], severityOverrides: {} },
      },
    }),
  });
  check("add spec version 1", specRes.status === 200, specRes.text);

  const corpusKeyRes = await call("/api/admin/keys", {
    method: "POST",
    headers: adminHeaders,
    body: JSON.stringify({
      name: "Corpus key",
      tier: "pro",
      org_id: orgId,
      scopes: ["score", "corpus"],
    }),
  });
  const corpusKey = corpusKeyRes.json.key as string;
  const corpusKeyId = corpusKeyRes.json.id as string;
  const plainKeyRes = await call("/api/admin/keys", {
    method: "POST",
    headers: adminHeaders,
    body: JSON.stringify({
      name: "Plain key",
      tier: "pro",
      org_id: orgId,
      scopes: ["score"],
    }),
  });
  const plainKey = plainKeyRes.json.key as string;
  check("issue keys", Boolean(corpusKey && plainKey));

  const corpusHeaders = {
    "content-type": "application/json",
    authorization: `Bearer ${corpusKey}`,
  };
  const plainHeaders = {
    "content-type": "application/json",
    authorization: `Bearer ${plainKey}`,
  };

  const fixtureRoot = join(process.cwd(), "tests/fixtures/corpus");
  const varied = loadFolder(join(fixtureRoot, "varied"));
  const templated = loadFolder(join(fixtureRoot, "templated"));

  let q3Chars = 0;
  let q4Chars = 0;
  for (const piece of varied) {
    const res = await call("/api/corpus/pieces", {
      method: "POST",
      headers: corpusHeaders,
      body: JSON.stringify({
        period: "2026-Q3",
        genre: "blog post",
        title: piece.file,
        text: piece.text,
      }),
    });
    if (res.status !== 200) {
      check(`ingest varied ${piece.file}`, false, res.text);
    } else q3Chars += res.json.chars as number;
  }
  for (const piece of templated) {
    const res = await call("/api/corpus/pieces", {
      method: "POST",
      headers: corpusHeaders,
      body: JSON.stringify({
        period: "2026-Q4",
        genre: "blog post",
        title: piece.file,
        text: piece.text,
      }),
    });
    if (res.status !== 200) {
      check(`ingest templated ${piece.file}`, false, res.text);
    } else q4Chars += res.json.chars as number;
  }
  check("ingested 48 fixture pieces", q3Chars > 0 && q4Chars > 0);

  const dup = await call("/api/corpus/pieces", {
    method: "POST",
    headers: corpusHeaders,
    body: JSON.stringify({
      period: "2026-Q4",
      genre: "blog post",
      title: "duplicate",
      text: templated[0].text,
    }),
  });
  check(
    "duplicate text refused with 409 and the existing piece named",
    dup.status === 409 && typeof dup.json.existing_piece_id === "string",
    `status ${dup.status}: ${dup.text.slice(0, 160)}`
  );

  const scopeRes = await call("/api/corpus/pieces", {
    method: "POST",
    headers: plainHeaders,
    body: JSON.stringify({
      period: "2026-Q4",
      genre: "blog post",
      title: "should not land",
      text: "A short piece that must never be stored.",
    }),
  });
  check("key without corpus scope gets 403", scopeRes.status === 403, `status ${scopeRes.status}`);
  const pieceCount = await db.query(
    "SELECT COUNT(*) AS n FROM corpus_pieces WHERE org_id = $1",
    [orgId]
  );
  check(
    "the 403 wrote nothing",
    pieceCount.rows[0].n === "48",
    `count ${pieceCount.rows[0].n}`
  );

  const runQ3 = await call("/api/corpus/runs", {
    method: "POST",
    headers: corpusHeaders,
    body: JSON.stringify({ period: "2026-Q3" }),
  });
  const runQ4 = await call("/api/corpus/runs", {
    method: "POST",
    headers: corpusHeaders,
    body: JSON.stringify({ period: "2026-Q4" }),
  });
  check(
    "both periods close with one blog post run each",
    runQ3.status === 200 &&
      runQ4.status === 200 &&
      runQ3.json.runs.length === 1 &&
      runQ4.json.runs.length === 1,
    `${runQ3.text.slice(0, 120)} / ${runQ4.text.slice(0, 120)}`
  );
  const q4RunId = runQ4.json.runs[0].id as string;

  // Stored measures reproduce the harness numbers for the same texts.
  const harnessTemplated = await measureGenreSet(
    templated.map(
      (p): CorpusPiece => ({ genre: "blog post", period: "2026-Q4", text: p.text.trim() })
    )
  );
  const reportRes = await call(`/api/corpus/reports/${q4RunId}`, {
    headers: corpusHeaders,
  });
  const stored = reportRes.json.measures;
  const fields = [
    "pieceCount",
    "frameLoadPer1000",
    "repeatedOpeningShare",
    "sentenceLengthCvMedian",
    "mattrMean",
    "vocabularyOverlapMean",
    "scoreMedian",
  ] as const;
  const mismatch = fields.filter(
    (f) => stored[f] !== harnessTemplated[f]
  );
  check(
    "stored run reproduces the harness numbers",
    reportRes.status === 200 && mismatch.length === 0,
    `mismatch: ${mismatch.map((f) => `${f} stored ${stored[f]} harness ${harnessTemplated[f]}`).join("; ")}`
  );
  check(
    "stored reading for the templated period is collapse",
    reportRes.json.run.reading === "collapse",
    reportRes.json.run.reading
  );
  check(
    "floors name the baseline period",
    JSON.stringify(reportRes.json.floors.baselinePeriods) === '["2026-Q3"]',
    JSON.stringify(reportRes.json.floors.baselinePeriods)
  );
  check(
    "report prints the collapse reading with floors and named openings",
    reportRes.json.report.includes("collapse") &&
      reportRes.json.report.includes("Baseline: 2026-Q3") &&
      reportRes.json.report.includes("Most repeated openings"),
    (reportRes.json.report as string).slice(0, 200)
  );

  const usage = await db.query(
    `SELECT input_chars, org_id FROM usage_events
     WHERE key_id = $1 AND endpoint = 'corpus_run' ORDER BY ts ASC`,
    [corpusKeyId]
  );
  check(
    "one corpus_run usage row per genre-period with the right character totals",
    usage.rows.length === 2 &&
      usage.rows[0].input_chars === q3Chars &&
      usage.rows[1].input_chars === q4Chars &&
      usage.rows.every((r) => r.org_id === orgId),
    JSON.stringify(usage.rows)
  );

  // A 12-piece genre renders its insufficient-data line. The pieces
  // go in under their own period label: the same texts in the same
  // period would be duplicates (the duplicate key is org, period,
  // and text, with no genre term, per the spec).
  for (const piece of templated.slice(0, 12)) {
    await call("/api/corpus/pieces", {
      method: "POST",
      headers: corpusHeaders,
      body: JSON.stringify({
        period: "2026-Q1",
        genre: "help article",
        title: piece.file,
        text: piece.text,
      }),
    });
  }
  const runQ1 = await call("/api/corpus/runs", {
    method: "POST",
    headers: corpusHeaders,
    body: JSON.stringify({ period: "2026-Q1" }),
  });
  const helpRun = (runQ1.json.runs as { id: string; genre: string }[]).find(
    (r) => r.genre === "help article"
  );
  check("help article run exists", Boolean(helpRun));
  const helpReport = await call(`/api/corpus/reports/${helpRun!.id}`, {
    headers: corpusHeaders,
  });
  check(
    "12-piece genre renders its insufficient-data line",
    (helpReport.json.report as string).includes(
      "insufficient data. 12 pieces"
    ),
    (helpReport.json.report as string).slice(0, 300)
  );

  // MCP corpus tools.
  async function mcpCall(
    key: string,
    name: string,
    args: Record<string, unknown>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): Promise<any> {
    const res = await call("/api/mcp", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json, text/event-stream",
        authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: { name, arguments: args },
      }),
    });
    return res.json;
  }
  const mcpSubmit = await mcpCall(corpusKey, "submit_corpus_piece", {
    period: "2026-Q4",
    genre: "sales page",
    title: "MCP piece",
    text: "A short sales page submitted through the MCP tool for the fixture org.",
  });
  check(
    "MCP submit_corpus_piece works with the corpus key",
    Boolean(mcpSubmit.result?.content?.[0]?.text?.includes('"id"')),
    JSON.stringify(mcpSubmit).slice(0, 200)
  );
  const mcpDenied = await mcpCall(plainKey, "submit_corpus_piece", {
    period: "2026-Q4",
    genre: "sales page",
    title: "denied",
    text: "This piece must not land.",
  });
  check(
    "MCP submit without the corpus scope is an error",
    mcpDenied.result?.isError === true,
    JSON.stringify(mcpDenied).slice(0, 200)
  );
  const mcpRun = await mcpCall(corpusKey, "run_corpus_read", {
    period: "2026-Q4",
  });
  const mcpRunText = mcpRun.result?.content?.[0]?.text ?? "";
  check(
    "MCP run_corpus_read returns the sales page run",
    mcpRunText.includes("sales page"),
    mcpRunText.slice(0, 200)
  );
  const salesRunId = (
    JSON.parse(mcpRunText) as { run_id: string; genre: string }[]
  ).find((r) => r.genre === "sales page")?.run_id;
  const mcpReport = await mcpCall(corpusKey, "get_corpus_report", {
    run_id: salesRunId,
  });
  check(
    "MCP get_corpus_report renders the genre report",
    (mcpReport.result?.content?.[0]?.text ?? "").includes(
      "Genre: sales page"
    ),
    JSON.stringify(mcpReport).slice(0, 200)
  );

  // Retention at 0 days deletes piece text and keeps run measures.
  const patch = await call("/api/admin/orgs", {
    method: "PATCH",
    headers: adminHeaders,
    body: JSON.stringify({ id: orgId, retention_days: 0 }),
  });
  check("set retention to 0 days", patch.status === 200, patch.text);
  const runsBefore = await db.query(
    "SELECT COUNT(*) AS n FROM corpus_runs WHERE org_id = $1",
    [orgId]
  );
  const job = await call("/api/admin/jobs", {
    method: "POST",
    headers: adminHeaders,
    body: JSON.stringify({ job: "corpus-retention" }),
  });
  check(
    "retention job deletes all 61 pieces",
    job.status === 200 && job.json.deleted === 61,
    `status ${job.status}: ${job.text}`
  );
  const after = await db.query(
    `SELECT
       (SELECT COUNT(*) FROM corpus_pieces WHERE org_id = $1) AS pieces,
       (SELECT COUNT(*) FROM corpus_runs WHERE org_id = $1) AS runs`,
    [orgId]
  );
  check(
    "pieces gone, runs and measures intact",
    after.rows[0].pieces === "0" &&
      after.rows[0].runs === runsBefore.rows[0].n,
    JSON.stringify(after.rows[0])
  );
  const intact = await call(`/api/corpus/reports/${q4RunId}`, {
    headers: corpusHeaders,
  });
  check(
    "report still renders from stored measures after retention",
    intact.status === 200 && intact.json.measures.frameLoadPer1000 === harnessTemplated.frameLoadPer1000,
    `status ${intact.status}`
  );

  await db.end();
  if (failures > 0) {
    console.error(`${failures} checks failed.`);
    process.exit(1);
  }
  console.log("All Phase 2 checks pass.");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
