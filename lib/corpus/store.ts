import { query, queryOne } from "@/lib/db";
import { ANALYZER_VERSION } from "@/lib/analyzer";
import { logUsageEvent } from "@/lib/api/metering";
import { getLatestSpec, listExemplars } from "@/lib/org-spec/store";
import { listPieces } from "./ingest";
import {
  measureGenreSet,
  type GenreMeasures,
} from "./measures";
import {
  baselineFromMeasures,
  deriveReading,
  type Reading,
} from "./readings";
import { getEmbedderFromEnv, type Embedder } from "./embedder";

/**
 * Corpus runs (build spec section 4, Item C1). Closing a period is
 * an explicit call: for each genre in the period, compute measures
 * with the C0 harness code, derive floors from stored prior periods
 * of the same org and genre, write one corpus_runs row, and meter
 * one corpus read (a usage_events row with endpoint corpus_run and
 * input_chars set to the total characters ingested for that org,
 * genre, and period).
 *
 * The first period a genre is run has no prior periods to draw
 * floors from; its floors come from its own measures and the stored
 * floors say so. Readings from a self-baseline are a starting point,
 * not evidence about movement.
 */

export interface CorpusRunRow {
  id: string;
  org_id: string;
  period: string;
  genre: string;
  spec_version: number | null;
  analyzer_version: string;
  embedder: string;
  measures: GenreMeasures;
  reading: string;
  floors: Record<string, unknown>;
  created_at: string;
}

async function latestRunForPeriod(
  orgId: string,
  genre: string,
  period: string
): Promise<CorpusRunRow | null> {
  return queryOne<CorpusRunRow>(
    `SELECT * FROM corpus_runs
     WHERE org_id = $1 AND genre = $2 AND period = $3
     ORDER BY created_at DESC
     LIMIT 1`,
    [orgId, genre, period]
  );
}

async function priorPeriods(
  orgId: string,
  genre: string,
  beforePeriod: string
): Promise<string[]> {
  const rows = await query<{ period: string }>(
    `SELECT period, MIN(created_at) AS first_run
     FROM corpus_runs
     WHERE org_id = $1 AND genre = $2 AND period <> $3
     GROUP BY period
     ORDER BY first_run ASC`,
    [orgId, genre, beforePeriod]
  );
  return rows.map((r) => r.period);
}

export async function runGenrePeriod(input: {
  orgId: string;
  period: string;
  genre: string;
  keyId: string;
}): Promise<CorpusRunRow> {
  const pieces = await listPieces({
    orgId: input.orgId,
    period: input.period,
    genre: input.genre,
  });
  const specRow = await getLatestSpec(input.orgId);
  const exemplars = await listExemplars(input.orgId);

  let embedder: Embedder | null = null;
  try {
    embedder = getEmbedderFromEnv();
  } catch {
    embedder = null;
  }

  let measures: GenreMeasures;
  try {
    measures = await measureGenreSet(
      pieces.map((p) => ({
        genre: p.genre,
        period: p.period,
        title: p.title ?? undefined,
        text: p.text,
      })),
      {
        spec: specRow?.spec ?? null,
        embedder,
        exemplarTexts: exemplars.map((e) => e.text),
      }
    );
  } catch {
    // An embedder that cannot run in this environment must not take
    // the deterministic measures down with it.
    measures = await measureGenreSet(
      pieces.map((p) => ({
        genre: p.genre,
        period: p.period,
        title: p.title ?? undefined,
        text: p.text,
      })),
      { spec: specRow?.spec ?? null, embedder: null }
    );
    embedder = null;
  }

  const priors = await priorPeriods(input.orgId, input.genre, input.period);
  const baselinePeriodLabels = priors.slice(0, 2);
  const baselineSets: GenreMeasures[] = [];
  for (const label of baselinePeriodLabels) {
    const run = await latestRunForPeriod(input.orgId, input.genre, label);
    if (run) baselineSets.push(run.measures);
  }
  const selfBaseline = baselineSets.length === 0;
  const baseline = baselineFromMeasures(
    selfBaseline ? [measures] : baselineSets
  );

  let previous: GenreMeasures | null = null;
  if (priors.length > 0) {
    const prevRun = await latestRunForPeriod(
      input.orgId,
      input.genre,
      priors[priors.length - 1]
    );
    previous = prevRun?.measures ?? null;
  }

  const reading: Reading = deriveReading(measures, baseline, previous);

  const floors: Record<string, unknown> = {
    ...reading.floorsUsed,
    baselinePeriods: selfBaseline
      ? [input.period]
      : baselinePeriodLabels,
    baselineProvenance: selfBaseline
      ? "this period (first period recorded for this genre)"
      : "stored prior periods of this org and genre",
    readingEvidence: reading.evidence,
  };

  const embedderName =
    embedder && measures.embeddingMeanPairwiseSimilarity !== null
      ? embedder.name
      : "none";

  const rows = await query<CorpusRunRow>(
    `INSERT INTO corpus_runs
       (org_id, period, genre, spec_version, analyzer_version, embedder,
        measures, reading, floors)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      input.orgId,
      input.period,
      input.genre,
      specRow?.version ?? null,
      ANALYZER_VERSION,
      embedderName,
      JSON.stringify(measures),
      reading.kind,
      JSON.stringify(floors),
    ]
  );
  const run = rows[0];

  const totalChars = pieces.reduce((s, p) => s + p.text.length, 0);
  await logUsageEvent({
    keyId: input.keyId,
    endpoint: "corpus_run",
    inputChars: totalChars,
    orgId: input.orgId,
    specVersion: specRow?.version ?? null,
  }).catch(() => undefined);

  return run;
}

export async function runPeriod(input: {
  orgId: string;
  period: string;
  keyId: string;
}): Promise<CorpusRunRow[]> {
  const pieces = await listPieces({ orgId: input.orgId, period: input.period });
  const genres = [...new Set(pieces.map((p) => p.genre))].sort();
  const runs: CorpusRunRow[] = [];
  for (const genre of genres) {
    runs.push(
      await runGenrePeriod({
        orgId: input.orgId,
        period: input.period,
        genre,
        keyId: input.keyId,
      })
    );
  }
  return runs;
}

export async function getRun(id: string): Promise<CorpusRunRow | null> {
  return queryOne<CorpusRunRow>("SELECT * FROM corpus_runs WHERE id = $1", [
    id,
  ]);
}

export async function listRuns(input: {
  orgId: string;
  genre?: string;
}): Promise<CorpusRunRow[]> {
  if (input.genre) {
    return query<CorpusRunRow>(
      `SELECT * FROM corpus_runs
       WHERE org_id = $1 AND genre = $2
       ORDER BY created_at ASC`,
      [input.orgId, input.genre]
    );
  }
  return query<CorpusRunRow>(
    `SELECT * FROM corpus_runs
     WHERE org_id = $1
     ORDER BY created_at ASC`,
    [input.orgId]
  );
}
