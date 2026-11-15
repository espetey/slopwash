import type { AnalysisResult, AnalyzeOptions, Violation } from "./types";
import { countWords, splitSentences } from "./utils";
import {
  computeSectionSummaries,
  computeOverallScore,
} from "./scoring";

export { rescoreViolations, severityWeightSum } from "./scoring";
import { checkVocabulary } from "./rules/vocabulary";
import { checkStructure } from "./rules/structure";
import { checkTone } from "./rules/tone";
import { checkFormatting } from "./rules/formatting";
import { checkContent } from "./rules/content";
import { checkConsistency } from "./rules/consistency";
import { checkMannered } from "./rules/mannered";
import { checkNarrative } from "./rules/narrative";
import { getModelProfile } from "./models";

export type { AnalysisResult, AnalyzeOptions, Violation } from "./types";
export type { SectionSummary, Severity } from "./types";

/**
 * Version constants (build spec B1). ANALYZER_VERSION is bumped on
 * any rule or scoring change; RULESET_VERSION names the published
 * ruleset revision. Check runs and org API responses record both, so
 * a stored result can be tied to the exact instrument that made it.
 */
export const ANALYZER_VERSION = "1.0.0";
export const RULESET_VERSION = "1.0";

export function analyze(
  text: string,
  options?: AnalyzeOptions
): AnalysisResult {
  const violations: Violation[] = [
    ...checkVocabulary(text),
    ...checkStructure(text),
    ...checkTone(text),
    ...checkFormatting(text),
    ...checkContent(text),
    ...checkConsistency(text),
    ...checkMannered(text),
  ];

  if (options?.narrative) {
    violations.push(...checkNarrative(text));
  }

  // Apply model-specific checks if a model is specified
  if (options?.model) {
    const profile = getModelProfile(options.model);
    if (profile) {
      violations.push(...profile.check(text));
    }
  }

  const sections = computeSectionSummaries(violations);
  const score = computeOverallScore(sections);

  return {
    score,
    wordCount: countWords(text),
    sentenceCount: splitSentences(text).length,
    violations,
    sections,
  };
}

export function score(text: string, options?: AnalyzeOptions): number {
  return analyze(text, options).score;
}

export function getViolations(
  text: string,
  options?: AnalyzeOptions
): Violation[] {
  return analyze(text, options).violations;
}
