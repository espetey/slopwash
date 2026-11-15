/**
 * Run an audit engagement (build spec section 2, Item A).
 *
 * Usage: npx tsx scripts/run-audit.ts <engagement-folder>
 *
 * The folder holds:
 *   engagement.json  { clientLabel, sampleSource, date, genre? }
 *   spec.json        optional, an OrgSpec (Item B0)
 *   pieces/          .txt or .md files, one per piece
 *   pieces/manifest.json  optional per-piece { file, title, source, genre }
 *
 * Writes report.md and report.json into the engagement folder.
 */
import { readFileSync, readdirSync, writeFileSync, existsSync } from "fs";
import { join, basename } from "path";
import {
  buildAuditReport,
  renderAuditMarkdown,
} from "../lib/audit/report";
import { validateSpec } from "../lib/org-spec/types";
import type { AuditPieceInput } from "../lib/audit/types";

function readJson(path: string): Record<string, unknown> {
  return JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;
}

function main() {
  const folder = process.argv[2];
  if (!folder) {
    console.error("Usage: npx tsx scripts/run-audit.ts <engagement-folder>");
    process.exit(1);
  }
  const engagement = readJson(join(folder, "engagement.json"));
  const piecesDir = join(folder, "pieces");
  const manifestPath = join(piecesDir, "manifest.json");
  const manifest = existsSync(manifestPath)
    ? (readJson(manifestPath).pieces as Record<string, unknown>[]) ?? []
    : [];
  const byFile = new Map(manifest.map((m) => [m.file as string, m]));

  const files = readdirSync(piecesDir)
    .filter((f) => (f.endsWith(".txt") || f.endsWith(".md")) && f !== "manifest.json")
    .sort();
  const pieces: AuditPieceInput[] = files.map((file) => {
    const meta = byFile.get(file);
    return {
      title: (meta?.title as string) ?? basename(file).replace(/\.(txt|md)$/, ""),
      source: (meta?.source as string) ?? file,
      genre:
        (meta?.genre as string) ??
        (engagement.genre as string) ??
        "blog post",
      text: readFileSync(join(piecesDir, file), "utf8"),
    };
  });

  const specPath = join(folder, "spec.json");
  const spec = existsSync(specPath) ? validateSpec(readJson(specPath)) : null;

  const report = buildAuditReport(pieces, spec, {
    clientLabel: (engagement.clientLabel as string) ?? "Unnamed client",
    sampleSource: (engagement.sampleSource as string) ?? "Sample as supplied",
    date: (engagement.date as string) ?? new Date().toISOString().slice(0, 10),
  });

  writeFileSync(join(folder, "report.md"), renderAuditMarkdown(report));
  writeFileSync(join(folder, "report.json"), JSON.stringify(report, null, 2));
  console.log(
    `Wrote report.md and report.json: ${report.totals.piecesRead} pieces, ${report.totals.piecesWithFindings} with findings, ${report.totals.piecesTermCheckClean} term-check clean.`
  );
}

main();
