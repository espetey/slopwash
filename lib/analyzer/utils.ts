export function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

export function splitSentences(text: string): string[] {
  // Split on sentence-ending punctuation followed by space or end.
  // Avoid splitting on abbreviations like "Mr." or "U.S." by requiring
  // the next char to be uppercase or end-of-string.
  const raw = text.split(/(?<=[.!?])\s+(?=[A-Z"\u201C]|$)/);
  return raw.filter((s) => s.trim().length > 0);
}

/**
 * Find all matches of a regex in text, returning their index and matched string.
 */
export function findAllMatches(
  text: string,
  pattern: RegExp
): { index: number; match: string }[] {
  const results: { index: number; match: string }[] = [];
  const global = new RegExp(
    pattern.source,
    pattern.flags.includes("g") ? pattern.flags : pattern.flags + "g"
  );
  let m: RegExpExecArray | null;
  while ((m = global.exec(text)) !== null) {
    results.push({ index: m.index, match: m[0] });
  }
  return results;
}
