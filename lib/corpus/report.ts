import type { CorpusRunRow } from "./store";

/**
 * The periodic corpus report (build spec section 4, Item C1),
 * rendered in the same hand as the Item A audit report. Per genre:
 * the two axes as tables across periods, the reading with its
 * numbers, the named repeated frames and openings, the floors with
 * their baseline stated, and the insufficient-data line where a
 * genre-period fell under the piece minimum.
 *
 * The report shows movement and spread. It does not grade the
 * movement: whether a drift is an improvement is the org's call
 * against its exemplars, and the report prints the exemplar
 * distance when embeddings produced one so the org can make that
 * call with the number in front of it.
 */

const MIN_PIECES = 20;

function num(value: number | null | undefined): string {
  return value === null || value === undefined ? "n/a" : String(value);
}

export function renderGenreReport(input: {
  orgName: string;
  genre: string;
  /** Runs for this org and genre, oldest first. */
  runs: CorpusRunRow[];
}): string {
  const { orgName, genre, runs } = input;
  const lines: string[] = [];
  lines.push(`# Corpus report: ${orgName}`);
  lines.push("");
  lines.push(`Genre: ${genre}`);
  lines.push("");

  if (runs.length === 0) {
    lines.push("No runs recorded for this genre yet.");
    return lines.join("\n");
  }

  lines.push("## Consistency to the voice");
  lines.push("");
  lines.push(
    "| Period | Pieces | Score median | Score Q1 | Score Q3 | Spec compliance | Mean org findings per piece |"
  );
  lines.push("| --- | --- | --- | --- | --- | --- | --- |");
  for (const run of runs) {
    const m = run.measures;
    lines.push(
      `| ${run.period} | ${m.pieceCount} | ${m.scoreMedian} | ${m.scoreQ1} | ${m.scoreQ3} | ${m.specComplianceRate === null ? "n/a" : m.specComplianceRate} | ${m.meanOrgFindingsPerPiece === null ? "n/a" : m.meanOrgFindingsPerPiece} |`
    );
  }
  lines.push("");

  lines.push("## Dispersion inside the set");
  lines.push("");
  lines.push(
    "| Period | Frame load per 1,000 words | Repeated-opening share | Sentence-length CV median | MATTR mean | Vocabulary overlap | Embedding similarity | Exemplar distance |"
  );
  lines.push("| --- | --- | --- | --- | --- | --- | --- | --- |");
  for (const run of runs) {
    const m = run.measures;
    lines.push(
      `| ${run.period} | ${m.frameLoadPer1000} | ${m.repeatedOpeningShare} | ${m.sentenceLengthCvMedian} | ${m.mattrMean} | ${m.vocabularyOverlapMean} | ${num(m.embeddingMeanPairwiseSimilarity)} | ${num(m.exemplarCentroidDistance)} |`
    );
  }
  lines.push("");

  lines.push("## Readings");
  lines.push("");
  for (const run of runs) {
    const m = run.measures;
    if (m.pieceCount < MIN_PIECES) {
      lines.push(
        `- ${run.period}: insufficient data. ${m.pieceCount} pieces in this genre-period; a reading needs ${MIN_PIECES}. Counts only, no reading issued.`
      );
      continue;
    }
    const evidence = (run.floors.readingEvidence ?? {}) as Record<
      string,
      unknown
    >;
    lines.push(
      `- ${run.period}: ${run.reading}. Frame load ${m.frameLoadPer1000} per 1,000 words, repeated-opening share ${m.repeatedOpeningShare}, sentence-length CV median ${m.sentenceLengthCvMedian}, vocabulary overlap ${m.vocabularyOverlapMean}, score median ${m.scoreMedian}. Dispersion failures: ${evidence.dispersionFailures ?? "n/a"}; center moved: ${evidence.centerMoved ?? "n/a"}.`
    );
    const baselinePeriods = (run.floors.baselinePeriods as string[]) ?? [];
    const provenance = (run.floors.baselineProvenance as string) ?? "";
    lines.push(
      `  Floors: frame load ceiling ${num(run.floors.frameLoadCeiling as number)}, repeated-opening ceiling ${num(run.floors.repeatedOpeningCeiling as number)}, sentence-length CV floor ${num(run.floors.sentenceLengthCvFloor as number)}, MATTR floor ${num(run.floors.mattrFloor as number)}, vocabulary overlap ceiling ${num(run.floors.vocabularyOverlapCeiling as number)}. Baseline: ${baselinePeriods.join(", ")} (${provenance}). Analyzer ${run.analyzer_version}, embedder ${run.embedder}, spec version ${run.spec_version ?? "none"}.`
    );
    if (m.topRepeatedOpenings.length > 0) {
      lines.push(
        `  Most repeated openings: ${m.topRepeatedOpenings
          .slice(0, 5)
          .map((o) => `"${o.opening}" (${o.pieceCount} pieces)`)
          .join(", ")}.`
      );
    }
  }
  lines.push("");
  lines.push(
    "Movement is printed, not graded. Whether a drift is an improvement is the org's call against its exemplars."
  );
  return lines.join("\n");
}
