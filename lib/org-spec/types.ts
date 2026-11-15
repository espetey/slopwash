import type {
  BannedTerm,
  RequiredTerm,
  ReplacementTerm,
} from "@/lib/analyzer/rules/org-terms";
import type { Severity } from "@/lib/analyzer";

/**
 * The engagement spec format (build spec section 3, Item B0). One
 * OrgSpec is one version of one org's settings. B0 ships this as a
 * file the audit tool reads; B1 stores the same shape in
 * org_spec_versions and D1 serves it. The format is defined once,
 * here, so the phases do not drift apart.
 */

export interface OrgSpecTerms {
  banned: BannedTerm[];
  required: RequiredTerm[];
  replacements: ReplacementTerm[];
}

export interface OrgSpecRules {
  /** Universal rule IDs to drop from the org view. */
  disabled: string[];
  /** Universal rule ID -> severity for the org view. */
  severityOverrides: Record<string, Severity>;
}

export interface OrgSpec {
  orgId: string;
  /** Integer, starts at 1. A new setting is a new version. */
  version: number;
  createdAt: string;
  /** Why this version exists. */
  note?: string;
  terms: OrgSpecTerms;
  rules: OrgSpecRules;
}

export function emptySpec(orgId: string, version = 1): OrgSpec {
  return {
    orgId,
    version,
    createdAt: new Date().toISOString(),
    terms: { banned: [], required: [], replacements: [] },
    rules: { disabled: [], severityOverrides: {} },
  };
}

/** Structural validation for spec files and stored spec bodies. */
export function validateSpec(input: unknown): OrgSpec {
  if (typeof input !== "object" || input === null) {
    throw new Error("Spec must be a JSON object.");
  }
  const raw = input as Record<string, unknown>;
  if (typeof raw.orgId !== "string" || !raw.orgId) {
    throw new Error("Spec must carry an orgId string.");
  }
  if (typeof raw.version !== "number" || raw.version < 1) {
    throw new Error("Spec version must be a positive integer.");
  }
  const terms = (raw.terms ?? {}) as Record<string, unknown>;
  const rules = (raw.rules ?? {}) as Record<string, unknown>;
  const spec: OrgSpec = {
    orgId: raw.orgId,
    version: raw.version,
    createdAt:
      typeof raw.createdAt === "string"
        ? raw.createdAt
        : new Date().toISOString(),
    note: typeof raw.note === "string" ? raw.note : undefined,
    terms: {
      banned: Array.isArray(terms.banned)
        ? (terms.banned as BannedTerm[])
        : [],
      required: Array.isArray(terms.required)
        ? (terms.required as RequiredTerm[])
        : [],
      replacements: Array.isArray(terms.replacements)
        ? (terms.replacements as ReplacementTerm[])
        : [],
    },
    rules: {
      disabled: Array.isArray(rules.disabled)
        ? (rules.disabled as string[])
        : [],
      severityOverrides:
        typeof rules.severityOverrides === "object" &&
        rules.severityOverrides !== null
          ? (rules.severityOverrides as Record<string, Severity>)
          : {},
    },
  };
  for (const banned of spec.terms.banned) {
    if (typeof banned.term !== "string" || !banned.term) {
      throw new Error("Each banned term needs a term string.");
    }
    if (banned.variants !== "inflect" && banned.variants !== "exact") {
      banned.variants = "inflect";
    }
  }
  return spec;
}
