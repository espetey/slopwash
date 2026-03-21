import type { Violation, SectionSummary } from "./types";

const SECTION_NAMES: Record<number, string> = {
  1: "Vocabulary",
  2: "Structure",
  3: "Tone & Voice",
  4: "Formatting & Style",
  5: "Content Depth",
  6: "Consistency",
};

const SECTION_WEIGHTS: Record<number, number> = {
  1: 0.25,
  2: 0.25,
  3: 0.2,
  4: 0.15,
  5: 0.1,
  6: 0.05,
};

const SEVERITY_COST: Record<string, number> = {
  high: 5,
  moderate: 3,
  low: 1,
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function computeSectionSummaries(
  violations: Violation[]
): SectionSummary[] {
  const sections: SectionSummary[] = [];

  for (const sectionNum of [1, 2, 3, 4, 5, 6]) {
    const sectionViolations = violations.filter(
      (v) => v.section === sectionNum
    );
    const penalty = sectionViolations.reduce(
      (sum, v) => sum + (SEVERITY_COST[v.severity] ?? 1),
      0
    );
    sections.push({
      section: sectionNum,
      name: SECTION_NAMES[sectionNum] ?? `Section ${sectionNum}`,
      violationCount: sectionViolations.length,
      score: clamp(100 - penalty, 0, 100),
    });
  }

  return sections;
}

export function computeOverallScore(sections: SectionSummary[]): number {
  let weightedSum = 0;
  let totalWeight = 0;

  for (const section of sections) {
    const weight = SECTION_WEIGHTS[section.section] ?? 0;
    weightedSum += section.score * weight;
    totalWeight += weight;
  }

  if (totalWeight === 0) return 100;
  return Math.round(clamp(weightedSum / totalWeight, 0, 100));
}
