import { query, queryOne } from "@/lib/db";

/**
 * Metering (item 3a): one usage_events row per keyed call, quota counts
 * by endpoint group, the model price table, the daily spend circuit
 * breaker, and flywheel triple logging for keyed rewrites.
 *
 * Quota periods follow item 3 section 3: calendar day for the free
 * tier, calendar month for paid tiers. Tier numbers are item 3
 * section 4, Erik's call to change.
 */

export interface TierLimits {
  scoreCalls: number;
  rewriteCalls: number;
  period: "day" | "month";
}

export const TIER_LIMITS: Record<string, TierLimits> = {
  free: { scoreCalls: 200, rewriteCalls: 25, period: "day" },
  pro: { scoreCalls: 20000, rewriteCalls: 3000, period: "month" },
  scale: { scoreCalls: 200000, rewriteCalls: 30000, period: "month" },
};

/** USD per million tokens, input and output. Env-overridable per model. */
const MODEL_PRICES: Record<string, { inPerMTok: number; outPerMTok: number }> =
  {
    "claude-haiku-5-5": { inPerMTok: 0.1, outPerMTok: 0.5 },
    default: { inPerMTok: 0.1, outPerMTok: 0.5 },
  };

export function estimateCostUsd(
  model: string,
  tokensIn: number | null,
  tokensOut: number | null
): number {
  const overrideIn = process.env[`MODEL_PRICE_IN_${model}`];
  const overrideOut = process.env[`MODEL_PRICE_OUT_${model}`];
  const base = MODEL_PRICES[model] ?? MODEL_PRICES.default;
  const inPrice = overrideIn ? Number(overrideIn) : base.inPerMTok;
  const outPrice = overrideOut ? Number(overrideOut) : base.outPerMTok;
  const cost =
    ((tokensIn ?? 0) / 1_000_000) * inPrice +
    ((tokensOut ?? 0) / 1_000_000) * outPrice;
  return Math.round(cost * 1_000_000) / 1_000_000;
}

function periodStartSql(period: "day" | "month"): string {
  return period === "day" ? "date_trunc('day', now())" : "date_trunc('month', now())";
}

export function periodResetUnix(period: "day" | "month"): number {
  const now = new Date();
  const reset =
    period === "day"
      ? new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
      : new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return Math.floor(reset.getTime() / 1000);
}

export interface UsageTotals {
  scoreCalls: number;
  rewriteCalls: number;
}

export async function countPeriodUsage(
  keyId: string,
  period: "day" | "month"
): Promise<UsageTotals> {
  const row = await queryOne<{ score_calls: string; rewrite_calls: string }>(
    `SELECT
       COUNT(*) FILTER (WHERE endpoint = 'score') AS score_calls,
       COUNT(*) FILTER (WHERE endpoint = 'rewrite') AS rewrite_calls
     FROM usage_events
     WHERE key_id = $1 AND ts >= ${periodStartSql(period)}`,
    [keyId]
  );
  return {
    scoreCalls: Number(row?.score_calls ?? 0),
    rewriteCalls: Number(row?.rewrite_calls ?? 0),
  };
}

export async function logUsageEvent(input: {
  keyId: string;
  endpoint: string;
  inputChars: number;
  tokensIn?: number | null;
  tokensOut?: number | null;
  estCostUsd?: number;
  orgId?: string | null;
  specVersion?: number | null;
}): Promise<void> {
  await query(
    `INSERT INTO usage_events
       (key_id, endpoint, input_chars, tokens_in, tokens_out, est_cost_usd, org_id, spec_version)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      input.keyId,
      input.endpoint,
      input.inputChars,
      input.tokensIn ?? null,
      input.tokensOut ?? null,
      input.estCostUsd ?? 0,
      input.orgId ?? null,
      input.specVersion ?? null,
    ]
  );
}

/** Sum of estimated Anthropic spend over the last 24 hours. */
export async function dailySpendEstimateUsd(): Promise<number> {
  const row = await queryOne<{ total: string | null }>(
    `SELECT COALESCE(SUM(est_cost_usd), 0) AS total
     FROM usage_events
     WHERE ts >= now() - interval '24 hours'`
  );
  return Number(row?.total ?? 0);
}

export function dailySpendCapUsd(): number {
  const raw = process.env.DAILY_SPEND_CAP_USD;
  const parsed = raw ? Number(raw) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 25;
}

export async function logFlywheelTriple(input: {
  keyId: string;
  draft: string;
  rewrite: string;
  scoreBefore: number;
  scoreAfter: number;
  model: string;
  tokensIn?: number | null;
  tokensOut?: number | null;
}): Promise<void> {
  await query(
    `INSERT INTO flywheel_triples
       (key_id, draft, rewrite, score_before, score_after, model, tokens_in, tokens_out)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      input.keyId,
      input.draft,
      input.rewrite,
      input.scoreBefore,
      input.scoreAfter,
      input.model,
      input.tokensIn ?? null,
      input.tokensOut ?? null,
    ]
  );
}

/** Flywheel raw retention is 90 days (item 3 section 7). */
export async function purgeOldFlywheelTriples(): Promise<number> {
  const rows = await query<{ count: string }>(
    `WITH deleted AS (
       DELETE FROM flywheel_triples WHERE ts < now() - interval '90 days'
       RETURNING id
     )
     SELECT COUNT(*) AS count FROM deleted`
  );
  return Number(rows[0]?.count ?? 0);
}
