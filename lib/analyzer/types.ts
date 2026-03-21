export type Severity = "high" | "moderate" | "low";

export interface Violation {
  rule: string;
  section: number;
  severity: Severity;
  message: string;
  match: string;
  offset: number;
  length: number;
}

export interface SectionSummary {
  section: number;
  name: string;
  violationCount: number;
  score: number;
}

export interface AnalysisResult {
  score: number;
  wordCount: number;
  sentenceCount: number;
  violations: Violation[];
  sections: SectionSummary[];
}

export interface AnalyzeOptions {
  model?: string;
}
