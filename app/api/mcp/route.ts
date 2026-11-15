import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { z } from "zod";
import { personaIds } from "@/lib/personas";
import {
  buildPrompt,
  buildRewriteRequest,
  promptModes,
  type PromptMode,
} from "@/lib/prompt";
import { auditRewrite } from "@/lib/rewrite-audit";
import {
  analyze,
  ANALYZER_VERSION,
  RULESET_VERSION,
} from "@/lib/analyzer";
import { modelIds } from "@/lib/analyzer/models";
import { isDbConfigured } from "@/lib/db";
import { findKeyByPlaintext } from "@/lib/api/keys";
import { logUsageEvent } from "@/lib/api/metering";
import { checkWithSpec } from "@/lib/org-spec/check";
import {
  getLatestSpec,
  getOrg,
  getSpecVersion,
  recordCheckRun,
} from "@/lib/org-spec/store";
import {
  DuplicatePieceError,
  ingestPiece,
} from "@/lib/corpus/ingest";
import { getRun, listRuns, runPeriod } from "@/lib/corpus/store";
import { renderGenreReport } from "@/lib/corpus/report";
import { GENRES } from "@/lib/corpus/genres";
import type { ApiKeyRow } from "@/lib/api/keys";

const personaSchema = z
  .array(z.enum(personaIds as [string, ...string[]]))
  .optional()
  .describe(
    "Optional persona(s) to overlay on the base prompt. Choices: researcher, technologist, scientist, journalist, humorist, manager, marketer, sales, critic, historian, policy-analyst, economist, novelist"
  );

const modelSchema = z
  .enum(modelIds as [string, ...string[]])
  .optional()
  .describe(
    "Optional model ID for model-specific rules. Choices: gpt-4o, claude, gemini, llama"
  );

const narrativeSchema = z
  .boolean()
  .optional()
  .describe("Load Section 9 for fiction, scenes, or narrative nonfiction");

const modeSchema = z
  .enum(promptModes as [PromptMode, ...PromptMode[]])
  .optional()
  .describe(
    "rewrite (default): system prompt for rewriting the text in the user message, optionally wrapped in <draft> tags. skill: on-demand editor for text or files the user names. rules: always-on writing rules for prose the agent writes itself"
  );

const readOnly = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
};

const mutating = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: false,
  openWorldHint: false,
};

function parsePersonaList(value?: string): string[] | undefined {
  const ids = (value ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter((id) => personaIds.includes(id));
  return ids.length > 0 ? ids : undefined;
}

function extractKeyHeader(headers: Headers): string | null {
  const auth = headers.get("authorization");
  if (auth && auth.toLowerCase().startsWith("bearer ")) {
    const token = auth.slice(7).trim();
    if (token) return token;
  }
  const apiKey = headers.get("x-api-key");
  if (apiKey && apiKey.trim()) return apiKey.trim();
  return null;
}

function createServer(requestHeaders?: Headers) {
  const server = new McpServer({
    name: "slopwash",
    version: "1.1.0",
  });

  server.registerTool(
    "get_slopwash_prompt",
    {
      title: "Get slopwash prompt",
      description:
        "Get the slopwash prompt that scrubs AI tells from writing. mode=rewrite (default) returns a system prompt; send the source text as the user message, wrapped in <draft> tags. mode=skill returns an on-demand editing prompt. mode=rules returns always-on writing rules for the agent's own prose. Optionally add persona, model, or narrative rules.",
      inputSchema: {
        mode: modeSchema,
        personas: personaSchema,
        model: modelSchema,
        narrative: narrativeSchema,
      },
      annotations: readOnly,
    },
    async ({ mode, personas, model, narrative }) => {
      const prompt = buildPrompt(personas, model, {
        includeNarrative: narrative,
        mode,
      });
      return {
        content: [{ type: "text" as const, text: prompt }],
      };
    }
  );

  server.registerTool(
    "prepare_rewrite",
    {
      title: "Prepare rewrite request",
      description:
        "Build a slopwash system prompt and a user message with the source safely wrapped in <draft> tags. Use the returned fields as separate messages in an LLM request.",
      inputSchema: {
        text: z.string().describe("The source text to rewrite"),
        personas: personaSchema,
        model: modelSchema,
        narrative: narrativeSchema,
      },
      annotations: readOnly,
    },
    async ({ text, personas, model, narrative }) => {
      const request = buildRewriteRequest(text, personas, model, {
        includeNarrative: narrative,
      });
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(request, null, 2),
          },
        ],
      };
    }
  );

  server.registerTool(
    "audit_rewrite",
    {
      title: "Audit rewrite",
      description:
        "Compare an LLM rewrite with its source. Flags invented numbers, added length or punctuation, and slop patterns. If it fails, send retryMessage to the same model for one correction pass, then audit the result again.",
      inputSchema: {
        original: z.string().describe("The original source text"),
        rewritten: z.string().describe("The model's rewritten text"),
        model: modelSchema,
        narrative: narrativeSchema,
      },
      annotations: readOnly,
    },
    async ({ original, rewritten, model, narrative }) => {
      const result = auditRewrite(original, rewritten, { model, narrative });
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }
  );

  server.registerTool(
    "analyze_text",
    {
      title: "Analyze text",
      description:
        "Analyze text for AI writing patterns (slop) without rewriting it. Returns a score (0-100, higher is better), section-by-section breakdown, and a list of specific violations found. No LLM is called. Enable narrative for stories, scenes, or narrative nonfiction. When the MCP request carries an API key bound to an org, the read also runs against the org's spec and the summary names the spec version; without a key it runs against the universal ruleset only.",
      inputSchema: {
        text: z
          .string()
          .describe("The text to analyze for AI writing patterns"),
        model: modelSchema,
        narrative: narrativeSchema,
        spec_version: z
          .number()
          .int()
          .positive()
          .optional()
          .describe(
            "Optional org spec version to read against. Default: the org's latest version. Only applies when the request carries an org key."
          ),
      },
      annotations: readOnly,
    },
    async ({ text, model, narrative, spec_version }) => {
      const result = analyze(text, { model, narrative });

      const sectionLines = result.sections
        .map(
          (s) =>
            `  ${s.name}: ${s.score}/100 (${s.violationCount} issue${s.violationCount !== 1 ? "s" : ""})`
        )
        .join("\n");

      const topViolations = result.violations
        .slice(0, 20)
        .map(
          (v) =>
            `  [${v.severity}] ${v.message} — "${v.match.length > 50 ? v.match.slice(0, 50) + "..." : v.match}"`
        )
        .join("\n");

      // Item D1: an org key on the MCP request runs the org read and
      // the summary names the spec version. No key (or a key the
      // store does not accept) runs the universal read, and the
      // summary says so.
      let orgLines: string[] = [
        "Read against the universal ruleset only (no org spec applied).",
      ];
      const keyPlaintext = requestHeaders
        ? extractKeyHeader(requestHeaders)
        : null;
      if (keyPlaintext && isDbConfigured()) {
        try {
          const key = await findKeyByPlaintext(keyPlaintext);
          if (key && !key.revoked_at && key.org_id) {
            const specRow =
              spec_version !== undefined
                ? await getSpecVersion(key.org_id, spec_version)
                : await getLatestSpec(key.org_id);
            if (specRow) {
              const org = await getOrg(key.org_id);
              const orgCheck = checkWithSpec(text, specRow.spec, {
                model,
                narrative,
              });
              const termLines = orgCheck.org.termFindings
                .slice(0, 20)
                .map(
                  (v) =>
                    `  [${v.severity}] ${v.message} — "${v.match.length > 50 ? v.match.slice(0, 50) + "..." : v.match}"`
                )
                .join("\n");
              orgLines = [
                `Org spec: ${org?.name ?? key.org_id}, spec version ${specRow.version} (analyzer ${ANALYZER_VERSION}, ruleset ${RULESET_VERSION}).`,
                `Org view score: ${orgCheck.org.score}/100 | Org findings: ${orgCheck.org.violations.length} rule findings, ${orgCheck.org.termFindings.length} term findings`,
                ...(termLines ? [``, `Org term findings:`, termLines] : []),
              ];
              await recordCheckRun({
                orgId: key.org_id,
                keyId: key.id,
                specVersion: specRow.version,
                surface: "mcp",
                text,
                result: orgCheck,
              }).catch(() => undefined);
              await logUsageEvent({
                keyId: key.id,
                endpoint: "score",
                inputChars: text.length,
                orgId: key.org_id,
                specVersion: specRow.version,
              }).catch(() => undefined);
            } else if (spec_version !== undefined) {
              orgLines = [
                `This org has no spec version ${spec_version}. Read ran against the universal ruleset only.`,
              ];
            }
          } else if (keyPlaintext) {
            orgLines = [
              "The API key was not accepted. Read ran against the universal ruleset only.",
            ];
          }
        } catch {
          orgLines = [
            "The org spec store is unavailable. Read ran against the universal ruleset only.",
          ];
        }
      }

      const summary = [
        `Score: ${result.score}/100`,
        `Words: ${result.wordCount} | Sentences: ${result.sentenceCount} | Violations: ${result.violations.length}`,
        ``,
        `Sections:`,
        sectionLines,
        ``,
        `Top violations:`,
        topViolations || "  (none)",
        ``,
        ...orgLines,
      ].join("\n");

      return {
        content: [{ type: "text" as const, text: summary }],
      };
    }
  );

  // Item D2 corpus tools. They mirror the corpus API and require a
  // key with the corpus scope, bound to an org, on the request.
  async function resolveCorpusKey(): Promise<
    { key: ApiKeyRow } | { error: string }
  > {
    const plaintext = requestHeaders
      ? extractKeyHeader(requestHeaders)
      : null;
    if (!plaintext) {
      return { error: "The corpus tools need an API key on the request." };
    }
    if (!isDbConfigured()) {
      return { error: "API keys are not configured on this deployment." };
    }
    const key = await findKeyByPlaintext(plaintext).catch(() => null);
    if (!key) return { error: "The API key was not accepted." };
    if (key.revoked_at) return { error: "This API key has been revoked." };
    if (!key.org_id) {
      return { error: "This API key is not bound to an org." };
    }
    if (!key.scopes.includes("corpus")) {
      return { error: "This API key does not carry the corpus scope." };
    }
    return { key };
  }

  function toolError(message: string) {
    return {
      content: [{ type: "text" as const, text: message }],
      isError: true,
    };
  }

  server.registerTool(
    "submit_corpus_piece",
    {
      title: "Submit corpus piece",
      description:
        "Add one published piece to the org's corpus, as text or as a URL the server fetches. Needs a genre from the v1 list and an org-defined period label. A duplicate text within the org and period is refused with the existing piece named.",
      inputSchema: {
        period: z.string().describe("Org-defined period label, such as 2026-Q4"),
        genre: z
          .enum(GENRES as unknown as [string, ...string[]])
          .describe("Genre from the v1 list"),
        title: z.string().optional().describe("Piece title"),
        text: z.string().optional().describe("The piece text"),
        url: z
          .string()
          .optional()
          .describe("A URL the server fetches when no text is given"),
      },
      annotations: mutating,
    },
    async ({ period, genre, title, text, url }) => {
      const resolved = await resolveCorpusKey();
      if ("error" in resolved) return toolError(resolved.error);
      try {
        const piece = await ingestPiece({
          orgId: resolved.key.org_id!,
          period,
          genre,
          title: title ?? null,
          text,
          url,
        });
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  id: piece.id,
                  period: piece.period,
                  genre: piece.genre,
                  title: piece.title,
                  chars: piece.text.length,
                  retention_until: piece.retention_until,
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (err) {
        if (err instanceof DuplicatePieceError) {
          return toolError(err.message);
        }
        return toolError(
          err instanceof Error ? err.message : "Unknown error"
        );
      }
    }
  );

  server.registerTool(
    "run_corpus_read",
    {
      title: "Run corpus read",
      description:
        "Close a period and run the corpus read for the org: one run per genre in the period, measures computed, floors drawn from stored prior periods, one corpus_runs row and one corpus_run usage row per genre.",
      inputSchema: {
        period: z.string().describe("The period label to run"),
      },
      annotations: mutating,
    },
    async ({ period }) => {
      const resolved = await resolveCorpusKey();
      if ("error" in resolved) return toolError(resolved.error);
      const runs = await runPeriod({
        orgId: resolved.key.org_id!,
        period,
        keyId: resolved.key.id,
      });
      if (runs.length === 0) {
        return toolError(
          `No pieces stored for period "${period}" in this org.`
        );
      }
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              runs.map((r) => ({
                run_id: r.id,
                genre: r.genre,
                reading: r.reading,
                piece_count: r.measures.pieceCount,
              })),
              null,
              2
            ),
          },
        ],
      };
    }
  );

  server.registerTool(
    "get_corpus_report",
    {
      title: "Get corpus report",
      description:
        "Fetch a stored corpus run by id and render the genre report across all periods on record: the two axes as tables, the readings with their numbers, the floors with their baseline, and the named repeated openings.",
      inputSchema: {
        run_id: z.string().describe("The corpus run id"),
      },
      annotations: readOnly,
    },
    async ({ run_id }) => {
      const resolved = await resolveCorpusKey();
      if ("error" in resolved) return toolError(resolved.error);
      const run = await getRun(run_id);
      if (!run || run.org_id !== resolved.key.org_id) {
        return toolError("No corpus run with that id for this org.");
      }
      const org = await getOrg(resolved.key.org_id!);
      const genreRuns = await listRuns({
        orgId: resolved.key.org_id!,
        genre: run.genre,
      });
      const report = renderGenreReport({
        orgName: org?.name ?? resolved.key.org_id!,
        genre: run.genre,
        runs: genreRuns,
      });
      return {
        content: [{ type: "text" as const, text: report }],
      };
    }
  );

  server.registerPrompt(
    "rewrite",
    {
      title: "slopwash: rewrite text",
      description:
        "Rewrite pasted text with the slopwash rules. The model returns only the rewritten text.",
      argsSchema: {
        text: z.string().describe("The text to rewrite"),
        personas: z
          .string()
          .optional()
          .describe("Optional comma-separated persona IDs, such as journalist,technologist"),
      },
    },
    ({ text, personas }) => {
      const request = buildRewriteRequest(text, parsePersonaList(personas));
      return {
        messages: [
          {
            role: "user" as const,
            content: {
              type: "text" as const,
              text: `${request.systemPrompt}\n\n${request.userMessage}`,
            },
          },
        ],
      };
    }
  );

  server.registerPrompt(
    "writing_rules",
    {
      title: "slopwash: writing rules",
      description:
        "Load the slopwash writing rules for the rest of this conversation, so the agent's own prose follows them.",
    },
    () => ({
      messages: [
        {
          role: "user" as const,
          content: {
            type: "text" as const,
            text: `${buildPrompt(undefined, undefined, { mode: "rules" })}\n\nFollow these rules for the rest of this conversation. Reply with one short sentence confirming, then wait for my next request.`,
          },
        },
      ],
    })
  );

  return server;
}

function createTransport() {
  return new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined, // stateless
    enableJsonResponse: true,
  });
}

export async function POST(req: Request) {
  const server = createServer(req.headers);
  const transport = createTransport();

  await server.connect(transport);
  const response = await transport.handleRequest(req);
  return response;
}

export async function GET(req: Request) {
  const server = createServer(req.headers);
  const transport = createTransport();

  await server.connect(transport);
  const response = await transport.handleRequest(req);
  return response;
}

export async function DELETE(req: Request) {
  const server = createServer(req.headers);
  const transport = createTransport();

  await server.connect(transport);
  const response = await transport.handleRequest(req);
  return response;
}
