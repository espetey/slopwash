# slopwash

A prompt that removes AI-generated writing patterns from any text. Copy it, paste it into your LLM, and get output that reads like a human wrote it.

**[slopwash.com](https://slopwash.com)**

## What it does

LLMs produce text with recognizable patterns: overused vocabulary ("delve," "tapestry," "navigate the complexities"), structural tics (rule-of-three lists, "not just X but also Y"), fake balance, hedging, sycophancy, em dash overuse, and speculative Hollywood endings. These patterns are statistically detectable and make AI-written text obvious to anyone who reads a lot of it.

Slopwash is a set of rules that tells an LLM to scrub these patterns from its own output. The rules are based on published research, Wikipedia's AI-detection field guide, Mozilla Foundation analysis, and observed patterns across GPT-4o, Claude, Gemini, Llama, and others.

## How to use it

### Copy and paste

1. Go to [slopwash.com](https://slopwash.com)
2. Pick one or more personas (optional)
3. Copy the prompt
4. Paste it as a system instruction or at the top of any LLM chat
5. Add the text you want cleaned

### MCP server

Connect your editor to the MCP endpoint and let your AI agent fetch the prompt programmatically:

```
https://slopwash.com/api/mcp
```

**VS Code:**
```json
// .vscode/mcp.json
{
  "servers": {
    "slopwash": {
      "type": "http",
      "url": "https://slopwash.com/api/mcp"
    }
  }
}
```

**Cursor:**
```json
// .cursor/mcp.json
{
  "mcpServers": {
    "slopwash": {
      "url": "https://slopwash.com/api/mcp"
    }
  }
}
```

**Claude Code:**
```json
// .mcp.json
{
  "mcpServers": {
    "slopwash": {
      "type": "url",
      "url": "https://slopwash.com/api/mcp"
    }
  }
}
```

Tools available:

- `get_slopwash_prompt` — returns the full prompt. Optional params: `personas` (array), `model` (string).
- `analyze_text` — scores text for AI writing patterns (0–100). No LLM call, pure heuristic analysis. Optional param: `model`.

### Agent instructions (always-on)

Paste the prompt into your editor's instruction file so every response follows the rules:

- **VS Code:** `.github/copilot-instructions.md`
- **Cursor:** `.cursorrules`
- **Claude Code:** `CLAUDE.md`
- **Windsurf:** `.windsurfrules`

## Slop scanner

[slopwash.com/scanner](https://slopwash.com/scanner) — paste any text and get a heuristic score with per-section breakdown and violation details. Runs entirely in the browser, no LLM calls.

## Analyzer

The analyzer engine (`lib/analyzer/`) is pure TypeScript with zero external dependencies. It checks text against six rule categories:

1. **Vocabulary** — banned and flagged words/phrases
2. **Structure** — "not just X but also Y," rule-of-three, rhetorical questions, Hollywood endings, etc.
3. **Tone & Voice** — sycophancy, hedging, chat residue, sentence length uniformity
4. **Formatting** — em dash overuse, bold overuse, emoji, title case headings
5. **Content depth** — weasel phrases, source exaggeration, elegant variation
6. **Consistency** — false emotional understanding, frictionless adoption language

Model-specific profiles (GPT-4o, Claude, Gemini, Llama) add additional pattern detection.

## Project structure

```
app/
  page.tsx          # main site
  scanner/          # slop scanner
  benchmark/        # model benchmark leaderboard
  api/mcp/          # MCP server endpoint
lib/
  prompt.ts         # the slopwash prompt (CORE_RULES + personas)
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
