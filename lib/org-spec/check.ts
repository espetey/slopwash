import {
  analyze,
  rescoreViolations,
  severityWeightSum,
  type AnalysisResult,
  type AnalyzeOptions,
  type Violation,
} from "@/lib/analyzer";
import { checkOrgTerms } from "@/lib/analyzer/rules/org-terms";
import type { OrgSpec } from "./types";

/**
 * checkWithSpec (build spec section 3, Item B0). Runs analyze()
 * untouched, then derives the org view:
 *
 * - universal: the raw AnalysisResult. The universal score never
 *   moves because an org asked it to.
 * - org: violations after disabled rules are dropped and severities
 *   remapped, rescored by rescoreViolations(); org term findings in
 *   their own list (section 0, org. rule IDs), kept out of the
 *   universal sections; hit densities for both views.
 */

export interface OrgView {
  /** Universal violations after the org's rule settings, rescored. */
  violations: Violation[];
  sections: AnalysisResult["sections"];
  score: number;
  /** Findings from the org's own terms (org. rule IDs). */
  termFindings: Violation[];
}

export interface Density {
  hitsPer1000Words: number;
  weightedPer1000Words: number;
}

export interface OrgCheckResult {
  universal: AnalysisResult;
  org: OrgView;
  densities: { universal: Density; org: Density };
  specVersion: number;
  orgId: string;
}

function density(violations: Violation[], wordCount: number): Density {
  if (wordCount === 0) return { hitsPer1000Words: 0, weightedPer1000Words: 0 };
  const per = 1000 / wordCount;
  return {
    hitsPer1000Words: Math.round(violations.length * per * 100) / 100,
    weightedPer1000Words:
      Math.round(severityWeightSum(violations) * per * 100) / 100,
  };
}

export function checkWithSpec(
  text: string,
  spec: OrgSpec,
  options?: AnalyzeOptions
): OrgCheckResult {
  const universal = analyze(text, options);

  const disabled = new Set(spec.rules.disabled);
  const orgViolations = universal.violations
    .filter((v) => !disabled.has(v.rule))
    .map((v) => {
      const override = spec.rules.severityOverrides[v.rule];
      return override ? { ...v, severity: override } : v;
    });
  const rescored = rescoreViolations(orgViolations, universal.wordCount);

  const termFindings = checkOrgTerms(text, spec.terms);

  return {
    universal,
    org: {
      violations: orgViolations,
      sections: rescored.sections,
      score: rescored.score,
      termFindings,
    },
    densities: {
      universal: density(universal.violations, universal.wordCount),
      org: density(
        [...orgViolations, ...termFindings],
        universal.wordCount
      ),
    },
    specVersion: spec.version,
    orgId: spec.orgId,
  };
}
