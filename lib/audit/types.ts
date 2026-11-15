import type { AnalysisResult, Violation } from "@/lib/analyzer";
import type { OrgCheckResult } from "@/lib/org-spec/check";
import type { OrgSpec } from "@/lib/org-spec/types";

/**
 * Audit types (build spec section 2, Item A). The audit is a local
 * deliverable: files in, report files out, nothing served.
 */

export interface AuditPieceInput {
  title: string;
  /** Where the piece came from, printed in the report. */
  source: string;
  genre: string;
  text: string;
}

export interface TermCheckResult {
  /** True when no standard-list or spec-banned term appears. */
  clean: boolean;
  hits: { term: string; match: string; offset: number }[];
}

export interface AuditPieceResult {
  input: AuditPieceInput;
  analysis: AnalysisResult;
  /** Present when the engagement carried a spec. */
  orgCheck?: OrgCheckResult;
  termCheck: TermCheckResult;
  /** Findings of record: org view when a spec is present. */
  findings: Violation[];
  score: number;
  wordCount: number;
  hitsPer1000Words: number;
  weightedPer1000Words: number;
}

export interface AuditReport {
  clientLabel: string;
  sampleSource: string;
  date: string;
  spec: OrgSpec | null;
  pieces: AuditPieceResult[];
  totals: {
    piecesRead: number;
    piecesWithFindings: number;
    piecesTermCheckClean: number;
    /** Shape-repetition rules 2.1, 2.2, 2.15 summed across the sample. */
    shapeRepetitionCount: number;
    ruleFrequency: { rule: string; count: number }[];
  };
}
