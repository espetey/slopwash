import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { z } from "zod";
import { personaIds } from "@/lib/personas";
import { buildPrompt, buildRewriteRequest } from "@/lib/prompt";
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

function createServer() {
  const server = new McpServer({
    name: "slopwash",
    version: "1.0.0",
  });

  server.tool(
    "get_slopwash_prompt",
    "Get the slopwash prompt that scrubs AI tells from writing. Optionally add persona, model, or narrative rules. Put source text in <draft> tags before sending it as the user message.",
    {
      personas: personaSchema,
      model: modelSchema,
      narrative: narrativeSchema,
    },
    async ({ personas, model, narrative }) => {
      const prompt = buildPrompt(personas, model, {
        includeNarrative: narrative,
      });
      return {
        content: [{ type: "text" as const, text: prompt }],
      };
    }
  );

  server.tool(
    "prepare_rewrite",
    "Build a slopwash system prompt and a user message with the source safely wrapped in <draft> tags. Use the returned fields as separate messages in an LLM request.",
    {
      text: z.string().describe("The source text to rewrite"),
      personas: personaSchema,
      model: modelSchema,
      narrative: narrativeSchema,
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

  server.tool(
    "audit_rewrite",
    "Compare an LLM rewrite with its source. Flags invented numbers, added length or punctuation, and slop patterns. If it fails, send retryMessage to the same model for one correction pass, then audit the result again.",
    {
      original: z.string().describe("The original source text"),
      rewritten: z.string().describe("The model's rewritten text"),
      model: modelSchema,
      narrative: narrativeSchema,
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

  server.tool(
    "analyze_text",
    "Analyze text for AI writing patterns (slop) without rewriting it. Returns a score (0-100, higher is better), section-by-section breakdown, and a list of specific violations found. No LLM is called. Enable narrative for stories, scenes, or narrative nonfiction.",
    {
      text: z
        .string()
        .describe("The text to analyze for AI writing patterns"),
      model: modelSchema,
      narrative: narrativeSchema,
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

  return server;
}

export async function POST(req: Request) {
  const server = createServer();
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined, // stateless
  });

  await server.connect(transport);
  const response = await transport.handleRequest(req);
  return response;
}

export async function GET(req: Request) {
  const server = createServer();
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });

  await server.connect(transport);
  const response = await transport.handleRequest(req);
  return response;
}

export async function DELETE(req: Request) {
  const server = createServer();
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });

  await server.connect(transport);
  const response = await transport.handleRequest(req);
  return response;
}
