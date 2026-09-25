import type { Violation } from "../types";
import { findAllMatches } from "../utils";
import {
  HEDGING_PHRASES,
  CHAT_RESIDUE,
  SYCOPHANTIC_OPENERS,
  REVEAL_OPENERS,
  DRAMA_WORDS,
  HOUSE_VOICE_PHRASES,
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
    const startBoundary = /^\w/.test(phrase) ? "\\b" : "";
    const endBoundary = /\w$/.test(phrase) ? "\\b" : "";
    const pattern = new RegExp(`${startBoundary}${escaped}${endBoundary}`, "gi");
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

  // 3.6: Sincerity labels and reveal openers
  violations.push(
    ...matchPhrases(text, REVEAL_OPENERS, "3.6", "low", "Reveal opener")
  );

  // 3.9: Intensifiers and drama adverbs
  violations.push(
    ...matchPhrases(text, DRAMA_WORDS, "3.9", "low", "Drama intensifier")
  );

  // 3.10: Motivator and philosopher house voices
  violations.push(
    ...matchPhrases(
      text,
      HOUSE_VOICE_PHRASES,
      "3.10",
      "moderate",
      "Model house voice"
    )
  );

  const receptionShorthand = [
    /\b(?:this|that)\s+(?:really\s+|actually\s+)?(?:(?:will|may|should)\s+land|land(?:s|ed)?)(?:\s+(?:well|badly))?\b/gi,
    /\bit\s+(?:(?:will|may|should)\s+land|land(?:s|ed)?)\s+(?:well|badly)\b/gi,
    /\b(?:how|where)\s+(?:this|that|it|the\s+(?:point|message|idea|copy|phrase|wording|argument|line|proposal|story|recommendation|summary|opening|ending|claim))\s+(?:(?:will|may|should)\s+land|land(?:s|ed)?)\b/gi,
    /\bthe\s+(?:point|message|idea|copy|phrase|wording|argument|line|proposal|story|recommendation|summary|opening|ending|claim)\s+(?:(?:will|may|should)\s+land|land(?:s|ed)?|does(?:n['’]t|\s+not)\s+land)\b/gi,
    /\bland(?:s|ed)?\s+(?:well|badly)\s+with\b/gi,
  ];
  for (const pattern of receptionShorthand) {
    for (const { index, match } of findAllMatches(text, pattern)) {
      violations.push({
        rule: "3.11",
        section: 3,
        severity: "moderate",
        message: "Vague reception shorthand; name the supported judgment",
        match,
        offset: index,
        length: match.length,
      });
    }
  }

  return violations;
}
