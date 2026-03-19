import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { z } from "zod";
import { personaIds } from "@/lib/personas";
import { buildPrompt } from "@/lib/prompt";

function createServer() {
  const server = new McpServer({
    name: "slopwash",
    version: "1.0.0",
  });

  server.tool(
    "get_slopwash_prompt",
    "Get the slopwash prompt that scrubs AI tells from writing. Optionally specify one or more personas to add voice/tone overlays. Use as a system prompt, then paste in text to be rewritten.",
    {
      personas: z
        .array(z.enum(personaIds as [string, ...string[]]))
        .optional()
        .describe(
          "Optional persona(s) to overlay on the base prompt. Choices: researcher, technologist, scientist, journalist, humorist, manager, marketer, sales"
        ),
    },
    async ({ personas }) => {
      const prompt = buildPrompt(personas);
      return {
        content: [{ type: "text" as const, text: prompt }],
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
