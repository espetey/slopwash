/**
 * Item A acceptance check (build spec section 2). Rebuilds the first
 * proof run from fixtures and demands exact reproduction: the
 * analyzer is deterministic, so any mismatch is a bug in the tool.
 *
 * Usage: npx tsx scripts/verify-audit-fixtures.ts
 * Exits non-zero on any mismatch.
 */
import { readFileSync } from "fs";
import { join } from "path";
import { buildAuditReport } from "../lib/audit/report";
import type { AuditPieceInput } from "../lib/audit/types";

const FIXTURE_DIR = join(
  process.cwd(),
  "tests/fixtures/proof-run-1"
);

/** The proof run's fixed-test judgments, per text. */
const EXPECTED_TERM_CLEAN: Record<string, boolean> = {
  a1: true,
  a2: true,
  a3: false,
  a4: true,
  a5: false,
  a6: false,
  a7: true,
  a8: true,
  c1: true,
  c2: true,
  c3: true,
};

interface ManifestEntry {
  id: string;
  file?: string;
  title: string;
  genre: string;
  sourceUrl: string;
  expectedScore: number;
  expectedViolations: number;
  expectedWords: number;
}

function entryFile(entry: ManifestEntry): string {
  return entry.file ?? `${entry.id}.txt`;
}

function main() {
  const rawManifest = JSON.parse(
    readFileSync(join(FIXTURE_DIR, "manifest.json"), "utf8")
  ) as { pieces: ManifestEntry[] } | ManifestEntry[];
  const entries = Array.isArray(rawManifest)
    ? rawManifest
    : rawManifest.pieces;
  const manifest = { pieces: entries };

  const pieces: AuditPieceInput[] = manifest.pieces.map((entry) => ({
    title: entry.title,
    source: entry.sourceUrl,
    genre: entry.genre,
    text: readFileSync(join(FIXTURE_DIR, entryFile(entry)), "utf8"),
  }));

  const report = buildAuditReport(pieces, null, {
    clientLabel: "Proof run 1 fixtures",
    sampleSource: "Fixture reconstruction of first-proof-run-2026-11-14.md",
    date: "2026-11-14",
  });

  let failures = 0;
  manifest.pieces.forEach((entry: ManifestEntry, i: number) => {
    const result = report.pieces[i];
    const problems: string[] = [];
    if (result.score !== entry.expectedScore) {
      problems.push(`score ${result.score} != expected ${entry.expectedScore}`);
    }
    if (result.analysis.violations.length !== entry.expectedViolations) {
      problems.push(
        `violations ${result.analysis.violations.length} != expected ${entry.expectedViolations}`
      );
    }
    if (result.wordCount !== entry.expectedWords) {
      problems.push(
        `words ${result.wordCount} != expected ${entry.expectedWords}`
      );
    }
    const expectedClean = EXPECTED_TERM_CLEAN[entry.id];
    if (result.termCheck.clean !== expectedClean) {
      problems.push(
        `term check clean=${result.termCheck.clean} != expected ${expectedClean} (hits: ${result.termCheck.hits.map((h) => h.term).join(", ") || "none"})`
      );
    }
    if (problems.length > 0) {
      failures += 1;
      console.log(`FAIL ${entry.id} (${entry.title}): ${problems.join("; ")}`);
    } else {
      console.log(
        `ok   ${entry.id}: score ${result.score}, violations ${result.analysis.violations.length}, words ${result.wordCount}, term check ${result.termCheck.clean ? "clean" : "partial"}`
      );
    }
  });

  if (failures > 0) {
    console.error(`${failures} of ${manifest.pieces.length} fixtures failed.`);
    process.exit(1);
  }
  console.log(`All ${manifest.pieces.length} fixtures reproduce the proof run.`);
}

main();
