import type { Violation } from "../types";
import { findAllMatches } from "../utils";
import {
  HIGH_SEVERITY_WORDS,
  HIGH_SEVERITY_PHRASES,
  MODERATE_SEVERITY_WORDS,
  PHRASE_LEVEL_TELLS,
  COPULA_SUBSTITUTES,
} from "../word-lists";

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function matchTerms(
  text: string,
  terms: string[],
  severity: "high" | "moderate" | "low",
  rule: string,
  baseMessage: string
): Violation[] {
  const violations: Violation[] = [];
  for (const term of terms) {
    const escaped = escapeRegex(term);
    const pattern = new RegExp(`\\b${escaped}\\b`, "gi");
    for (const { index, match } of findAllMatches(text, pattern)) {
      violations.push({
        rule,
        section: 1,
        severity,
        message: `${baseMessage}: "${match}"`,
        match,
        offset: index,
        length: match.length,
      });
    }
  }
  return violations;
}

export function checkVocabulary(text: string): Violation[] {
  const violations: Violation[] = [];

  // 1.1 — High-severity banned words
  violations.push(
    ...matchTerms(
      text,
      HIGH_SEVERITY_WORDS,
      "high",
      "1.1",
      "High-severity AI vocabulary"
    )
  );

  // 1.1 — High-severity phrases
  violations.push(
    ...matchTerms(
      text,
      HIGH_SEVERITY_PHRASES,
      "high",
      "1.1",
      "High-severity AI phrase"
    )
  );

  // 1.1 — Moderate-severity words
  violations.push(
    ...matchTerms(
      text,
      MODERATE_SEVERITY_WORDS,
      "moderate",
      "1.1",
      "Moderate-severity AI vocabulary"
    )
  );

  // 1.1 — Phrase-level tells
  violations.push(
    ...matchTerms(
      text,
      PHRASE_LEVEL_TELLS,
      "moderate",
      "1.1",
      "Phrase-level AI tell"
    )
  );

  // 1.2 — Copula avoidance
  violations.push(
    ...matchTerms(
      text,
      COPULA_SUBSTITUTES,
      "moderate",
      "1.2",
      'Copula avoidance (use "is" or "are" instead)'
    )
  );

  return violations;
}
