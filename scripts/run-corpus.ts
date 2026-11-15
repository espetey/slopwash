/**
 * Run the corpus measures harness (build spec section 4, Item C0).
 * This is the tool the second proof run runs on.
 *
 * Usage: npx tsx scripts/run-corpus.ts <folder> [--embedder local]
 *
 * The folder holds manifest.json:
 *   { pieces: [{ file, genre, period, title? }],
 *     baselinePeriods?: string[] }
 * and the piece text files it names. Baseline periods default to the
 * first two distinct periods, in manifest order, per genre.
 *
 * Writes measures.json and summary.md into the folder.
 */
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import {
  measureCorpus,
  type CorpusPiece,
  type GenreMeasures,
} from "../lib/corpus/measures";
import {
  baselineFromMeasures,
  deriveReading,
  type Reading,
} from "../lib/corpus/readings";
import { getEmbedderFromEnv, LocalEmbedder } from "../lib/corpus/embedder";

async function main() {
  const folder = process.argv[2];
  if (!folder) {
    console.error("Usage: npx tsx scripts/run-corpus.ts <folder> [--embedder local]");
    process.exit(1);
  }
  const useEmbedder = process.argv.includes("--embedder");
  const manifest = JSON.parse(
    readFileSync(join(folder, "manifest.json"), "utf8")
  ) as {
    pieces: { file: string; genre: string; period: string; title?: string }[];
    baselinePeriods?: string[];
  };

  const pieces: CorpusPiece[] = manifest.pieces.map((p) => ({
    genre: p.genre,
    period: p.period,
    title: p.title,
    text: readFileSync(join(folder, p.file), "utf8"),
  }));

  const embedder = useEmbedder
    ? getEmbedderFromEnv() ?? new LocalEmbedder()
    : null;
  const measures = await measureCorpus(pieces, { embedder });

  const periodsInOrder: string[] = [];
  for (const p of manifest.pieces) {
    if (!periodsInOrder.includes(p.period)) periodsInOrder.push(p.period);
  }
  const baselinePeriods =
    manifest.baselinePeriods ?? periodsInOrder.slice(0, 2);

  const byGenre = new Map<string, GenreMeasures[]>();
  for (const m of measures) {
    const list = byGenre.get(m.genre) ?? [];
    list.push(m);
    byGenre.set(m.genre, list);
  }

  const summary: string[] = ["# Corpus measures summary", ""];
  const readingsOut: Reading[] = [];
  for (const [genre, sets] of [...byGenre.entries()].sort()) {
    const baselineSets = sets.filter((s) => baselinePeriods.includes(s.period));
    const baseline = baselineFromMeasures(baselineSets);
    summary.push(`## ${genre}`, "");
    summary.push(
      `Baseline periods: ${baseline.periodsUsed.join(", ") || "none"}.`
    );
    summary.push("");
    const sorted = [...sets].sort((a, b) => a.period.localeCompare(b.period));
    let previous: GenreMeasures | null = null;
    for (const set of sorted) {
      const reading = deriveReading(set, baseline, previous);
      readingsOut.push(reading);
      summary.push(
        `- ${set.period}: ${set.pieceCount} pieces, frame load ${set.frameLoadPer1000}/1,000 words, repeated-opening share ${set.repeatedOpeningShare}, sentence-length CV median ${set.sentenceLengthCvMedian}, MATTR mean ${set.mattrMean}, score median ${set.scoreMedian}. Reading: ${reading.kind}.`
      );
      previous = set;
    }
    summary.push("");
  }

  writeFileSync(
    join(folder, "measures.json"),
    JSON.stringify({ measures, readings: readingsOut }, null, 2)
  );
  writeFileSync(join(folder, "summary.md"), summary.join("\n"));
  console.log(
    `Wrote measures.json and summary.md for ${measures.length} genre-period sets.`
  );
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
