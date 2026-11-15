import type { GenreMeasures } from "./measures";

/**
 * Readings (build spec section 4, Item C0; concept note section 4).
 * Turns measures and floors into one of four readings, each returned
 * with the numbers that produced it and the top repeated frames as
 * evidence.
 *
 * Floors come from a baseline: the first two periods of an org's own
 * history in a genre, or a baseline corpus the org names at the
 * start. A floor is the baseline mean of a measure moved one standard
 * deviation in the failure direction; bands are baseline mean plus
 * and minus one standard deviation. The constants live in TUNABLES,
 * in one place, and every reading prints the floor values it used.
 *
 * A genre-period under 20 pieces returns counts only, with no
 * reading issued. Insufficient data is a result, not an error.
 */

export const TUNABLES = {
  /** Pieces a genre-period needs before a reading is issued. */
  minPiecesForReading: 20,
  /** Standard deviations a floor sits from the baseline mean. */
  floorSd: 1,
  /** Dispersion measures past their floors required for collapse. */
  collapseMeasureCount: 2,
  /** Drop in a dispersion measure, period over period, that counts
   *  as thinning for the stagnation reading. */
  stagnationDrop: 0.05,
};

export type ReadingKind =
  | "healthy"
  | "drift"
  | "collapse"
  | "stagnation"
  | "insufficient-data";

export interface MeasureBand {
  mean: number;
  sd: number;
}

export interface Baseline {
  frameLoadPer1000: MeasureBand;
  repeatedOpeningShare: MeasureBand;
  sentenceLengthCvMedian: MeasureBand;
  mattrMean: MeasureBand;
  vocabularyOverlapMean: MeasureBand;
  scoreMedian: MeasureBand;
  embeddingMeanPairwiseSimilarity: MeasureBand | null;
  periodsUsed: string[];
}

export interface Reading {
  kind: ReadingKind;
  genre: string;
  period: string;
  pieceCount: number;
  /** The numbers that produced the reading, with the floors used. */
  evidence: Record<string, number | string | null>;
  floorsUsed: Record<string, number | null>;
  topRepeatedOpenings: { opening: string; pieceCount: number }[];
}

function band(values: number[]): MeasureBand {
  if (values.length === 0) return { mean: 0, sd: 0 };
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance =
    values.reduce((sum, v) => sum + (v - mean) * (v - mean), 0) /
    values.length;
  return { mean, sd: Math.sqrt(variance) };
}

/** Build a baseline from the measures of the baseline periods. */
export function baselineFromMeasures(sets: GenreMeasures[]): Baseline {
  const sims = sets
    .map((s) => s.embeddingMeanPairwiseSimilarity)
    .filter((v): v is number => v !== null);
  return {
    frameLoadPer1000: band(sets.map((s) => s.frameLoadPer1000)),
    repeatedOpeningShare: band(sets.map((s) => s.repeatedOpeningShare)),
    sentenceLengthCvMedian: band(sets.map((s) => s.sentenceLengthCvMedian)),
    mattrMean: band(sets.map((s) => s.mattrMean)),
    vocabularyOverlapMean: band(sets.map((s) => s.vocabularyOverlapMean)),
    scoreMedian: band(sets.map((s) => s.scoreMedian)),
    embeddingMeanPairwiseSimilarity:
      sims.length > 0 ? band(sims) : null,
    periodsUsed: [...new Set(sets.map((s) => s.period))],
  };
}

export function deriveReading(
  current: GenreMeasures,
  baseline: Baseline,
  previous?: GenreMeasures | null
): Reading {
  const base: Reading = {
    kind: "insufficient-data",
    genre: current.genre,
    period: current.period,
    pieceCount: current.pieceCount,
    evidence: {},
    floorsUsed: {},
    topRepeatedOpenings: current.topRepeatedOpenings,
  };
  if (current.pieceCount < TUNABLES.minPiecesForReading) {
    base.evidence = {
      pieceCount: current.pieceCount,
      minimumPieces: TUNABLES.minPiecesForReading,
      totalWords: current.totalWords,
    };
    return base;
  }

  const sd = TUNABLES.floorSd;
  // Failure-direction thresholds.
  const frameCeiling = baseline.frameLoadPer1000.mean + sd * baseline.frameLoadPer1000.sd;
  const openingCeiling =
    baseline.repeatedOpeningShare.mean + sd * baseline.repeatedOpeningShare.sd;
  const cvFloor =
    baseline.sentenceLengthCvMedian.mean - sd * baseline.sentenceLengthCvMedian.sd;
  const mattrFloor = baseline.mattrMean.mean - sd * baseline.mattrMean.sd;
  const overlapCeiling =
    baseline.vocabularyOverlapMean.mean + sd * baseline.vocabularyOverlapMean.sd;
  const simCeiling = baseline.embeddingMeanPairwiseSimilarity
    ? baseline.embeddingMeanPairwiseSimilarity.mean +
      sd * baseline.embeddingMeanPairwiseSimilarity.sd
    : null;
  const scoreBandLow = baseline.scoreMedian.mean - sd * baseline.scoreMedian.sd;
  const scoreBandHigh = baseline.scoreMedian.mean + sd * baseline.scoreMedian.sd;

  // Dispersion failures: variation draining out of the set.
  let dispersionFailures = 0;
  if (current.frameLoadPer1000 > frameCeiling) dispersionFailures += 1;
  if (current.repeatedOpeningShare > openingCeiling) dispersionFailures += 1;
  if (current.sentenceLengthCvMedian < cvFloor) dispersionFailures += 1;
  if (current.mattrMean < mattrFloor) dispersionFailures += 1;
  if (current.vocabularyOverlapMean > overlapCeiling) dispersionFailures += 1;
  if (
    simCeiling !== null &&
    current.embeddingMeanPairwiseSimilarity !== null &&
    current.embeddingMeanPairwiseSimilarity > simCeiling
  ) {
    dispersionFailures += 1;
  }

  // Center movement: the median score leaves the baseline band, or
  // the exemplar distance grows past its band when embeddings ran.
  const centerMoved =
    current.scoreMedian < scoreBandLow || current.scoreMedian > scoreBandHigh;

  const thinning =
    previous != null &&
    (previous.sentenceLengthCvMedian - current.sentenceLengthCvMedian >=
      TUNABLES.stagnationDrop ||
      previous.mattrMean - current.mattrMean >= TUNABLES.stagnationDrop);

  let kind: ReadingKind = "healthy";
  if (dispersionFailures >= TUNABLES.collapseMeasureCount && !centerMoved) {
    kind = "collapse";
  } else if (centerMoved && dispersionFailures < TUNABLES.collapseMeasureCount) {
    kind = "drift";
  } else if (!centerMoved && dispersionFailures < TUNABLES.collapseMeasureCount && thinning) {
    kind = "stagnation";
  } else if (dispersionFailures >= TUNABLES.collapseMeasureCount && centerMoved) {
    // Both axes fail: the set is converging while the center moves.
    // Collapse is the reading with an action at the source; the
    // center movement is printed in the evidence either way.
    kind = "collapse";
  }

  return {
    kind,
    genre: current.genre,
    period: current.period,
    pieceCount: current.pieceCount,
    evidence: {
      frameLoadPer1000: current.frameLoadPer1000,
      repeatedOpeningShare: current.repeatedOpeningShare,
      sentenceLengthCvMedian: current.sentenceLengthCvMedian,
      mattrMean: current.mattrMean,
      vocabularyOverlapMean: current.vocabularyOverlapMean,
      scoreMedian: current.scoreMedian,
      embeddingMeanPairwiseSimilarity: current.embeddingMeanPairwiseSimilarity,
      dispersionFailures,
      centerMoved: centerMoved ? "yes" : "no",
    },
    floorsUsed: {
      frameLoadCeiling: Math.round(frameCeiling * 1000) / 1000,
      repeatedOpeningCeiling: Math.round(openingCeiling * 1000) / 1000,
      sentenceLengthCvFloor: Math.round(cvFloor * 1000) / 1000,
      mattrFloor: Math.round(mattrFloor * 1000) / 1000,
      vocabularyOverlapCeiling: Math.round(overlapCeiling * 1000) / 1000,
      embeddingSimilarityCeiling:
        simCeiling !== null ? Math.round(simCeiling * 1000) / 1000 : null,
      scoreBandLow: Math.round(scoreBandLow * 100) / 100,
      scoreBandHigh: Math.round(scoreBandHigh * 100) / 100,
    },
    topRepeatedOpenings: current.topRepeatedOpenings,
  };
}
