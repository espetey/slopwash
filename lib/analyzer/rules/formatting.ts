import type { Violation } from "../types";
import { findAllMatches, countWords } from "../utils";
import { SUMMARY_SHORTHAND } from "../word-lists";

export function checkFormatting(text: string): Violation[] {
  const violations: Violation[] = [];
  const words = countWords(text);

  // 4.1 — Em dash overuse
  // Rule: 1 per 800 words max
  const emDashes = findAllMatches(text, /\u2014/g);
  const maxAllowed = Math.max(1, Math.floor(words / 800));
  if (emDashes.length > maxAllowed) {
    for (const { index, match } of emDashes.slice(maxAllowed)) {
      violations.push({
        rule: "4.1",
        section: 4,
        severity: "moderate",
        message: `Em dash overuse (${emDashes.length} found, limit ~${maxAllowed} for ${words} words)`,
        match,
        offset: index,
        length: match.length,
      });
    }
  }

  // 4.2 — Bold overuse (markdown **text**)
  const bolds = findAllMatches(text, /\*\*[^*]+\*\*/g);
  if (bolds.length > 2) {
    for (const { index, match } of bolds.slice(2)) {
      violations.push({
        rule: "4.2",
        section: 4,
        severity: "low",
        message: "Excessive bold text for emphasis",
        match: match.slice(0, 60) + (match.length > 60 ? "..." : ""),
        offset: index,
        length: match.length,
      });
    }
  }

  // 4.3 — Emoji in expository writing
  const emojiPattern =
    /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}]/gu;
  for (const { index, match } of findAllMatches(text, emojiPattern)) {
    violations.push({
      rule: "4.3",
      section: 4,
      severity: "moderate",
      message: "Emoji in expository writing",
      match,
      offset: index,
      length: match.length,
    });
  }

  // 4.4 — Title case headings (markdown headings with 3+ capitalized words)
  const headingPattern = /^#{1,6}\s+(.+)$/gm;
  for (const { index, match } of findAllMatches(text, headingPattern)) {
    const heading = match.replace(/^#+\s+/, "");
    const titleCaseWords = heading
      .split(/\s+/)
      .filter((w) => /^[A-Z]/.test(w) && w.length > 3);
    const totalWords = heading.split(/\s+/).filter(Boolean);
    if (totalWords.length >= 3 && titleCaseWords.length >= 3) {
      violations.push({
        rule: "4.4",
        section: 4,
        severity: "low",
        message: "Title case heading (use sentence case instead)",
        match: heading,
        offset: index,
        length: match.length,
      });
    }
  }

  // 4.5 — Bold-colon bullet pattern
  const boldColonBullet = /^\s*[-*]\s+\*\*[^*]+\*\*\s*:/gm;
  for (const { index, match } of findAllMatches(text, boldColonBullet)) {
    violations.push({
      rule: "4.5",
      section: 4,
      severity: "moderate",
      message: "Bold-colon bullet pattern (AI formatting tell)",
      match: match.trim(),
      offset: index,
      length: match.length,
    });
  }

  for (const phrase of SUMMARY_SHORTHAND) {
    const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(`\\b${escaped}\\b`, "gi");
    for (const { index, match } of findAllMatches(text, pattern)) {
      violations.push({
        rule: "4.8",
        section: 4,
        severity: "moderate",
        message: "Novelty summary label; use a plain summary or start with the point",
        match,
        offset: index,
        length: match.length,
      });
    }
  }

  return violations;
}
