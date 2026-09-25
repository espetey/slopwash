import type { ModelProfile } from "./index";
import type { Violation } from "../types";
import { findAllMatches } from "../utils";

const LLAMA_TELLS = [
  {
    pattern: /\bit\s+is\s+essential\s+to\b/gi,
    message: '"It is essential to" stiff formality',
  },
  {
    pattern: /\bone\s+must\s+consider\b/gi,
    message: '"One must consider" formal distancing',
  },
  {
    pattern: /\bit\s+is\s+(?:important|imperative|necessary)\s+to\s+(?:note|understand|recognize)\b/gi,
    message: "Formal importance hedge",
  },
  {
    pattern: /\bin\s+order\s+to\b/gi,
    message: '"In order to" (just use "to")',
  },
  {
    pattern: /\bfurthermore\b/gi,
    message: '"Furthermore" stiff connector',
  },
];

export const llamaProfile: ModelProfile = {
  id: "llama",
  label: "Llama",
  promptOverlay: `MODEL-SPECIFIC PATTERNS: LLAMA
The following tells are especially common in Llama/Meta model output. Watch for them in addition to the general rules:
- "It is essential to..." overly formal phrasing
- "One must consider..." formal distancing from the reader
- "It is important to note/understand/recognize" triple hedge
- "In order to" where "to" alone would work
- "Furthermore" as a default paragraph connector
- Generally stiffer, more formal register than natural writing`,
  check(text: string): Violation[] {
    const violations: Violation[] = [];
    for (const tell of LLAMA_TELLS) {
      for (const { index, match } of findAllMatches(text, tell.pattern)) {
        violations.push({
          rule: "M.llama",
          section: 3,
          severity: "moderate",
          message: `Llama tell: ${tell.message}`,
          match,
          offset: index,
          length: match.length,
        });
      }
    }
    return violations;
  },
};
