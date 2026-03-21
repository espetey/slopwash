import type { Violation } from "../types";
import { findAllMatches } from "../utils";
import {
  WEASEL_PHRASES,
  SOURCE_EXAGGERATION,
  SIGNIFICANCE_CLAIMS,
} from "../word-lists";

function matchPhrases(
  text: string,
  phrases: string[],
  rule: string,
  severity: "high" | "moderate" | "low",
  message: string
): Violation[] {
  const violations: Violation[] = [];
  for (const phrase of phrases) {
    const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(`\\b${escaped}\\b`, "gi");
    for (const { index, match } of findAllMatches(text, pattern)) {
      violations.push({
        rule,
        section: 5,
        severity,
        message: `${message}: "${match}"`,
        match,
        offset: index,
        length: match.length,
      });
    }
  }
  return violations;
}

export function checkContent(text: string): Violation[] {
  const violations: Violation[] = [];

  // 5.2 — Weasel words (vague attribution)
  violations.push(
    ...matchPhrases(
      text,
      WEASEL_PHRASES,
      "5.2",
      "moderate",
      "Vague attribution (name the source)"
    )
  );

  // 5.3 — Source exaggeration
  violations.push(
    ...matchPhrases(
      text,
      SOURCE_EXAGGERATION,
      "5.3",
      "moderate",
      "Source exaggeration"
    )
  );

  // 5.4/2.6 — Significance claims
  violations.push(
    ...matchPhrases(
      text,
      SIGNIFICANCE_CLAIMS,
      "5.4",
      "high",
      "Unearned significance claim"
    )
  );

  // 5.5 — Elegant variation (synonym cycling)
  // Detect common synonym clusters appearing multiple times
  const synonymClusters = [
    ["constraints", "confines", "restrictions", "limitations", "obstacles"],
    ["important", "significant", "crucial", "vital", "essential", "critical"],
    ["increase", "boost", "enhance", "improve", "elevate", "augment"],
    ["show", "demonstrate", "illustrate", "exhibit", "reveal", "showcase"],
    ["help", "assist", "aid", "support", "facilitate", "enable"],
    ["change", "shift", "transformation", "evolution", "transition"],
    ["problem", "challenge", "issue", "concern", "difficulty", "obstacle"],
  ];

  for (const cluster of synonymClusters) {
    const found: string[] = [];
    for (const word of cluster) {
      const pattern = new RegExp(`\\b${word}\\b`, "gi");
      if (pattern.test(text)) {
        found.push(word);
      }
    }
    if (found.length >= 3) {
      violations.push({
        rule: "5.5",
        section: 5,
        severity: "low",
        message: `Possible synonym cycling: ${found.map((w) => `"${w}"`).join(", ")} used in the same text`,
        match: found.join(", "),
        offset: 0,
        length: 0,
      });
    }
  }

  return violations;
}
