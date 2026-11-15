/**
 * Spec drafting aid (build spec section 3, Item B1). Deterministic.
 * Reads an org's exemplars and proposes spec lines for a person to
 * approve:
 *
 * - required candidates: word sequences (one to three words) that
 *   appear in at least 80 percent of the exemplars;
 * - preferred candidates: sequences in 60 to 80 percent;
 * - banned and replacement candidates: from the org's own correction
 *   history, when it supplies one (terms it has corrected away from,
 *   and the forms it corrected them to).
 *
 * The aid proposes. It never writes a spec version; a person approves
 * every line before it becomes one. Stopword-only sequences are
 * filtered out, and every candidate carries the counts behind it so
 * the approver can judge the proposal.
 */

const STOPWORDS = new Set(
  (
    "the of and a an in to is are was were be been being have has had do does did " +
    "will would can could should may might must shall this that these those it its " +
    "as at by for with about against between into through during before after above " +
    "below from up down out over under again further then once here there when where " +
    "why how all any both each few more most other some such no nor not only own same " +
    "so than too very just also if or but on we you they he she i our your their his her " +
    "them us him one two first new"
  ).split(/\s+/)
);

export interface DraftCandidate {
  term: string;
  /** Share of exemplars containing the term, 0 to 1. */
  exemplarShare: number;
  /** Total occurrences across all exemplars. */
  occurrences: number;
}

export interface Correction {
  from: string;
  to?: string;
}

export interface SpecDraft {
  requiredCandidates: DraftCandidate[];
  preferredCandidates: DraftCandidate[];
  bannedCandidates: { term: string; corrections: number }[];
  replacementCandidates: { from: string; to: string; corrections: number }[];
  exemplarCount: number;
  note: string;
}

function words(text: string): string[] {
  return (text.toLowerCase().match(/[a-z][a-z'-]*/g) ?? []).map((w) =>
    w.replace(/^[-']+|[-']+$/g, "")
  );
}

function ngrams(tokens: string[], n: number): string[] {
  const out: string[] = [];
  for (let i = 0; i + n <= tokens.length; i++) {
    out.push(tokens.slice(i, i + n).join(" "));
  }
  return out;
}

export function draftSpecFromExemplars(
  exemplarTexts: string[],
  corrections: Correction[] = []
): SpecDraft {
  const docFreq = new Map<string, { docs: number; total: number }>();
  for (const text of exemplarTexts) {
    const tokens = words(text);
    const seen = new Set<string>();
    for (const n of [1, 2, 3]) {
      for (const gram of ngrams(tokens, n)) {
        const parts = gram.split(" ");
        // A candidate must carry at least one non-stopword, and a
        // single word must not be a stopword at all.
        if (parts.every((p) => STOPWORDS.has(p))) continue;
        if (n === 1 && STOPWORDS.has(parts[0])) continue;
        const entry = docFreq.get(gram) ?? { docs: 0, total: 0 };
        entry.total += 1;
        if (!seen.has(gram)) {
          entry.docs += 1;
          seen.add(gram);
        }
        docFreq.set(gram, entry);
      }
    }
  }

  const count = Math.max(1, exemplarTexts.length);
  const candidates: DraftCandidate[] = [...docFreq.entries()]
    .map(([term, v]) => ({
      term,
      exemplarShare: Math.round((v.docs / count) * 100) / 100,
      occurrences: v.total,
    }))
    .filter((c) => c.exemplarShare >= 0.6 && c.occurrences >= 3)
    .sort(
      (a, b) =>
        b.exemplarShare - a.exemplarShare ||
        b.occurrences - a.occurrences ||
        a.term.localeCompare(b.term)
    );

  // Prefer the longest form of a repeated phrase: when a three-word
  // candidate and its two-word tail have the same share, the shorter
  // one adds nothing.
  const deduped = candidates.filter(
    (c) =>
      !candidates.some(
        (other) =>
          other !== c &&
          other.exemplarShare === c.exemplarShare &&
          other.term.split(" ").length > c.term.split(" ").length &&
          other.term.endsWith(` ${c.term}`)
      )
  );

  const bannedMap = new Map<string, number>();
  const replacementMap = new Map<string, { to: string; corrections: number }>();
  for (const correction of corrections) {
    const from = correction.from.trim().toLowerCase();
    if (!from) continue;
    bannedMap.set(from, (bannedMap.get(from) ?? 0) + 1);
    if (correction.to) {
      const key = `${from} -> ${correction.to.trim().toLowerCase()}`;
      const entry = replacementMap.get(key) ?? {
        to: correction.to.trim().toLowerCase(),
        corrections: 0,
      };
      entry.corrections += 1;
      replacementMap.set(key, entry);
    }
  }

  return {
    requiredCandidates: deduped
      .filter((c) => c.exemplarShare >= 0.8)
      .slice(0, 25),
    preferredCandidates: deduped
      .filter((c) => c.exemplarShare >= 0.6 && c.exemplarShare < 0.8)
      .slice(0, 15),
    bannedCandidates: [...bannedMap.entries()]
      .map(([term, n]) => ({ term, corrections: n }))
      .sort((a, b) => b.corrections - a.corrections),
    replacementCandidates: [...replacementMap.entries()]
      .map(([key, v]) => ({
        from: key.split(" -> ")[0],
        to: v.to,
        corrections: v.corrections,
      }))
      .sort((a, b) => b.corrections - a.corrections),
    exemplarCount: exemplarTexts.length,
    note: "Proposals only. A person approves every line before it becomes a spec version.",
  };
}
