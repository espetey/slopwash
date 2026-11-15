import { countTermOccurrences } from "@/lib/analyzer/rules/org-terms";
import type { OrgSpec } from "@/lib/org-spec/types";
import type { TermCheckResult } from "./types";

/**
 * The term check (build spec section 2, Item A): a mechanical form of
 * the fixed test the first proof run applied by hand. It reads a text
 * against a banned term list and flags a term where the list states
 * one. It has no rule for word clusters, repeated sentence shapes, or
 * rhythm, and the report prints it as a simulation with the method
 * named.
 *
 * The standard list is the set the proof run's judgments name as
 * sitting on current banned-word and buzzword lists: "delve",
 * "robust", and "game-changer". The engagement's own banned terms
 * from its spec are added when a spec is present. Matching is exact,
 * case-insensitive, and word-bounded, the way a term list in a style
 * guide is applied.
 */

export const STANDARD_BANNED_TERMS = ["delve", "robust", "game-changer"];

export function termCheck(text: string, spec?: OrgSpec | null): TermCheckResult {
  const terms = [...STANDARD_BANNED_TERMS];
  if (spec) {
    for (const banned of spec.terms.banned) {
      if (!terms.includes(banned.term.toLowerCase())) {
        terms.push(banned.term.toLowerCase());
      }
    }
  }
  const hits: TermCheckResult["hits"] = [];
  for (const term of terms) {
    for (const hit of countTermOccurrences(text, term, "exact")) {
      hits.push({ term, match: hit.match, offset: hit.index });
    }
  }
  hits.sort((a, b) => a.offset - b.offset);
  return { clean: hits.length === 0, hits };
}
