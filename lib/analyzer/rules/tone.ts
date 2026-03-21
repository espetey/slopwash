import type { Violation } from "../types";
import { findAllMatches, sentenceWordCounts, standardDeviation } from "../utils";
import {
  HEDGING_PHRASES,
  CHAT_RESIDUE,
  FALSE_INTIMACY,
  SYCOPHANTIC_OPENERS,
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
        section: 3,
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

export function checkTone(text: string): Violation[] {
  const violations: Violation[] = [];

  // 3.2 / 3.4 — Sycophantic openers
  violations.push(
    ...matchPhrases(text, SYCOPHANTIC_OPENERS, "3.2", "high", "Sycophantic opener")
  );

  // 3.4 — Hedging phrases
  violations.push(
    ...matchPhrases(text, HEDGING_PHRASES, "3.4", "moderate", "Hedging filler")
  );

  // 3.5 — Chat residue
  violations.push(
    ...matchPhrases(text, CHAT_RESIDUE, "3.5", "high", "Chat residue")
  );

  // 3.6 — False intimacy
  violations.push(
    ...matchPhrases(text, FALSE_INTIMACY, "3.6", "low", "False intimacy")
  );

  // 3.7 — Sentence length uniformity
  // Flag if the standard deviation of sentence word counts is very low
  // (indicating mechanical uniformity). Threshold: stdev < 4 with 5+ sentences.
  const wordCounts = sentenceWordCounts(text);
  if (wordCounts.length >= 5) {
    const stdev = standardDeviation(wordCounts);
    if (stdev < 4) {
      violations.push({
        rule: "3.7",
        section: 3,
        severity: "moderate",
        message: `Sentence length uniformity detected (std dev: ${stdev.toFixed(1)} words). Human writing varies more.`,
        match: `${wordCounts.length} sentences, std dev ${stdev.toFixed(1)}`,
        offset: 0,
        length: 0,
      });
    }
  }

  return violations;
}
