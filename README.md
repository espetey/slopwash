# slopwash

A prompt that removes AI-generated writing patterns from any text. Copy it, paste it into your LLM, and get output that reads like a human wrote it.

**[slopwash.com](https://slopwash.com)**

## What it does

LLMs produce text with recognizable patterns: overused vocabulary ("delve," "tapestry," "navigate the complexities"), structural tics (rule-of-three lists, "not just X but also Y"), fake balance, hedging, sycophancy, em dash overuse, and speculative Hollywood endings. These patterns are statistically detectable and make AI-written text obvious to anyone who reads a lot of it.

Slopwash is a set of rules that tells an LLM to scrub these patterns from its own output. The rules are based on published research, Wikipedia's AI-detection field guide, Mozilla Foundation analysis, and observed patterns across GPT-4o, Claude, Gemini, Llama, and others.

## How to use it

### Formats

The site and the MCP server offer the prompt in three formats:

| Format | Download | Use it for |
| --- | --- | --- |
| Rewrite prompt | `slopwash-prompt.md` | System prompt for chat apps and APIs. Send the text inside `<draft>` tags. |
| Agent skill | `SKILL.md` | An on-demand skill for coding agents. Loads only when invoked. |
| Writing rules | `slopwash-rules.md` | Always-on rules for the agent's own prose. Adds about 8,000 tokens to every request. |

### Copy and paste

1. Go to [slopwash.com](https://slopwash.com)
2. Pick a format
3. Add personas or narrative rules (optional)
4. Copy or download the prompt
5. For the rewrite prompt, set it as the system instruction and put the text inside `<draft>` and `</draft>` tags

### MCP server

The public endpoint needs no API key, and every tool is read-only:

```text
https://slopwash.com/api/mcp
```

**VS Code** (`.vscode/mcp.json`, or run `code --add-mcp '{"name":"slopwash","type":"http","url":"https://slopwash.com/api/mcp"}'`):

```json
{
  "servers": {
    "slopwash": {
      "type": "http",
      "url": "https://slopwash.com/api/mcp"
    }
  }
}
```

**Cursor** (`.cursor/mcp.json`, or `~/.cursor/mcp.json` for all projects):

```json
{
  "mcpServers": {
    "slopwash": {
      "url": "https://slopwash.com/api/mcp"
    }
  }
}
```

**Claude Code** (`.mcp.json` in the project root):

```json
{
  "mcpServers": {
    "slopwash": {
      "type": "http",
      "url": "https://slopwash.com/api/mcp"
    }
  }
}
```

Or run `claude mcp add --transport http slopwash https://slopwash.com/api/mcp`. Add `--scope user` to use it in every project.

**Codex** (`~/.codex/config.toml`, or run `codex mcp add slopwash --url https://slopwash.com/api/mcp`):

```toml
[mcp_servers.slopwash]
url = "https://slopwash.com/api/mcp"
```

**Gemini CLI** (`~/.gemini/settings.json`, or run `gemini mcp add --transport http slopwash https://slopwash.com/api/mcp`):

```json
{
  "mcpServers": {
    "slopwash": {
      "httpUrl": "https://slopwash.com/api/mcp"
    }
  }
}
```

**Windsurf / Devin** (`~/.config/devin/mcp_config.json`, or run `devin mcp add -s user slopwash https://slopwash.com/api/mcp`):

```json
{
  "mcpServers": {
    "slopwash": {
      "url": "https://slopwash.com/api/mcp"
    }
  }
}
```

**Zed** (`settings.json`):

```json
{
  "context_servers": {
    "slopwash": {
      "url": "https://slopwash.com/api/mcp"
    }
  }
}
```

**Cline** (`cline_mcp_settings.json`):

```json
{
  "mcpServers": {
    "slopwash": {
      "type": "streamableHttp",
      "url": "https://slopwash.com/api/mcp"
    }
  }
}
```

**Claude app:** go to Customize → Connectors → + → Add custom connector and paste the URL. On Team and Enterprise plans, an Owner adds it under Organization settings → Connectors.

**ChatGPT:** turn on Settings → Security and login → Developer mode, then add the URL at [chatgpt.com/plugins](https://chatgpt.com/plugins) with No Authentication. Developer mode is web-only and requires a paid plan.

Tools:

- `get_slopwash_prompt`: returns the prompt. Optional params: `mode` (`rewrite`, `skill`, or `rules`), `personas`, `model`, and `narrative`.
- `prepare_rewrite`: returns separate `systemPrompt` and safely draft-wrapped `userMessage` fields. Optional params: `personas`, `model`, and `narrative`.
- `audit_rewrite`: compares a rewrite with its source, flags added facts and style regressions, and returns a one-pass retry message when needed.
- `analyze_text`: scores text for AI writing patterns (0–100). No LLM call, pure heuristic analysis. Optional params: `model` and `narrative`.

Prompts, which show up as slash commands in clients that support them (in Claude Code, `/mcp__slopwash__rewrite`):

- `rewrite`: rewrites the given `text`, with optional comma-separated `personas`.
- `writing_rules`: loads the writing rules into the current conversation.

For an agent-driven rewrite, call `prepare_rewrite`, send the returned messages to the model, then call `audit_rewrite`. If the audit fails, send its `retryMessage` to the same model once and audit the corrected result.

The endpoint is stateless and answers with plain JSON, so you can fetch the prompt without an MCP client:

```bash
curl -s https://slopwash.com/api/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"get_slopwash_prompt","arguments":{"mode":"rewrite"}}}' \
  | jq -r '.result.content[0].text' > slopwash-prompt.md
```

### Agent skills and rules

Save the **agent skill** as `.claude/skills/slopwash/SKILL.md`. Claude Code, VS Code, and Cursor all read that folder; invoke it with `/slopwash`. VS Code also reads `.github/skills/`, and Cursor also reads `.cursor/skills/`.

Save the **writing rules** where your tool loads always-on instructions:

- **VS Code:** `.github/copilot-instructions.md`, or `.github/instructions/slopwash.instructions.md` with `applyTo: "**/*.md"` front matter to limit them to docs
- **Cursor:** `.cursor/rules/slopwash.mdc` with `description` and `alwaysApply: true` front matter (`.cursorrules` is legacy)
- **Claude Code:** `CLAUDE.md`, or save `slopwash-rules.md` and import it from `CLAUDE.md` with `@slopwash-rules.md`
- **Codex, Cline, and other tools:** `AGENTS.md`
- **Gemini CLI:** `GEMINI.md`
- **Windsurf / Devin:** rule files are capped at 12,000 characters, which is too small for the prompt, so use the MCP server

VS Code can also run the agent skill as a custom agent: save it as `.github/agents/slopwash.agent.md` and pick it from the agent dropdown.

### Chat apps

The rewrite prompt is about 31,000 characters, which is too long for ChatGPT's Custom Instructions (5,000 characters max).

- **ChatGPT:** put the prompt in a project's instructions, or upload the downloaded file to the project
- **Claude:** put it in a Project's instructions, or zip the agent skill in a `slopwash` folder and upload it under Customize → Skills (requires code execution)
- **Gemini:** create a Gem with the prompt as its instructions, or upload the file under Knowledge

### API

Send the rewrite prompt as the system instruction and the source text inside `<draft>` tags. See [slopwash.com](https://slopwash.com#api-usage) for OpenAI Responses, Anthropic Messages, and Gemini Interactions examples, including hosted MCP calls that let the model audit its own rewrite.

## Slop scanner

[slopwash.com/scanner](https://slopwash.com/scanner) — paste any text and get a heuristic score with per-section breakdown and violation details. Runs entirely in the browser, no LLM calls.

## Analyzer

The analyzer engine (`lib/analyzer/`) is pure TypeScript with zero external dependencies. It checks text against six rule categories:

1. **Vocabulary** — banned and flagged words/phrases
2. **Structure** — formulaic contrasts, delayed scope qualifiers, internal breadcrumbs, staccato runs, buttons, and Hollywood endings
3. **Tone & Voice** — sycophancy, hedging, chat residue, reception shorthand, drama adverbs, and model house voices
4. **Formatting** — em dash overuse, bold overuse, emoji, title case headings, and novelty summary labels
5. **Content depth** — unsupported source assurances, source exaggeration, and elegant variation
6. **Consistency** — false emotional understanding, frictionless adoption language

Model-specific profiles (GPT-4o, Claude, Gemini, Llama) add additional pattern detection.

## Project structure

```text
app/
  page.tsx          # main site
  scanner/          # slop scanner
  benchmark/        # model benchmark leaderboard
  api/mcp/          # MCP server endpoint
lib/
  prompt.ts         # the slopwash prompt (CORE_RULES + personas)
  rewrite-audit.ts  # source/output checks and retry-message builder
  personas.ts       # 13 persona overlays
  analyzer/         # heuristic text analysis engine
    rules/          # 6 rule checker modules
    models/         # model-specific profiles
    scoring.ts      # weighted scoring system
extensions/
  vscode/           # VS Code extension (scaffolding)
  browser/          # Chrome extension (scaffolding)
actions/
  slop-check/       # GitHub Action (scaffolding)
packages/
  analyzer/         # npm package (scaffolding)
```

## Development

```bash
npm install
npm run dev
```

## License

MIT
