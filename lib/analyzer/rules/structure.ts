import type { Violation } from "../types";
import { findAllMatches, splitSentences } from "../utils";
import {
  ANSWER_LABELS,
  BUTTON_PHRASES,
  SUMMARY_OPENERS,
  TRANSITION_FILLERS,
} from "../word-lists";

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function checkStructure(text: string): Violation[] {
  const violations: Violation[] = [];

  // 2.1 — "Not just X, but also Y"
  const notJust =
    /\bnot\s+(?:just|only)\s+[^,.!?]+(?:\s*[,;]\s*|\s+)but(?:\s+also)?\s+[^.!?]+/gi;
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

  const contrastRelatives = [
    /\bnot\s+because\s+[^,.!?]+[,;]\s*but\s+because\s+[^.!?]+/gi,
    /\bless\s+like\s+[^,.!?]+\s+and\s+more\s+like\s+[^.!?]+/gi,
    /\b(?:it|this|that)\s+(?:isn['’]t|wasn['’]t)\s+[^.!?]+\.\s+(?:it|this|that)\s+(?:is|was)\s+[^.!?]+/gi,
    /\b[^.!?]+\s+isn['’]t\s+the\s+problem\.\s+[^.!?]+\s+is\b/gi,
  ];
  for (const pattern of contrastRelatives) {
    for (const { index, match } of findAllMatches(text, pattern)) {
      violations.push({
        rule: "2.1",
        section: 2,
        severity: "moderate",
        message: "Formulaic contrast frame",
        match,
        offset: index,
        length: match.length,
      });
    }
  }

  // 2.2: Repeated decorative triplets. A single triplet may be factual.
  const ruleOfThree =
    /\b(\w[\w\s]{0,30}),\s+(\w[\w\s]{0,30}),\s+and\s+(\w[\w\s]{0,30})\b/gi;
  let paragraphCursor = 0;
  for (const paragraph of text.split(/\n\s*\n/)) {
    const paragraphOffset = text.indexOf(paragraph, paragraphCursor);
    paragraphCursor = Math.max(paragraphOffset, paragraphCursor) + paragraph.length;
    const triplets = findAllMatches(paragraph, ruleOfThree);
    if (triplets.length < 2) continue;

    for (const { index, match } of triplets) {
      violations.push({
        rule: "2.2",
        section: 2,
        severity: "low",
        message: "Repeated triplet pattern; keep all items if they are factual",
        match,
        offset: Math.max(paragraphOffset, 0) + index,
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

  const consequenceFiller = /\b(?:plays?\s+a\s+role\s+in|contributes?\s+to|helps?\s+ensure)\b/gi;
  for (const { index, match } of findAllMatches(text, consequenceFiller)) {
    violations.push({
      rule: "2.5",
      section: 2,
      severity: "low",
      message: "Indirect consequence phrase; state the consequence or cut it",
      match,
      offset: index,
      length: match.length,
    });
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

  for (const label of ANSWER_LABELS) {
    const pattern = new RegExp(`\\b${escapeRegex(label)}\\s*[?:]`, "gi");
    for (const { index, match } of findAllMatches(text, pattern)) {
      violations.push({
        rule: "2.7",
        section: 2,
        severity: "moderate",
        message: "Dramatic answer label",
        match,
        offset: index,
        length: match.length,
      });
    }
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

  const signposting =
    /\b(?:in\s+this\s+(?:article|guide),?\s+(?:we(?:['’]ll|\s+will)\s+(?:explore|cover)|you(?:['’]ll|\s+will)\s+learn)|let['’]s\s+take\s+a\s+look\s+at|this\s+guide\s+covers)\b/gi;
  for (const { index, match } of findAllMatches(text, signposting)) {
    violations.push({
      rule: "2.11",
      section: 2,
      severity: "moderate",
      message: "Opening signpost that delays the first useful point",
      match,
      offset: index,
      length: match.length,
    });
  }

  for (const phrase of BUTTON_PHRASES) {
    const pattern = new RegExp(
      `\\b${escapeRegex(phrase)}[.!?]?(?=\\s*(?:\\n\\s*\\n|$))`,
      "gi"
    );
    for (const { index, match } of findAllMatches(text, pattern)) {
      violations.push({
        rule: "2.12",
        section: 2,
        severity: "moderate",
        message: "Paragraph-ending button",
        match,
        offset: index,
        length: match.length,
      });
    }
  }

  const staccatoRun =
    /\b(?:No|Not)\s+[^.!?\n]{1,60}\.\s+(?:No|Not)\s+[^.!?\n]{1,60}\.\s+(?:Just\s+)?[^.!?\n]{1,60}[.!?]/g;
  for (const { index, match } of findAllMatches(text, staccatoRun)) {
    violations.push({
      rule: "2.13",
      section: 2,
      severity: "moderate",
      message: "Staccato fragment run",
      match,
      offset: index,
      length: match.length,
    });
  }

  for (let sentenceIndex = 2; sentenceIndex < sentences.length; sentenceIndex++) {
    const run = sentences.slice(sentenceIndex - 2, sentenceIndex + 1);
    const openings = run.map((sentence) => {
      const opening = sentence.trim().match(/^["'“‘([]*([A-Za-z0-9'’-]+\s+[A-Za-z0-9'’-]+)/);
      return opening?.[1]?.toLowerCase();
    });
    if (!openings[0] || !openings.every((opening) => opening === openings[0])) {
      continue;
    }

    const match = run.join(" ");
    const offset = text.indexOf(run[0]);
    violations.push({
      rule: "2.15",
      section: 2,
      severity: "low",
      message: `Three sentences repeat the opening "${openings[0]}"`,
      match,
      offset: Math.max(offset, 0),
      length: match.length,
    });
  }

  return violations;
}
