import type { Violation } from "../types";
import { findAllMatches } from "../utils";

const MANNERED_PATTERNS = [
  /\bload-bearing\b/gi,
  /\bdoing\s+(?:a\s+lot\s+of\s+)?(?:the\s+)?(?:heavy\s+)?lifting\b/gi,
  /\b(?:scaffolding|plumbing|machinery|levers?|dials?|knobs?)\b/gi,
  /\bsurface\s+area\b/gi,
  /\bguardrails?\b/gi,
  /\bnorth\s+star\b/gi,
  /\bmuscle\s+memory\b/gi,
  /\bfault\s+lines?\b/gi,
  /\bthe\s+shape\s+of\s+(?:the|this|a)\s+\w+/gi,
  /\b(?:texture|contours)\s+of\b/gi,
  /\bthread(?:ing|s)?\s+the\s+needle\b/gi,
];

const APHORISMS = [
  /\bthe\s+map\s+is\s+not\s+the\s+territory\b/gi,
  /\bevery\s+constraint\s+is\s+a\s+design\s+decision\s+in\s+disguise\b/gi,
  /\bclarity\s+is\s+(?:a\s+)?kindness\b/gi,
];

export function checkMannered(text: string): Violation[] {
  const violations: Violation[] = [];

  for (const pattern of MANNERED_PATTERNS) {
    for (const { index, match } of findAllMatches(text, pattern)) {
      violations.push({
        rule: "7.3",
        section: 5,
        severity: "low",
        message: "Mannered metaphor; say the literal thing",
        match,
        offset: index,
        length: match.length,
      });
    }
  }

  for (const pattern of APHORISMS) {
    for (const { index, match } of findAllMatches(text, pattern)) {
      violations.push({
        rule: "7.6",
        section: 5,
        severity: "moderate",
        message: "Aphorism in place of a concrete claim",
        match,
        offset: index,
        length: match.length,
      });
    }
  }

  return violations;
}