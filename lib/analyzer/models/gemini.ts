import type { ModelProfile } from "./index";
import type { Violation } from "../types";
import { findAllMatches } from "../utils";

const GEMINI_TELLS = [
  {
    pattern: /\bthat'?s\s+a\s+great\s+question\b/gi,
    message: '"That\'s a great question" opener',
  },
  {
    pattern: /\babsolutely!\b/gi,
    message: '"Absolutely!" agreement reflex',
  },
  {
    pattern: /\bhere'?s\s+a\s+breakdown\b/gi,
    message: '"Here\'s a breakdown" list setup',
  },
  {
    pattern: /\blet\s+me\s+(?:provide|give)\s+you\b/gi,
    message: '"Let me provide/give you" service framing',
  },
  {
    pattern: /\bin\s+essence\b/gi,
    message: '"In essence" summarizer',
  },
];

export const geminiProfile: ModelProfile = {
  id: "gemini",
  label: "Gemini",
  promptOverlay: `MODEL-SPECIFIC PATTERNS — Gemini
The following tells are especially common in Gemini output. Watch for them in addition to the general rules:
- "That's a great question!" as an opening reflex
- "Absolutely!" as a filler agreement
- "Here's a breakdown" before any structured content
- "Let me provide/give you" service-oriented framing
- "In essence" as a summarizer before restating the obvious
- Heavy reliance on bulleted lists for any multi-part answer`,
  check(text: string): Violation[] {
    const violations: Violation[] = [];
    for (const tell of GEMINI_TELLS) {
      for (const { index, match } of findAllMatches(text, tell.pattern)) {
        violations.push({
          rule: "M.gemini",
          section: 3,
          severity: "moderate",
          message: `Gemini tell: ${tell.message}`,
          match,
          offset: index,
          length: match.length,
        });
      }
    }
    return violations;
  },
};
