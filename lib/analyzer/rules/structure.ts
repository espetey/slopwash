import type { Violation } from "../types";
import { findAllMatches, splitSentences } from "../utils";
import { SUMMARY_OPENERS, TRANSITION_FILLERS } from "../word-lists";

export function checkStructure(text: string): Violation[] {
  const violations: Violation[] = [];

  // 2.1 — "Not just X, but also Y"
  const notJust =
    /\bnot\s+(just|only)\s+[^,.!?]+[,;]\s*(but\s+(also|it['']?s)|it['']?s\s+also)\b/gi;
  for (const { index, match } of findAllMatches(text, notJust)) {
    violations.push({
      rule: "2.1",
      section: 2,
      severity: "high",
      message: '"Not just X, but also Y" construction detected',
      match,
      offset: index,
      length: match.length,
    });
  }

  // 2.2 — Rule of three (3 comma-separated items ending with "and")
  const ruleOfThree =
    /\b(\w[\w\s]{0,30}),\s+(\w[\w\s]{0,30}),\s+and\s+(\w[\w\s]{0,30})\b/gi;
  for (const { index, match } of findAllMatches(text, ruleOfThree)) {
    // Only flag if each item is roughly the same structure (heuristic: similar word count)
    const parts = match.split(/,\s+|,\s+and\s+/);
    if (parts.length >= 3) {
      violations.push({
        rule: "2.2",
        section: 2,
        severity: "moderate",
        message: "Rule of three: exactly three comma-separated items",
        match,
        offset: index,
        length: match.length,
      });
    }
  }

  // 2.3 — "Despite" pivot
  const despitePivot = /\bdespite\s+(its|their|the|this|his|her)\s+\w+/gi;
  for (const { index, match } of findAllMatches(text, despitePivot)) {
    violations.push({
      rule: "2.3",
      section: 2,
      severity: "moderate",
      message: '"Despite [positive]..." pivot pattern',
      match,
      offset: index,
      length: match.length,
    });
  }

  // 2.4 — Summary openers
  for (const phrase of SUMMARY_OPENERS) {
    const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(`\\b${escaped}\\b`, "gi");
    for (const { index, match } of findAllMatches(text, pattern)) {
      violations.push({
        rule: "2.4",
        section: 2,
        severity: "moderate",
        message: `Summary opener: "${match}"`,
        match,
        offset: index,
        length: match.length,
      });
    }
  }

  // 2.5 — "-ing" superficial analysis tail
  // Detect sentences ending with a comma + participial clause
  const sentences = splitSentences(text);
  for (const sentence of sentences) {
    const ingTail = /,\s+\w+ing\s+(?:the|a|an|their|its|his|her)\b[^.!?]+$/i;
    const m = ingTail.exec(sentence);
    if (m) {
      const offset = text.indexOf(sentence) + (m.index ?? 0);
      violations.push({
        rule: "2.5",
        section: 2,
        severity: "moderate",
        message: "Participial (-ing) clause tail that may restate the obvious",
        match: m[0],
        offset,
        length: m[0].length,
      });
    }
  }

  // 2.7 — Rhetorical question opener
  // A question mark followed within ~200 chars by an answer pattern
  const rhetorical =
    /\?[\s\n]+(?:The answer|This|It|That|In short|Simply put|Well,)\b/gi;
  for (const { index, match } of findAllMatches(text, rhetorical)) {
    violations.push({
      rule: "2.7",
      section: 2,
      severity: "moderate",
      message: "Rhetorical question followed by immediate answer",
      match,
      offset: index,
      length: match.length,
    });
  }

  // 2.8 — Hollywood ending
  const hollywood =
    /\bas\s+\w+\s+continues?\s+to\s+(?:evolve|grow|develop|expand|transform)/gi;
  for (const { index, match } of findAllMatches(text, hollywood)) {
    violations.push({
      rule: "2.8",
      section: 2,
      severity: "moderate",
      message: "Hollywood ending: speculative forward-looking statement",
      match,
      offset: index,
      length: match.length,
    });
  }

  // 2.9 — False balance
  const falseBalance =
    /\bon\s+(?:the\s+)?one\s+hand\b[\s\S]{1,300}\bon\s+the\s+other\s+hand\b/gi;
  for (const { index, match } of findAllMatches(text, falseBalance)) {
    violations.push({
      rule: "2.9",
      section: 2,
      severity: "moderate",
      message: '"On one hand... on the other hand" false balance',
      match: match.slice(0, 80) + (match.length > 80 ? "..." : ""),
      offset: index,
      length: match.length,
    });
  }

  // 2.10 — Transition fillers
  for (const phrase of TRANSITION_FILLERS) {
    const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(`\\b${escaped}\\b`, "gi");
    for (const { index, match } of findAllMatches(text, pattern)) {
      violations.push({
        rule: "2.10",
        section: 2,
        severity: "low",
        message: `Transition filler: "${match}"`,
        match,
        offset: index,
        length: match.length,
      });
    }
  }

  // 2.11 — Definition opener
  const definitionOpener = /\b\w+\s+is\s+defined\s+as\b/gi;
  for (const { index, match } of findAllMatches(text, definitionOpener)) {
    violations.push({
      rule: "2.11",
      section: 2,
      severity: "moderate",
      message: "Definition opener pattern",
      match,
      offset: index,
      length: match.length,
    });
  }

  return violations;
}
