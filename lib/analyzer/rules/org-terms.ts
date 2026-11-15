import type { Violation } from "../types";

/**
 * Org term checks (build spec section 3, Item B0). These findings come
 * from an organization's own spec, never from the universal ruleset.
 * Rule IDs sit in a reserved org. prefix and section 0, so they stay
 * out of the universal sections and the universal score.
 *
 * Matching is case-insensitive and word-bounded. A term entry is
 * either exact or inflect. Inflect adds a fixed suffix set (s, es, ed,
 * ing, d) with three stem rules:
 *   - a term ending in "e" takes "d" for the past form (guarantee ->
 *     guaranteed) and drops the "e" before "ing" (make -> making);
 *   - a term ending in a single consonant after a single vowel
 *     doubles that consonant before "ed" and "ing" (stop -> stopped);
 *   - otherwise the suffix attaches to the term as written.
 * For a multi-word term, inflection applies to the last word.
 * No stemming library in v1 (build spec decision D-6).
 */

export interface BannedTerm {
  term: string;
  variants: "inflect" | "exact";
}

export interface RequiredTerm {
  term: string;
  minPerPiece: number;
}

export interface ReplacementTerm {
  from: string;
  to: string;
}

export interface OrgTerms {
  banned: BannedTerm[];
  required: RequiredTerm[];
  replacements: ReplacementTerm[];
}

const VOWELS = new Set(["a", "e", "i", "o", "u"]);

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Surface forms of one word under the fixed inflection rules. */
export function inflectedForms(word: string): string[] {
  const w = word.toLowerCase();
  const forms = new Set<string>([w]);
  forms.add(`${w}s`);
  forms.add(`${w}es`);
  forms.add(`${w}ed`);
  forms.add(`${w}ing`);
  if (w.endsWith("e")) {
    forms.add(`${w}d`);
    forms.add(`${w.slice(0, -1)}ing`);
  }
  const last = w[w.length - 1];
  const beforeLast = w[w.length - 2];
  if (
    last &&
    beforeLast &&
    !VOWELS.has(last) &&
    last !== "w" &&
    last !== "x" &&
    last !== "y" &&
    VOWELS.has(beforeLast) &&
    (w.length < 3 || !VOWELS.has(w[w.length - 3]))
  ) {
    forms.add(`${w}${last}ed`);
    forms.add(`${w}${last}ing`);
  }
  return [...forms];
}

function termPattern(term: string, variants: "inflect" | "exact"): RegExp {
  const words = term.trim().split(/\s+/);
  const lastWord = words[words.length - 1];
  const head = words.slice(0, -1).map(escapeRegExp);
  const lastForms =
    variants === "inflect"
      ? inflectedForms(lastWord).map(escapeRegExp)
      : [escapeRegExp(lastWord.toLowerCase())];
  const body = [...head, `(?:${lastForms.join("|")})`].join("\\s+");
  return new RegExp(`\\b${body}\\b`, "gi");
}

export function countTermOccurrences(
  text: string,
  term: string,
  variants: "inflect" | "exact"
): { index: number; match: string }[] {
  const pattern = termPattern(term, variants);
  const found: { index: number; match: string }[] = [];
  let m: RegExpExecArray | null;
  while ((m = pattern.exec(text)) !== null) {
    found.push({ index: m.index, match: m[0] });
    if (m[0].length === 0) pattern.lastIndex += 1;
  }
  return found;
}

export function checkOrgTerms(text: string, terms: OrgTerms): Violation[] {
  const violations: Violation[] = [];

  for (const banned of terms.banned) {
    for (const hit of countTermOccurrences(text, banned.term, banned.variants)) {
      violations.push({
        rule: "org.banned",
        section: 0,
        severity: "moderate",
        message: `Banned term in this org's spec: "${banned.term}"`,
        match: hit.match,
        offset: hit.index,
        length: hit.match.length,
      });
    }
  }

  for (const replacement of terms.replacements) {
    for (const hit of countTermOccurrences(text, replacement.from, "exact")) {
      violations.push({
        rule: "org.replacement",
        section: 0,
        severity: "low",
        message: `Use "${replacement.to}" in place of "${replacement.from}" (this org's spec)`,
        match: hit.match,
        offset: hit.index,
        length: hit.match.length,
      });
    }
  }

  for (const required of terms.required) {
    const count = countTermOccurrences(text, required.term, "inflect").length;
    if (count < required.minPerPiece) {
      violations.push({
        rule: "org.required",
        section: 0,
        severity: "moderate",
        message: `Required term "${required.term}" appears ${count} time${count === 1 ? "" : "s"}; this org's spec requires at least ${required.minPerPiece} per piece`,
        match: required.term,
        offset: 0,
        length: required.term.length,
      });
    }
  }

  return violations;
}
