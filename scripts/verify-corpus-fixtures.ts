/**
 * Item C0 acceptance check (build spec section 4).
 *   (a) The templated set (24 pieces from one template) reads
 *       collapse against floors set from the varied set, and the
 *       reading names the shared frames.
 *   (b) The varied set (24 pre-2023 human pieces, same genre) shows
 *       higher dispersion than the templated set on frame load,
 *       repeated openings, and richness.
 *   (c) The 11 proof run texts as one mixed set group by genre and
 *       return insufficient data for every group.
 *   Determinism: two runs over the same folders produce identical
 *   JSON, byte for byte, with embeddings off.
 *
 * Usage: npx tsx scripts/verify-corpus-fixtures.ts
 */
import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import {
  measureCorpus,
  measureGenreSet,
  type CorpusPiece,
} from "../lib/corpus/measures";
import { baselineFromMeasures, deriveReading } from "../lib/corpus/readings";

let failures = 0;
function check(label: string, ok: boolean, detail = "") {
  if (ok) {
    console.log(`ok   ${label}`);
  } else {
    failures += 1;
    console.log(`FAIL ${label}${detail ? `: ${detail}` : ""}`);
  }
}

function loadFolder(dir: string, period: string, genre: string): CorpusPiece[] {
  return readdirSync(dir)
    .filter((f) => f.endsWith(".txt"))
    .sort()
    .map((f) => ({
      genre,
      period,
      text: readFileSync(join(dir, f), "utf8"),
    }));
}

async function main() {
  const corpusDir = join(process.cwd(), "tests/fixtures/corpus");
  const templated = loadFolder(join(corpusDir, "templated"), "templated", "blog post");
  const varied = loadFolder(join(corpusDir, "varied"), "varied", "blog post");
  check("templated set has 24 pieces", templated.length === 24, `${templated.length}`);
  check("varied set has 24 pieces", varied.length === 24, `${varied.length}`);

  const templatedMeasures = await measureGenreSet(templated);
  const variedMeasures = await measureGenreSet(varied);

  check(
    "varied frame load below templated",
    variedMeasures.frameLoadPer1000 < templatedMeasures.frameLoadPer1000,
    `varied ${variedMeasures.frameLoadPer1000} vs templated ${templatedMeasures.frameLoadPer1000}`
  );
  check(
    "varied repeated-opening share below templated",
    variedMeasures.repeatedOpeningShare < templatedMeasures.repeatedOpeningShare,
    `varied ${variedMeasures.repeatedOpeningShare} vs templated ${templatedMeasures.repeatedOpeningShare}`
  );
  check(
    "varied richness above templated (set-level vocabulary overlap lower)",
    variedMeasures.vocabularyOverlapMean <
      templatedMeasures.vocabularyOverlapMean,
    `varied overlap ${variedMeasures.vocabularyOverlapMean} vs templated ${templatedMeasures.vocabularyOverlapMean}; within-piece MATTR varied ${variedMeasures.mattrMean} vs templated ${templatedMeasures.mattrMean} (reported, not the discriminator)`
  );

  const baseline = baselineFromMeasures([variedMeasures]);
  const reading = deriveReading(templatedMeasures, baseline);
  check(
    "templated set reads collapse against varied floors",
    reading.kind === "collapse",
    `reading ${reading.kind}, evidence ${JSON.stringify(reading.evidence)}`
  );
  check(
    "collapse reading names shared frames",
    reading.topRepeatedOpenings.length > 0,
    "no repeated openings recorded"
  );

  // (c) The proof run texts as one mixed set.
  const proofDir = join(process.cwd(), "tests/fixtures/proof-run-1");
  const rawManifest = JSON.parse(
    readFileSync(join(proofDir, "manifest.json"), "utf8")
  ) as
    | { pieces: { id: string; file?: string; genre: string }[] }
    | { id: string; file?: string; genre: string }[];
  const proofEntries = Array.isArray(rawManifest)
    ? rawManifest
    : rawManifest.pieces;
  const mixed: CorpusPiece[] = proofEntries.map((p) => ({
    genre: p.genre,
    period: "mixed",
    text: readFileSync(join(proofDir, p.file ?? `${p.id}.txt`), "utf8"),
  }));
  const mixedMeasures = await measureCorpus(mixed);
  check(
    "mixed set groups into at least 3 genres",
    mixedMeasures.length >= 3,
    `${mixedMeasures.length} groups`
  );
  for (const set of mixedMeasures) {
    const r = deriveReading(set, baseline);
    check(
      `mixed genre "${set.genre}" returns insufficient data`,
      r.kind === "insufficient-data" && set.pieceCount < 20,
      `reading ${r.kind} on ${set.pieceCount} pieces`
    );
  }

  // Determinism.
  const run1 = JSON.stringify(await measureCorpus([...templated, ...varied]));
  const run2 = JSON.stringify(await measureCorpus([...templated, ...varied]));
  check("two runs byte-identical with embeddings off", run1 === run2);

  if (failures > 0) {
    console.error(`${failures} checks failed.`);
    process.exit(1);
  }
  console.log("All corpus fixture checks pass.");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
