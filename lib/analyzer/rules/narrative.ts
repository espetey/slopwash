import type { Violation } from "../types";
import { findAllMatches } from "../utils";

const REALIZATION_PATTERNS = [
  /\b(?:she|he|they)\s+realized\s+that\b/gi,
  /\bsomething\s+shifted\b/gi,
  /\bit\s+hit\s+(?:her|him|them)\s+then\b/gi,
  /\bfor\s+the\s+first\s+time,?\s+(?:she|he|they)\s+understood\b/gi,
];

const STOCK_BODY_CUES = [
  /\b(?:her|his|their)\s+jaw\s+tightened\b/gi,
  /\b(?:her|his|their)\s+mouth\s+pressed\s+into\s+a\s+line\b/gi,
  /\b(?:her|his|their)\s+gaze\s+dropped\b/gi,
  /\b(?:her|his|their)\s+breath\s+left\s+in\s+a\s+slow\s+exhale\b/gi,
  /\b(?:her|his|their)\s+knuckles\s+whitened\b/gi,
];

const STOCK_ATMOSPHERE = [
  /\bthe\s+smell\s+of\s+ozone\b/gi,
  /\bthe\s+hum\s+of\s+(?:the\s+)?(?:city|servers?|fluorescent\s+lights?)\b/gi,
  /\bsilence\s+(?:stretched|that\s+stretched)\b/gi,
  /\bwords\s+(?:hung|that\s+hung)\s+in\s+the\s+air\b/gi,
  /\bthe\s+weight\s+of\s+\w+/gi,
  /\ba\s+breath\s+(?:she|he|they)\s+didn['’]t\s+know\s+(?:she|he|they)\s+was\s+holding\b/gi,
  /\bbarely\s+above\s+a\s+whisper\b/gi,
  /\bthe\s+ghost\s+of\s+a\s+smile\b/gi,
  /\ba\s+flicker\s+of\s+\w+/gi,
];

function addMatches(
  text: string,
  patterns: RegExp[],
  rule: string,
  message: string,
  violations: Violation[]
): void {
  for (const pattern of patterns) {
    for (const { index, match } of findAllMatches(text, pattern)) {
      violations.push({
        rule,
        section: 3,
        severity: "low",
        message,
        match,
        offset: index,
        length: match.length,
      });
    }
  }
}

export function checkNarrative(text: string): Violation[] {
  const violations: Violation[] = [];

  addMatches(
    text,
    REALIZATION_PATTERNS,
    "9.1",
    "Announced realization instead of action or dialogue",
    violations
  );
  addMatches(
    text,
    STOCK_BODY_CUES,
    "9.2",
    "Stock body cue",
    violations
  );
  addMatches(
    text,
    STOCK_ATMOSPHERE,
    "9.3",
    "Stock narrative atmosphere",
    violations
  );

  return violations;
}