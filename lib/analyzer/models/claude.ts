import type { ModelProfile } from "./index";
import type { Violation } from "../types";
import { findAllMatches } from "../utils";

const CLAUDE_TELLS = [
  {
    pattern: /\bI'?d\s+be\s+happy\s+to\s+help\b/gi,
    message: '"I\'d be happy to help" preamble',
  },
  {
    pattern: /\bI\s+should\s+note\b/gi,
    message: '"I should note" caveat opener',
  },
  {
    pattern: /\bI\s+want\s+to\s+be\s+(?:transparent|straightforward|honest|clear)\b/gi,
    message: '"I want to be transparent/straightforward" hedge',
  },
  {
    pattern: /\bI\s+understand\s+(?:your|the)\s+concern\b/gi,
    message: '"I understand your concern" empathy performance',
  },
  {
    pattern: /\bI\s+appreciate\s+(?:you|your|the)\b/gi,
    message: '"I appreciate you/your..." sycophancy',
  },
  {
    pattern: /\blet\s+me\s+(?:think|break)\s+(?:about|this|that)\b/gi,
    message: '"Let me think about this" thinking-out-loud marker',
  },
];

export const claudeProfile: ModelProfile = {
  id: "claude",
  label: "Claude",
  promptOverlay: `MODEL-SPECIFIC PATTERNS — Claude
The following tells are especially common in Claude output. Watch for them in addition to the general rules:
- "I'd be happy to help" as a default preamble
- "I should note" before caveats
- "I want to be transparent/straightforward" before anything remotely nuanced
- "I understand your concern" empathy performance
- "I appreciate you/your..." reflexive sycophancy
- "Let me think about / break this down" performative metacognition`,
  check(text: string): Violation[] {
    const violations: Violation[] = [];
    for (const tell of CLAUDE_TELLS) {
      for (const { index, match } of findAllMatches(text, tell.pattern)) {
        violations.push({
          rule: "M.claude",
          section: 3,
          severity: "moderate",
          message: `Claude tell: ${tell.message}`,
          match,
          offset: index,
          length: match.length,
        });
      }
    }
    return violations;
  },
};
