# hackernews post

## title

Show HN: Slopwash – a prompt that scrubs AI tells from LLM output

## url

https://slopwash.com

## text (if self-post, otherwise leave blank and just submit the url)

Slopwash is a free, copy-paste prompt that you drop into any LLM conversation. It contains a ruleset (~100 banned words, structural pattern checks, tone guidelines) compiled from research on statistically overrepresented patterns in LLM output vs. human writing.

You pick optional persona overlays (journalist, researcher, humorist, etc.) and it generates a single system prompt. Paste it in, and your LLM stops writing like a tourism brochure.

It also works as an MCP server if you want it always-on in your editor. One-click config for VS Code, Cursor, Claude Code, and Windsurf.

No backend, no auth, no tracking. The whole thing is a static Next.js page that assembles a prompt string client-side.

Source: https://github.com/espetey/slopwash
