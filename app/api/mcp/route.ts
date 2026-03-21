import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { z } from "zod";
import { personaIds } from "@/lib/personas";
import { buildPrompt } from "@/lib/prompt";
import { analyze } from "@/lib/analyzer";
import { modelIds } from "@/lib/analyzer/models";

function createServer() {
  const server = new McpServer({
    name: "slopwash",
    version: "1.0.0",
  });

  server.tool(
    "get_slopwash_prompt",
    "Get the slopwash prompt that scrubs AI tells from writing. Optionally specify one or more personas to add voice/tone overlays and/or a model to add model-specific rules. Use as a system prompt, then paste in text to be rewritten.",
    {
      personas: z
        .array(z.enum(personaIds as [string, ...string[]]))
        .optional()
        .describe(
          "Optional persona(s) to overlay on the base prompt. Choices: researcher, technologist, scientist, journalist, humorist, manager, marketer, sales, critic, historian, policy-analyst, economist, novelist"
        ),
      model: z
        .enum(modelIds as [string, ...string[]])
        .optional()
        .describe(
          "Optional model ID to add model-specific rules. Choices: gpt-4o, claude, gemini, llama"
        ),
    },
    async ({ personas, model }) => {
      const prompt = buildPrompt(personas, model);
      return {
        content: [{ type: "text" as const, text: prompt }],
      };
    }
  );

  server.tool(
    "analyze_text",
    "Analyze text for AI writing patterns (slop) without rewriting it. Returns a score (0-100, higher is better), section-by-section breakdown, and a list of specific violations found. No LLM is called; this is pure heuristic analysis.",
    {
      text: z
        .string()
        .describe("The text to analyze for AI writing patterns"),
      model: z
        .enum(modelIds as [string, ...string[]])
        .optional()
        .describe(
          "Optional model ID for model-specific pattern detection. Choices: gpt-4o, claude, gemini, llama"
        ),
    },
    async ({ text, model }) => {
      const result = analyze(text, model ? { model } : undefined);

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
