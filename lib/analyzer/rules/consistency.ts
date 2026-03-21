import type { Violation } from "../types";
import { findAllMatches } from "../utils";

export function checkConsistency(text: string): Violation[] {
  const violations: Violation[] = [];

  // 6.3 — False emotional understanding
  const falseEmotion =
    /\b(deeply\s+resonates?\s+with|evoking\s+(?:enduring|deep|profound)|speaks?\s+to\s+the\s+(?:heart|soul|spirit)\s+of)\b/gi;
  for (const { index, match } of findAllMatches(text, falseEmotion)) {
    violations.push({
      rule: "6.3",
      section: 6,
      severity: "moderate",
      message: "False emotional understanding projected without evidence",
      match,
      offset: index,
      length: match.length,
    });
  }

  // 6.2 — Frictionless adoption language
  const frictionless =
    /\b(enthusiastically\s+adopt|universally\s+embraced?|widely\s+celebrated|unanimously\s+(?:agreed|supported))\b/gi;
  for (const { index, match } of findAllMatches(text, frictionless)) {
    violations.push({
      rule: "6.2",
      section: 6,
      severity: "low",
      message: "Assumes frictionless adoption or universal agreement",
      match,
      offset: index,
      length: match.length,
    });
  }

  return violations;
}
