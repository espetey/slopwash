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
import { analyze } from "@/lib/analyzer";
import { modelIds } from "@/lib/analyzer/models";

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

function parsePersonaList(value?: string): string[] | undefined {
  const ids = (value ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter((id) => personaIds.includes(id));
  return ids.length > 0 ? ids : undefined;
}

function createServer() {
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
        "Analyze text for AI writing patterns (slop) without rewriting it. Returns a score (0-100, higher is better), section-by-section breakdown, and a list of specific violations found. No LLM is called. Enable narrative for stories, scenes, or narrative nonfiction.",
      inputSchema: {
        text: z
          .string()
          .describe("The text to analyze for AI writing patterns"),
        model: modelSchema,
        narrative: narrativeSchema,
      },
      annotations: readOnly,
    },
    async ({ text, model, narrative }) => {
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

      const summary = [
        `Score: ${result.score}/100`,
        `Words: ${result.wordCount} | Sentences: ${result.sentenceCount} | Violations: ${result.violations.length}`,
        ``,
        `Sections:`,
        sectionLines,
        ``,
        `Top violations:`,
        topViolations || "  (none)",
      ].join("\n");

      return {
        content: [{ type: "text" as const, text: summary }],
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
  const server = createServer();
  const transport = createTransport();

  await server.connect(transport);
  const response = await transport.handleRequest(req);
  return response;
}

export async function GET(req: Request) {
  const server = createServer();
  const transport = createTransport();

  await server.connect(transport);
  const response = await transport.handleRequest(req);
  return response;
}

export async function DELETE(req: Request) {
  const server = createServer();
  const transport = createTransport();

  await server.connect(transport);
  const response = await transport.handleRequest(req);
  return response;
}
