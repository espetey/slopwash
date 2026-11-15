/**
 * The v1 genre list (build spec decision D-7). Corpus pieces carry
 * one of these labels; the measures group by genre because a genre
 * is the unit a reading describes.
 */
export const GENRES = [
  "press release",
  "blog post",
  "travel guide",
  "deals and product page",
  "help article",
  "support macro",
  "sales page",
] as const;

export type Genre = (typeof GENRES)[number];

export function isGenre(value: unknown): value is Genre {
  return typeof value === "string" && (GENRES as readonly string[]).includes(value);
}
