// This package re-exports the slopwash analyzer for standalone use.
// During development the source lives in ../../lib/analyzer/.
// At publish time, copy the analyzer source into this package's src/ directory.
//
// Usage (after publishing):
//   import { analyze, score, getViolations } from 'slopwash';
//
//   const result = analyze('Your text here');
//   console.log(result.score);        // 0-100
//   console.log(result.violations);   // Violation[]
//   console.log(result.sections);     // SectionSummary[]

export { analyze, score, getViolations } from "../../lib/analyzer";
export type {
  AnalysisResult,
  AnalyzeOptions,
  Violation,
  SectionSummary,
  Severity,
} from "../../lib/analyzer";
