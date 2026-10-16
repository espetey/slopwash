import { NextRequest, NextResponse } from "next/server";
import { analyze } from "@/lib/analyzer";
import type { Violation } from "@/lib/analyzer";

/**
 * POST /api/score — deterministic (Layer A) slop score.
 *
 * Scores text for AI-tell density using the rule engine in lib/analyzer.
 * No model is called; this is the cheap, fast, interpretable layer.
 * The LLM-judge layer (Layer B) is not built yet and is not applied here.
 *
 * Calibration scale: 90-100 clean human-grade prose; 70-89 light tells;
 * 50-69 obvious AI texture; below 50 slop.
 *
 * Request:  { "text": string, "model"?: string, "narrative"?: boolean }
 * Response: { "score": number, "word_count": number,
 *             "categories": [{ "id", "label", "deduction", "evidence": string[] }] }
 *
 * Only categories with at least one violation are returned, ordered by
 * deduction descending. Deductions use the same severity costs as the
 * overall score (high=5, moderate=3, low=1).
 */

const MAX_TEXT_LENGTH = 50000;

// Best-effort per-IP rate limit until key-based metering lands (item 3).
const RATE_LIMIT_PER_HOUR = 60;
const WINDOW_MS = 60 * 60 * 1000;
const hits = new Map<string, { count: number; reset: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = hits.get(ip);
  if (!entry || now > entry.reset) {
    hits.set(ip, { count: 1, reset: now + WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > RATE_LIMIT_PER_HOUR;
}

const SEVERITY_COST: Record<string, number> = {
  high: 5,
  moderate: 3,
  low: 1,
};

interface CategoryDef {
  id: string;
  label: string;
  matches: (rule: string) => boolean;
}

// Maps the roadmap's tell categories onto the deterministic rule IDs.
// synonym_cycling has no deterministic rule (it belongs to the future
// LLM-judge layer) and is therefore omitted.
const CATEGORIES: CategoryDef[] = [
  {
    id: "vocab_clusters",
    label: "AI-vocabulary clusters",
    matches: (rule) => rule.startsWith("1.") && rule !== "1.2",
  },
  {
    id: "inflated_verbs",
    label: "Inflated verbs",
    matches: (rule) => rule === "1.2",
  },
  {
    id: "emdash_density",
    label: "Em-dash density",
    matches: (rule) => rule === "4.1",
  },
  {
    id: "contrast_frames",
    label: "\u201cNot just X, but Y\u201d frames",
    matches: (rule) => rule === "2.1",
  },
  {
    id: "closing_summaries",
    label: "Closing summaries",
    matches: (rule) => rule === "2.4" || rule === "4.8",
  },
  {
    id: "trailing_ing",
    label: "Trailing \u201c-ing\u201d clauses",
    matches: (rule) => rule === "2.5",
  },
  {
    id: "rhetorical_questions",
    label: "Rhetorical questions",
    matches: (rule) => rule === "2.7",
  },
  {
    id: "sincerity_labels",
    label: "Sincerity labels",
    matches: (rule) => rule === "3.6",
  },
  {
    id: "intensifiers",
    label: "Intensifiers",
    matches: (rule) => rule === "3.9",
  },
];

interface CategoryResult {
  id: string;
  label: string;
  deduction: number;
  evidence: string[];
}

function buildCategories(violations: Violation[]): CategoryResult[] {
  const results: CategoryResult[] = [];

  for (const def of CATEGORIES) {
    const hits = violations.filter((v) => def.matches(v.rule));
    if (hits.length === 0) continue;

    const deduction = hits.reduce(
      (sum, v) => sum + (SEVERITY_COST[v.severity] ?? 1),
      0
    );

    const seen = new Set<string>();
    const evidence: string[] = [];
    for (const v of hits) {
      const snippet =
        v.match.length > 80 ? v.match.slice(0, 80) + "..." : v.match;
      if (!seen.has(snippet)) {
        seen.add(snippet);
        evidence.push(snippet);
      }
      if (evidence.length >= 5) break;
    }

    results.push({ id: def.id, label: def.label, deduction, evidence });
  }

  results.sort((a, b) => b.deduction - a.deduction);
  return results;
}

function clientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (isRateLimited(clientIp(req))) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Try again later." },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON." },
      { status: 400 }
    );
  }

  const text =
    typeof body === "object" && body !== null
      ? (body as Record<string, unknown>).text
      : undefined;
  if (typeof text !== "string" || text.trim().length === 0) {
    return NextResponse.json(
      { error: 'Request body must include a non-empty "text" string.' },
      { status: 400 }
    );
  }
  if (text.length > MAX_TEXT_LENGTH) {
    return NextResponse.json(
      { error: `Text exceeds the ${MAX_TEXT_LENGTH}-character limit.` },
      { status: 413 }
    );
  }

  const opts = body as Record<string, unknown>;
  const model = typeof opts.model === "string" ? opts.model : undefined;
  const narrative = opts.narrative === true;

  const result = analyze(text, { model, narrative });

  return NextResponse.json({
    score: result.score,
    word_count: result.wordCount,
    categories: buildCategories(result.violations),
  });
}
