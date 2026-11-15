import { NextRequest, NextResponse } from "next/server";
import { isDbConfigured } from "@/lib/db";
import { findKeyByPlaintext, touchKeyLastUsed, type ApiKeyRow } from "./keys";
import {
  TIER_LIMITS,
  countPeriodUsage,
  periodResetUnix,
  type TierLimits,
} from "./metering";

/**
 * requireKeyOrAnon (item 3 sections 1 and 2).
 *
 * - No key header: anonymous. The caller applies the existing IP rate
 *   limits; nothing is logged and nothing is stored.
 * - Key header present: the key is verified by hash lookup. Unknown
 *   hash returns 401, a revoked key 403, and a key over its tier quota
 *   for the endpoint group returns 429 with X-Quota-Reset.
 * - Key header present but no database configured: 503. A key cannot
 *   be verified without the database, and keyed calls fail closed
 *   rather than slipping onto the anonymous path.
 */

export type EndpointGroup = "score" | "rewrite";

export interface KeyContext {
  kind: "key";
  key: ApiKeyRow;
  limits: TierLimits;
  quota: { limit: number; remaining: number; reset: number };
}

export interface AnonContext {
  kind: "anon";
}

export type AuthContext = KeyContext | AnonContext;

export type AuthResult =
  | { ok: true; context: AuthContext }
  | { ok: false; response: NextResponse };

export function extractKey(req: NextRequest): string | null {
  const auth = req.headers.get("authorization");
  if (auth && auth.toLowerCase().startsWith("bearer ")) {
    const token = auth.slice(7).trim();
    if (token) return token;
  }
  const apiKey = req.headers.get("x-api-key");
  if (apiKey && apiKey.trim()) return apiKey.trim();
  return null;
}

export function hasKeyHeader(req: NextRequest): boolean {
  return extractKey(req) !== null;
}

export async function requireKeyOrAnon(
  req: NextRequest,
  group: EndpointGroup
): Promise<AuthResult> {
  const plaintext = extractKey(req);
  if (!plaintext) {
    return { ok: true, context: { kind: "anon" } };
  }

  if (!isDbConfigured()) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error:
            "API keys are not configured on this deployment yet. Remove the key header for anonymous use.",
        },
        { status: 503 }
      ),
    };
  }

  let key: ApiKeyRow | null;
  try {
    key = await findKeyByPlaintext(plaintext);
  } catch {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "The API key store is unavailable. Try again later." },
        { status: 503 }
      ),
    };
  }

  if (!key) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Unknown API key." },
        { status: 401 }
      ),
    };
  }
  if (key.revoked_at) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "This API key has been revoked." },
        { status: 403 }
      ),
    };
  }

  const requiredScope = group;
  if (!key.scopes.includes(requiredScope)) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: `This API key does not carry the ${requiredScope} scope.` },
        { status: 403 }
      ),
    };
  }

  const limits = TIER_LIMITS[key.tier] ?? TIER_LIMITS.free;
  const usage = await countPeriodUsage(key.id, limits.period);
  const used = group === "score" ? usage.scoreCalls : usage.rewriteCalls;
  const limit = group === "score" ? limits.scoreCalls : limits.rewriteCalls;
  const reset = periodResetUnix(limits.period);

  if (used >= limit) {
    const response = NextResponse.json(
      {
        error: `Quota exceeded for the ${key.tier} tier: ${limit} ${group} calls per ${limits.period}.`,
      },
      { status: 429 }
    );
    response.headers.set("X-Quota-Reset", String(reset));
    response.headers.set("X-RateLimit-Limit", String(limit));
    response.headers.set("X-RateLimit-Remaining", "0");
    return { ok: false, response };
  }

  // last_used_at updates off the response path (item 3 section 2).
  void touchKeyLastUsed(key.id).catch(() => undefined);

  return {
    ok: true,
    context: {
      kind: "key",
      key,
      limits,
      quota: { limit, remaining: limit - used, reset },
    },
  };
}

/** Set the item 3 rate headers on a keyed response. */
export function applyRateHeaders(
  response: NextResponse,
  context: KeyContext
): void {
  response.headers.set("X-RateLimit-Limit", String(context.quota.limit));
  response.headers.set(
    "X-RateLimit-Remaining",
    String(Math.max(0, context.quota.remaining - 1))
  );
  response.headers.set("X-Quota-Reset", String(context.quota.reset));
}

export type OrgKeyResult =
  | { ok: true; key: ApiKeyRow }
  | { ok: false; response: NextResponse };

/**
 * Gate for the org-bound surfaces (build spec D2). Unlike
 * requireKeyOrAnon there is no anonymous path here: the request must
 * carry a key, the key must belong to an org, and it must carry the
 * named scope. Corpus reads carry no tier quota until Erik sets the
 * allowances (decision D-3); the routes run for admin-issued keys
 * with metering rows written per call.
 */
export async function requireOrgKey(
  req: NextRequest,
  scope: string
): Promise<OrgKeyResult> {
  const plaintext = extractKey(req);
  if (!plaintext) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "An API key is required for this route." },
        { status: 401 }
      ),
    };
  }
  if (!isDbConfigured()) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error:
            "API keys are not configured on this deployment yet.",
        },
        { status: 503 }
      ),
    };
  }
  let key: ApiKeyRow | null;
  try {
    key = await findKeyByPlaintext(plaintext);
  } catch {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "The API key store is unavailable. Try again later." },
        { status: 503 }
      ),
    };
  }
  if (!key) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Unknown API key." },
        { status: 401 }
      ),
    };
  }
  if (key.revoked_at) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "This API key has been revoked." },
        { status: 403 }
      ),
    };
  }
  if (!key.org_id) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "This API key is not bound to an org." },
        { status: 403 }
      ),
    };
  }
  if (!key.scopes.includes(scope)) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: `This API key does not carry the ${scope} scope.`,
        },
        { status: 403 }
      ),
    };
  }
  void touchKeyLastUsed(key.id).catch(() => undefined);
  return { ok: true, key };
}

/** Admin gate for issuance and org management: the ADMIN_SECRET env var. */
export function requireAdmin(req: NextRequest): NextResponse | null {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "Admin access is not configured on this deployment." },
      { status: 503 }
    );
  }
  const header =
    req.headers.get("x-admin-secret") ??
    (req.headers.get("authorization")?.toLowerCase().startsWith("bearer ")
      ? req.headers.get("authorization")!.slice(7).trim()
      : null);
  if (header !== secret) {
    return NextResponse.json(
      { error: "Admin authorization required." },
      { status: 401 }
    );
  }
  if (!isDbConfigured()) {
    return NextResponse.json(
      { error: "The database is not configured on this deployment." },
      { status: 503 }
    );
  }
  return null;
}
