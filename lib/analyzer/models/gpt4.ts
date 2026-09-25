import type { ModelProfile } from "./index";
import type { Violation } from "../types";
import { findAllMatches } from "../utils";

const GPT4_TELLS = [
  { pattern: /\blet'?s\s+explore\b/gi, message: '"Let\'s explore" opener' },
  {
    pattern: /\bin\s+the\s+realm\s+of\b/gi,
    message: '"In the realm of" filler',
  },
  {
    pattern: /\bit'?s\s+worth\s+noting\s+that\b/gi,
    message: '"It\'s worth noting that" hedge',
  },
  {
    pattern: /\bthere\s+are\s+several\s+(?:key|important)\b/gi,
    message: '"There are several key..." list setup',
  },
  {
    pattern:
      /\b(?:I'?d\s+be\s+happy\s+to|I'?m\s+happy\s+to)\s+(?:delve|dive|explore|help)\b/gi,
    message: "Sycophantic offer to delve/explore",
  },
];

export const gpt4Profile: ModelProfile = {
  id: "gpt-4o",
  label: "GPT-4o",
  promptOverlay: `MODEL-SPECIFIC PATTERNS: GPT-4O
The following tells are especially common in GPT-4o output. Watch for them in addition to the general rules:
- Overuse of "delve" and "explore" as verbs
- "Let's explore..." as a section opener
- "In the realm of..." as a transitional phrase
- "It's worth noting that..." as a hedge before every caveat
- "There are several key..." as a list preamble
- Formulaic enthusiasm: "I'd be happy to delve into..."`,
  check(text: string): Violation[] {
    const violations: Violation[] = [];
    for (const tell of GPT4_TELLS) {
      for (const { index, match } of findAllMatches(text, tell.pattern)) {
        violations.push({
          rule: "M.gpt4",
          section: 3,
          severity: "moderate",
          message: `GPT-4o tell: ${tell.message}`,
          match,
          offset: index,
          length: match.length,
        });
      }
    }
    return violations;
  },
};
