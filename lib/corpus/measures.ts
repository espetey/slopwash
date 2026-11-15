import { analyze, type AnalysisResult } from "@/lib/analyzer";
import { splitSentences } from "@/lib/analyzer/utils";
import { checkWithSpec } from "@/lib/org-spec/check";
import type { OrgSpec } from "@/lib/org-spec/types";
import {
  centroid,
  cosineSimilarity,
  type Embedder,
} from "./embedder";

/**
 * Corpus measures (build spec section 4, Item C0). Pure functions
 * over an in-memory set of pieces. No storage, no network. The
 * measures are the instrument of the H5 gate test and, after the
 * gate, of the periodic corpus report.
 *
 * Two axes, per the concept note: consistency (distance to the spec
 * and the score distribution) and dispersion (how different the
 * pieces are from each other). Scores are reported as distributions,
 * never as thresholds.
 */

export interface CorpusPiece {
  genre: string;
  period: string;
  text: string;
  title?: string;
}

export interface PieceMeasures {
  score: number;
  wordCount: number;
  sentenceCount: number;
  /** Coefficient of variation of sentence lengths, in words. */
  sentenceLengthCv: number;
  /** Moving-average type-token ratio, window 100 tokens. */
  mattr: number;
  frameHits: number;
  orgFindings: number | null;
}

export interface GenreMeasures {
  genre: string;
  period: string;
  pieceCount: number;
  totalWords: number;
  /** Hits on rules 2.1, 2.2, 2.15 across the set, per 1,000 words. */
  frameLoadPer1000: number;
  /** Share of pieces sharing a sentence opening with another piece. */
  repeatedOpeningShare: number;
  topRepeatedOpenings: { opening: string; pieceCount: number }[];
  sentenceLengthCvMedian: number;
  sentenceLengthCvIqr: number;
  mattrMean: number;
  /**
   * Mean pairwise Jaccard similarity of piece vocabularies. This is
   * the set-level richness measure: a templated set reuses one
   * vocabulary across pieces and scores high; a varied set scores
   * low. (Within-piece MATTR alone did not separate the fixture
   * sets: a focused essayist repeats topical words inside a piece
   * more than a slot template does. See the Phase 0 PR notes.)
   */
  vocabularyOverlapMean: number;
  scoreMedian: number;
  scoreQ1: number;
  scoreQ3: number;
  /** Present when a spec was supplied. */
  specComplianceRate: number | null;
  meanOrgFindingsPerPiece: number | null;
  /** Present when an embedder produced vectors. */
  embeddingMeanPairwiseSimilarity: number | null;
  embeddingMeanCentroidDistance: number | null;
  /** Mean distance from the period centroid to the exemplar centroid. */
  exemplarCentroidDistance: number | null;
  pieces: PieceMeasures[];
}

const FRAME_RULES = new Set(["2.1", "2.2", "2.15"]);
const MATTR_WINDOW = 100;

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/\s+/)
    .map((t) => t.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, ""))
    .filter(Boolean);
}

export function movingAverageTtr(tokens: string[]): number {
  if (tokens.length === 0) return 0;
  if (tokens.length <= MATTR_WINDOW) {
    return new Set(tokens).size / tokens.length;
  }
  let sum = 0;
  let windows = 0;
  for (let start = 0; start + MATTR_WINDOW <= tokens.length; start += 10) {
    const window = tokens.slice(start, start + MATTR_WINDOW);
    sum += new Set(window).size / MATTR_WINDOW;
    windows += 1;
  }
  return windows > 0 ? sum / windows : 0;
}

function coefficientOfVariation(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  if (mean === 0) return 0;
  const variance =
    values.reduce((sum, v) => sum + (v - mean) * (v - mean), 0) /
    values.length;
  return Math.sqrt(variance) / mean;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

function quantile(values: number[], q: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.floor(q * sorted.length))
  );
  return sorted[index];
}

export function normalizeOpening(sentence: string): string {
  return tokenize(sentence).slice(0, 3).join(" ");
}

export function measurePiece(
  text: string,
  spec?: OrgSpec | null
): { measures: PieceMeasures; analysis: AnalysisResult } {
  const analysis = analyze(text);
  const sentences = splitSentences(text);
  const sentenceLengths = sentences.map(
    (s) => s.split(/\s+/).filter(Boolean).length
  );
  const frameHits = analysis.violations.filter((v) =>
    FRAME_RULES.has(v.rule)
  ).length;
  let orgFindings: number | null = null;
  if (spec) {
    const checked = checkWithSpec(text, spec);
    orgFindings = checked.org.termFindings.length;
  }
  return {
    analysis,
    measures: {
      score: analysis.score,
      wordCount: analysis.wordCount,
      sentenceCount: sentences.length,
      sentenceLengthCv: coefficientOfVariation(sentenceLengths),
      mattr: movingAverageTtr(tokenize(text)),
      frameHits,
      orgFindings,
    },
  };
}

export async function measureGenreSet(
  pieces: CorpusPiece[],
  options: {
    spec?: OrgSpec | null;
    embedder?: Embedder | null;
    exemplarTexts?: string[];
  } = {}
): Promise<GenreMeasures> {
  const first = pieces[0];
  const measured = pieces.map((p) => ({
    piece: p,
    ...measurePiece(p.text, options.spec ?? null),
  }));

  const totalWords = measured.reduce((s, m) => s + m.measures.wordCount, 0);
  const frameHits = measured.reduce((s, m) => s + m.measures.frameHits, 0);

  // Cross-piece repeated openings.
  const openingToPieces = new Map<string, Set<number>>();
  measured.forEach((m, pieceIndex) => {
    const openings = new Set(
      splitSentences(m.piece.text).map(normalizeOpening).filter(Boolean)
    );
    for (const opening of openings) {
      const set = openingToPieces.get(opening) ?? new Set<number>();
      set.add(pieceIndex);
      openingToPieces.set(opening, set);
    }
  });
  const piecesSharing = new Set<number>();
  const repeated: { opening: string; pieceCount: number }[] = [];
  for (const [opening, set] of openingToPieces) {
    if (set.size >= 2) {
      for (const i of set) piecesSharing.add(i);
      repeated.push({ opening, pieceCount: set.size });
    }
  }
  repeated.sort((a, b) => b.pieceCount - a.pieceCount);

  const cvs = measured.map((m) => m.measures.sentenceLengthCv);
  const scores = measured.map((m) => m.measures.score);

  // Set-level vocabulary overlap: mean pairwise Jaccard similarity.
  const vocabSets = pieces.map((p) => new Set(tokenize(p.text)));
  let jaccardSum = 0;
  let jaccardPairs = 0;
  for (let i = 0; i < vocabSets.length; i++) {
    for (let j = i + 1; j < vocabSets.length; j++) {
      const a = vocabSets[i];
      const b = vocabSets[j];
      let intersection = 0;
      for (const token of a) if (b.has(token)) intersection += 1;
      const union = a.size + b.size - intersection;
      if (union > 0) {
        jaccardSum += intersection / union;
        jaccardPairs += 1;
      }
    }
  }
  const vocabularyOverlapMean =
    jaccardPairs > 0 ? jaccardSum / jaccardPairs : 0;
  const orgFindings = measured
    .map((m) => m.measures.orgFindings)
    .filter((v): v is number => v !== null);

  let embeddingMeanPairwiseSimilarity: number | null = null;
  let embeddingMeanCentroidDistance: number | null = null;
  let exemplarCentroidDistance: number | null = null;
  if (options.embedder && pieces.length > 0) {
    const vectors = await options.embedder.embed(pieces.map((p) => p.text));
    if (vectors.length === pieces.length && pieces.length >= 2) {
      let pairSum = 0;
      let pairCount = 0;
      for (let i = 0; i < vectors.length; i++) {
        for (let j = i + 1; j < vectors.length; j++) {
          pairSum += cosineSimilarity(vectors[i], vectors[j]);
          pairCount += 1;
        }
      }
      embeddingMeanPairwiseSimilarity = pairCount > 0 ? pairSum / pairCount : 0;
      const center = centroid(vectors);
      embeddingMeanCentroidDistance =
        vectors.reduce((s, v) => s + (1 - cosineSimilarity(v, center)), 0) /
        vectors.length;
      if (options.exemplarTexts && options.exemplarTexts.length > 0) {
        const exemplarVectors = await options.embedder.embed(
          options.exemplarTexts
        );
        const exemplarCenter = centroid(exemplarVectors);
        exemplarCentroidDistance = 1 - cosineSimilarity(center, exemplarCenter);
      }
    }
  }

  return {
    genre: first?.genre ?? "",
    period: first?.period ?? "",
    pieceCount: pieces.length,
    totalWords,
    frameLoadPer1000:
      totalWords > 0 ? Math.round((frameHits / totalWords) * 1000 * 100) / 100 : 0,
    repeatedOpeningShare:
      pieces.length > 0
        ? Math.round((piecesSharing.size / pieces.length) * 1000) / 1000
        : 0,
    topRepeatedOpenings: repeated.slice(0, 10),
    sentenceLengthCvMedian: Math.round(median(cvs) * 1000) / 1000,
    sentenceLengthCvIqr:
      Math.round((quantile(cvs, 0.75) - quantile(cvs, 0.25)) * 1000) / 1000,
    mattrMean:
      Math.round(
        (measured.reduce((s, m) => s + m.measures.mattr, 0) /
          Math.max(1, measured.length)) *
          1000
      ) / 1000,
    vocabularyOverlapMean: Math.round(vocabularyOverlapMean * 1000) / 1000,
    scoreMedian: median(scores),
    scoreQ1: quantile(scores, 0.25),
    scoreQ3: quantile(scores, 0.75),
    specComplianceRate:
      orgFindings.length > 0
        ? Math.round(
            (orgFindings.filter((n) => n === 0).length / orgFindings.length) *
              1000
          ) / 1000
        : null,
    meanOrgFindingsPerPiece:
      orgFindings.length > 0
        ? Math.round(
            (orgFindings.reduce((a, b) => a + b, 0) / orgFindings.length) * 100
          ) / 100
        : null,
    embeddingMeanPairwiseSimilarity:
      embeddingMeanPairwiseSimilarity !== null
        ? Math.round(embeddingMeanPairwiseSimilarity * 1000) / 1000
        : null,
    embeddingMeanCentroidDistance:
      embeddingMeanCentroidDistance !== null
        ? Math.round(embeddingMeanCentroidDistance * 1000) / 1000
        : null,
    exemplarCentroidDistance:
      exemplarCentroidDistance !== null
        ? Math.round(exemplarCentroidDistance * 1000) / 1000
        : null,
    pieces: measured.map((m) => m.measures),
  };
}

/** Group pieces by period and genre, one GenreMeasures per group. */
export async function measureCorpus(
  pieces: CorpusPiece[],
  options: {
    spec?: OrgSpec | null;
    embedder?: Embedder | null;
    exemplarTexts?: string[];
  } = {}
): Promise<GenreMeasures[]> {
  const groups = new Map<string, CorpusPiece[]>();
  for (const piece of pieces) {
    const key = `${piece.period}::${piece.genre}`;
    const list = groups.get(key) ?? [];
    list.push(piece);
    groups.set(key, list);
  }
  const results: GenreMeasures[] = [];
  for (const key of [...groups.keys()].sort()) {
    results.push(await measureGenreSet(groups.get(key)!, options));
  }
  return results;
}
