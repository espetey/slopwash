import { analyze, severityWeightSum, type Violation } from "@/lib/analyzer";
import { checkWithSpec } from "@/lib/org-spec/check";
import type { OrgSpec } from "@/lib/org-spec/types";
import { termCheck } from "./term-check";
import type {
  AuditPieceInput,
  AuditPieceResult,
  AuditReport,
} from "./types";

/**
 * buildAuditReport (build spec section 2, Item A). Runs the analyzer
 * per piece, applies the org view when the engagement carries a spec,
 * and renders the deliverable: a Markdown report and a JSON sidecar.
 *
 * Report shape follows build spec section 1, rule 1: named passages
 * and hit density lead; the headline score is printed as context on
 * its own line. The report has no verdict field and no pass/fail line.
 */

const SHAPE_RULES = new Set(["2.1", "2.2", "2.15"]);

export function buildAuditReport(
  pieces: AuditPieceInput[],
  spec: OrgSpec | null,
  meta: { clientLabel: string; sampleSource: string; date: string }
): AuditReport {
  const results: AuditPieceResult[] = pieces.map((input) => {
    if (spec) {
      const orgCheck = checkWithSpec(input.text, spec);
      const findings = [...orgCheck.org.violations, ...orgCheck.org.termFindings];
      return {
        input,
        analysis: orgCheck.universal,
        orgCheck,
        termCheck: termCheck(input.text, spec),
        findings,
        score: orgCheck.universal.score,
        wordCount: orgCheck.universal.wordCount,
        hitsPer1000Words: orgCheck.densities.org.hitsPer1000Words,
        weightedPer1000Words: orgCheck.densities.org.weightedPer1000Words,
      };
    }
    const analysis = analyze(input.text);
    const per = analysis.wordCount > 0 ? 1000 / analysis.wordCount : 0;
    return {
      input,
      analysis,
      termCheck: termCheck(input.text, null),
      findings: analysis.violations,
      score: analysis.score,
      wordCount: analysis.wordCount,
      hitsPer1000Words: Math.round(analysis.violations.length * per * 100) / 100,
      weightedPer1000Words:
        Math.round(severityWeightSum(analysis.violations) * per * 100) / 100,
    };
  });

  const ruleFrequency = new Map<string, number>();
  let shapeRepetitionCount = 0;
  for (const piece of results) {
    for (const v of piece.findings) {
      ruleFrequency.set(v.rule, (ruleFrequency.get(v.rule) ?? 0) + 1);
      if (SHAPE_RULES.has(v.rule)) shapeRepetitionCount += 1;
    }
  }

  return {
    clientLabel: meta.clientLabel,
    sampleSource: meta.sampleSource,
    date: meta.date,
    spec,
    pieces: results,
    totals: {
      piecesRead: results.length,
      piecesWithFindings: results.filter((p) => p.findings.length > 0).length,
      piecesTermCheckClean: results.filter((p) => p.termCheck.clean).length,
      shapeRepetitionCount,
      ruleFrequency: [...ruleFrequency.entries()]
        .map(([rule, count]) => ({ rule, count }))
        .sort((a, b) => b.count - a.count || a.rule.localeCompare(b.rule)),
    },
  };
}

function groupByRule(violations: Violation[]): Map<string, Violation[]> {
  const groups = new Map<string, Violation[]>();
  for (const v of violations) {
    const list = groups.get(v.rule) ?? [];
    list.push(v);
    groups.set(v.rule, list);
  }
  return groups;
}

export function renderAuditMarkdown(report: AuditReport): string {
  const lines: string[] = [];
  lines.push(`# Writing audit: ${report.clientLabel}`);
  lines.push("");
  lines.push(`Date: ${report.date}`);
  lines.push(`Sample: ${report.sampleSource}`);
  if (report.spec) {
    lines.push(
      `Org spec: ${report.spec.orgId}, version ${report.spec.version}. Findings of record are the org view; the universal score is printed as context.`
    );
  }
  lines.push("");
  lines.push("## Method");
  lines.push("");
  lines.push(
    "Each piece was read against the Slopwash ruleset, which counts AI-pattern writing: vocabulary clusters, repeated sentence shapes, rhythm, and tone markers. Findings name the passage and the rule. A second column simulates a terminology and style-guide check: it flags a term only where a banned term list states one, and it has no rule for clusters, repeated shapes, or rhythm."
  );
  lines.push("");
  lines.push("## The sample in three counts");
  lines.push("");
  lines.push(`- Pieces read: ${report.totals.piecesRead}`);
  lines.push(`- Pieces with findings: ${report.totals.piecesWithFindings}`);
  lines.push(
    `- Pieces a terminology check would pass clean: ${report.totals.piecesTermCheckClean}`
  );
  lines.push("");

  for (const piece of report.pieces) {
    lines.push(`## ${piece.input.title}`);
    lines.push("");
    lines.push(
      `Source: ${piece.input.source}. Genre: ${piece.input.genre}. Words: ${piece.wordCount}.`
    );
    lines.push(
      `Hit density: ${piece.hitsPer1000Words} findings per 1,000 words (${piece.weightedPer1000Words} severity-weighted). Terminology check: ${
        piece.termCheck.clean
          ? "passes clean"
          : `flags ${piece.termCheck.hits.map((h) => `"${h.match}"`).join(", ")}`
      }.`
    );
    lines.push(`Score, for context: ${piece.score} of 100.`);
    lines.push("");
    if (piece.findings.length === 0) {
      lines.push("No findings.");
      lines.push("");
      continue;
    }
    const groups = groupByRule(piece.findings);
    for (const [rule, violations] of [...groups.entries()].sort((a, b) =>
      a[0].localeCompare(b[0], undefined, { numeric: true })
    )) {
      lines.push(`### Rule ${rule}: ${violations[0].message}`);
      lines.push("");
      for (const v of violations) {
        lines.push(`- "${v.match}"`);
      }
      lines.push("");
    }
    lines.push("Section scores, for context:");
    lines.push("");
    for (const s of piece.analysis.sections) {
      lines.push(`- ${s.name}: ${s.score} (${s.violationCount} findings)`);
    }
    lines.push("");
  }

  lines.push("## Across the sample");
  lines.push("");
  lines.push("Rule frequency, all pieces:");
  lines.push("");
  for (const entry of report.totals.ruleFrequency) {
    lines.push(`- Rule ${entry.rule}: ${entry.count}`);
  }
  lines.push("");
  lines.push(
    `Shape-repetition count (rules 2.1, 2.2, and 2.15 summed across the sample): ${report.totals.shapeRepetitionCount}. This is a sample-level count of repeated frames and stacks. The corpus read is a separate instrument and this number does not borrow its name.`
  );
  lines.push("");
  return lines.join("\n");
}
