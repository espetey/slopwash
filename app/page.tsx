"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Image from "next/image";
import { personas } from "@/lib/personas";
import { buildPrompt } from "@/lib/prompt";

const MCP_CONFIGS = [
  {
    id: "vscode",
    label: "VS Code",
    file: ".vscode/mcp.json",
    config: `{\n  "servers": {\n    "slopwash": {\n      "type": "http",\n      "url": "https://slopwash.com/api/mcp"\n    }\n  }\n}`,
  },
  {
    id: "cursor",
    label: "Cursor",
    file: ".cursor/mcp.json",
    config: `{\n  "mcpServers": {\n    "slopwash": {\n      "url": "https://slopwash.com/api/mcp"\n    }\n  }\n}`,
  },
  {
    id: "claude-code",
    label: "Claude Code",
    file: ".mcp.json",
    config: `{\n  "mcpServers": {\n    "slopwash": {\n      "type": "url",\n      "url": "https://slopwash.com/api/mcp"\n    }\n  }\n}`,
    alt: "claude mcp add slopwash --transport http https://slopwash.com/api/mcp",
  },
  {
    id: "windsurf",
    label: "Windsurf",
    file: "~/.codeium/windsurf/mcp_config.json",
    config: `{\n  "mcpServers": {\n    "slopwash": {\n      "serverUrl": "https://slopwash.com/api/mcp"\n    }\n  }\n}`,
  },
  {
    id: "claude-desktop",
    label: "Claude Desktop",
    file: "claude_desktop_config.json",
    note: "Settings \u2192 Developer \u2192 Edit Config",
    config: `{\n  "mcpServers": {\n    "slopwash": {\n      "type": "url",\n      "url": "https://slopwash.com/api/mcp"\n    }\n  }\n}`,
  },
];

export default function Home() {
  const [activePersonas, setActivePersonas] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState(false);
  const promptRef = useRef<HTMLPreElement>(null);

  const prompt = buildPrompt(Array.from(activePersonas));
  const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null);
  const [selectedEditor, setSelectedEditor] = useState<string | null>(null);
  const selectedConfig = selectedEditor
    ? MCP_CONFIGS.find((c) => c.id === selectedEditor)
    : null;

  const copyConfig = useCallback(async (id: string, config: string) => {
    try {
      await navigator.clipboard.writeText(config);
      setCopiedSnippet(id);
      setSelectedEditor(id);
    } catch {}
  }, []);

  const togglePersona = useCallback((id: string) => {
    setActivePersonas((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
    } catch {
      // fallback: select the text
      if (promptRef.current) {
        const range = document.createRange();
        range.selectNodeContents(promptRef.current);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
    }
  }, [prompt]);

  useEffect(() => {
    if (copied) {
      const t = setTimeout(() => setCopied(false), 2000);
      return () => clearTimeout(t);
    }
  }, [copied]);

  useEffect(() => {
    if (copiedSnippet) {
      const t = setTimeout(() => setCopiedSnippet(null), 2000);
      return () => clearTimeout(t);
    }
  }, [copiedSnippet]);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="pt-12 pb-6 px-6 text-center flex flex-col items-center">
        <Image src="/slopwash-md.png" alt="slopwash" width={480} height={112} className="h-24 sm:h-32 w-auto" priority />
        <p className="mt-3 text-zinc-400 text-sm max-w-lg mx-auto">
          A super prompt that scrubs AI tells from any text. Copy it, paste it into
          your LLM, and get output that reads like a human wrote it.
        </p>
        <div className="mt-4 flex items-center justify-center gap-5 text-xs">
          <a href="#how-to-use" className="nav-link-haze">How to use</a>
          <a href="#mcp-quick-start" className="nav-link-haze">MCP</a>
          <a href="#agent-instructions" className="nav-link-haze">Agent rules</a>
          <a href="#chat-ui" className="nav-link-haze">Chat UI</a>
          <a href="#api-usage" className="nav-link-haze">API</a>
          <a href="#tips" className="nav-link-haze">Tips</a>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 pb-20">
        {/* Persona selector */}
        <section className="mb-6">
          <p className="text-xs uppercase tracking-widest text-zinc-500 mb-3">
            Persona
          </p>
          <div className="flex flex-wrap gap-2">
            {personas.map((p) => (
              <button
                key={p.id}
                onClick={() => togglePersona(p.id)}
                className={`
                  px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200
                  border cursor-pointer
                  ${
                    activePersonas.has(p.id)
                      ? "bg-teal-500/15 border-teal-500/40 text-teal-300 shadow-[0_0_12px_-3px_rgba(45,212,191,0.25)]"
                      : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-zinc-300"
                  }
                `}
                title={p.description}
              >
                {p.label}
              </button>
            ))}
          </div>
        </section>

        {/* Prompt display */}
        <section className="relative prompt-glow rounded-xl border border-zinc-800 bg-zinc-950">
          {/* Copy button bar */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
            <span className="text-xs text-zinc-500 font-mono">
              slopwash prompt
              {activePersonas.size > 0 && (
                <span className="text-teal-500/80">
                  {" "}
                  + {personas
                    .filter((p) => activePersonas.has(p.id))
                    .map((p) => p.label)
                    .join(", ")}
                </span>
              )}
            </span>
            <button
              onClick={handleCopy}
              className={`
                px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200
                cursor-pointer
                ${
                  copied
                    ? "bg-teal-500/20 text-teal-300"
                    : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white"
                }
              `}
            >
              {copied ? "Copied!" : "Copy prompt"}
            </button>
          </div>

          {/* Scrollable prompt content */}
          <div className="prompt-scroll overflow-auto max-h-[28vh]">
            <pre
              ref={promptRef}
              className="p-4 sm:p-6 text-sm leading-relaxed text-zinc-300 whitespace-pre-wrap font-mono selection:bg-teal-500/20"
            >
              {prompt}
            </pre>
          </div>
        </section>

        {/* Info section */}
        <section className="mt-12 grid gap-8 sm:grid-cols-2">
          <div id="how-to-use" className="scroll-mt-14">
            <h2 className="text-sm font-semibold text-zinc-300 mb-2">
              How to use
            </h2>
            <ol className="text-sm text-zinc-500 space-y-1.5 list-decimal list-inside">
              <li>Pick one or more personas (optional)</li>
              <li>Copy the prompt</li>
              <li>
                Paste it as a system prompt or before your text in any LLM
              </li>
              <li>Paste the AI-generated text you want cleaned up after it</li>
            </ol>
          </div>
          <div id="mcp-server" className="scroll-mt-14">
            <h2 className="text-sm font-semibold text-zinc-300 mb-2">
              MCP server
            </h2>
            <p className="text-sm text-zinc-500 mb-2">
              Point your AI agent at the MCP endpoint to fetch this prompt
              programmatically.
            </p>
            <code className="block text-xs bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-teal-400 font-mono break-all">
              https://slopwash.com/api/mcp
            </code>
            <p className="text-xs text-zinc-600 mt-2">
              Tool: <span className="text-zinc-400">get_slopwash_prompt</span>{" "}
              &middot; Optional param:{" "}
              <span className="text-zinc-400">personas</span>
            </p>
          </div>
        </section>

        {/* MCP Quick Start */}
        <section id="mcp-quick-start" className="mt-12 scroll-mt-14">
          <h2 className="text-sm font-semibold text-zinc-300 mb-2">
            MCP quick start
          </h2>
          <p className="text-sm text-zinc-500 mb-4">
            Click your editor to copy the config. Paste it into the file shown.
          </p>

          <div className="flex flex-wrap gap-2">
            {MCP_CONFIGS.map((c) => (
              <button
                key={c.id}
                onClick={() => copyConfig(c.id, c.config)}
                className={`
                  px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200
                  border cursor-pointer
                  ${selectedEditor === c.id
                    ? "bg-teal-500/15 border-teal-500/40 text-teal-300 shadow-[0_0_12px_-3px_rgba(45,212,191,0.25)]"
                    : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-zinc-300"
                  }
                `}
              >
                {copiedSnippet === c.id ? `${c.label} \u2713` : c.label}
              </button>
            ))}
          </div>

          {selectedConfig && (
            <div className="mt-4 rounded-lg border border-zinc-800 bg-zinc-950 p-4">
              <p className="text-xs text-zinc-500 mb-3">
                Paste into{" "}
                <span className="text-zinc-300 font-mono">{selectedConfig.file}</span>
                {selectedConfig.note && (
                  <span className="text-zinc-600"> &mdash; {selectedConfig.note}</span>
                )}
              </p>
              <pre className="text-xs bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-teal-400 font-mono overflow-x-auto whitespace-pre">{selectedConfig.config}</pre>
              {selectedConfig.alt && (
                <>
                  <p className="text-xs text-zinc-500 mt-3 mb-1">Or run in terminal:</p>
                  <pre className="text-xs bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-teal-400 font-mono overflow-x-auto whitespace-pre">{selectedConfig.alt}</pre>
                </>
              )}
            </div>
          )}

          <p className="text-xs text-zinc-600 mt-4">
            Once connected, your agent gets a{" "}
            <span className="text-zinc-400">get_slopwash_prompt</span> tool.
            Call it (optionally with{" "}
            <span className="text-zinc-400">personas</span> like{" "}
            <span className="text-teal-500/80">&quot;journalist&quot;</span> or{" "}
            <span className="text-teal-500/80">&quot;humorist&quot;</span>) and
            use the returned prompt as a system prompt when rewriting text.
          </p>
        </section>

        {/* Agent Instructions */}
        <section id="agent-instructions" className="mt-12 scroll-mt-14">
          <h2 className="text-sm font-semibold text-zinc-300 mb-2">
            Agent instructions (always-on mode)
          </h2>
          <p className="text-sm text-zinc-500 mb-4">
            Instead of calling a tool each time, you can bake the slopwash rules
            directly into your agent so it <em>always</em> writes clean. Copy
            the prompt above and paste it into the appropriate file for your editor.
          </p>

          <div className="space-y-4">
            <details className="group rounded-lg border border-zinc-800 bg-zinc-950">
              <summary className="flex items-center justify-between px-4 py-3 cursor-pointer text-sm text-zinc-300 hover:text-white transition-colors">
                <span>VS Code (GitHub Copilot)</span>
                <svg className="w-4 h-4 text-zinc-500 transition-transform group-open:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
              </summary>
              <div className="px-4 pb-4 space-y-2">
                <p className="text-xs text-zinc-500">
                  Create <span className="text-zinc-400">.github/copilot-instructions.md</span> in your repo and paste the prompt there. Copilot will follow it for all chats in that project.
                </p>
                <p className="text-xs text-zinc-500">
                  For a dedicated slopwash agent mode, create <span className="text-zinc-400">.github/agents/slopwash.md</span> with the prompt. Then invoke it with <span className="text-zinc-400">@slopwash</span> in chat.
                </p>
              </div>
            </details>

            <details className="group rounded-lg border border-zinc-800 bg-zinc-950">
              <summary className="flex items-center justify-between px-4 py-3 cursor-pointer text-sm text-zinc-300 hover:text-white transition-colors">
                <span>Cursor</span>
                <svg className="w-4 h-4 text-zinc-500 transition-transform group-open:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
              </summary>
              <div className="px-4 pb-4 space-y-2">
                <p className="text-xs text-zinc-500">
                  Create <span className="text-zinc-400">.cursorrules</span> in your project root and paste the prompt. Cursor will apply it to all AI interactions in that project.
                </p>
              </div>
            </details>

            <details className="group rounded-lg border border-zinc-800 bg-zinc-950">
              <summary className="flex items-center justify-between px-4 py-3 cursor-pointer text-sm text-zinc-300 hover:text-white transition-colors">
                <span>Claude Code</span>
                <svg className="w-4 h-4 text-zinc-500 transition-transform group-open:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
              </summary>
              <div className="px-4 pb-4 space-y-2">
                <p className="text-xs text-zinc-500">
                  Create <span className="text-zinc-400">CLAUDE.md</span> in your repo root and paste the prompt. Claude Code reads this file automatically as project context.
                </p>
              </div>
            </details>

            <details className="group rounded-lg border border-zinc-800 bg-zinc-950">
              <summary className="flex items-center justify-between px-4 py-3 cursor-pointer text-sm text-zinc-300 hover:text-white transition-colors">
                <span>Windsurf</span>
                <svg className="w-4 h-4 text-zinc-500 transition-transform group-open:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
              </summary>
              <div className="px-4 pb-4 space-y-2">
                <p className="text-xs text-zinc-500">
                  Create <span className="text-zinc-400">.windsurfrules</span> in your project root and paste the prompt. Windsurf will apply it on every interaction.
                </p>
              </div>
            </details>
          </div>

          <p className="text-xs text-zinc-600 mt-4">
            MCP tool = opt-in per task (agent calls it when needed). Agent instructions = always-on (agent follows the rules on every response). Pick whichever fits your workflow.
          </p>
        </section>

        {/* Chat UI Setup */}
        <section id="chat-ui" className="mt-12 scroll-mt-14">
          <h2 className="text-sm font-semibold text-zinc-300 mb-2">
            Chat UI setup
          </h2>
          <p className="text-sm text-zinc-500 mb-4">
            Not using an editor? You can use slopwash directly in any chat interface
            by adding the prompt as a custom/system instruction.
          </p>

          <div className="space-y-4">
            <details className="group rounded-lg border border-zinc-800 bg-zinc-950">
              <summary className="flex items-center justify-between px-4 py-3 cursor-pointer text-sm text-zinc-300 hover:text-white transition-colors">
                <span>ChatGPT</span>
                <svg className="w-4 h-4 text-zinc-500 transition-transform group-open:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
              </summary>
              <div className="px-4 pb-4 space-y-2">
                <p className="text-xs text-zinc-500">
                  Go to <span className="text-zinc-400">Settings &rarr; Personalization &rarr; Custom instructions</span>.
                  Paste the slopwash prompt into the &quot;How would you like ChatGPT to respond?&quot; field.
                  It will apply to all new conversations.
                </p>
                <p className="text-xs text-zinc-500">
                  Or: just paste the prompt at the top of any conversation, followed by the text you want cleaned.
                </p>
              </div>
            </details>

            <details className="group rounded-lg border border-zinc-800 bg-zinc-950">
              <summary className="flex items-center justify-between px-4 py-3 cursor-pointer text-sm text-zinc-300 hover:text-white transition-colors">
                <span>Claude.ai</span>
                <svg className="w-4 h-4 text-zinc-500 transition-transform group-open:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
              </summary>
              <div className="px-4 pb-4 space-y-2">
                <p className="text-xs text-zinc-500">
                  Create a <span className="text-zinc-400">Project</span>, then paste the slopwash prompt into the project&apos;s custom instructions. All conversations in that project will apply the rules.
                </p>
                <p className="text-xs text-zinc-500">
                  Or: paste the prompt directly into a conversation before the text you want rewritten.
                </p>
              </div>
            </details>

            <details className="group rounded-lg border border-zinc-800 bg-zinc-950">
              <summary className="flex items-center justify-between px-4 py-3 cursor-pointer text-sm text-zinc-300 hover:text-white transition-colors">
                <span>Gemini</span>
                <svg className="w-4 h-4 text-zinc-500 transition-transform group-open:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
              </summary>
              <div className="px-4 pb-4 space-y-2">
                <p className="text-xs text-zinc-500">
                  Create a <span className="text-zinc-400">Gem</span> (custom chatbot). Paste the slopwash prompt as the Gem&apos;s instructions. Then use that Gem whenever you need text cleaned up.
                </p>
                <p className="text-xs text-zinc-500">
                  Or: paste the prompt at the start of any Gemini conversation.
                </p>
              </div>
            </details>
          </div>
        </section>

        {/* API Usage */}
        <section id="api-usage" className="mt-12 scroll-mt-14">
          <h2 className="text-sm font-semibold text-zinc-300 mb-2">
            API usage
          </h2>
          <p className="text-sm text-zinc-500 mb-4">
            Use slopwash as a system message when calling an LLM API directly.
          </p>

          <div className="space-y-4">
            <details className="group rounded-lg border border-zinc-800 bg-zinc-950" open>
              <summary className="flex items-center justify-between px-4 py-3 cursor-pointer text-sm text-zinc-300 hover:text-white transition-colors">
                <span>OpenAI (Python)</span>
                <svg className="w-4 h-4 text-zinc-500 transition-transform group-open:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
              </summary>
              <div className="px-4 pb-4">
                <pre className="text-xs bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-teal-400 font-mono overflow-x-auto whitespace-pre">{`from openai import OpenAI
client = OpenAI()

SLOPWASH = """  # paste the slopwash prompt here
"""

response = client.chat.completions.create(
    model="gpt-4o",
    messages=[
        {"role": "system", "content": SLOPWASH},
        {"role": "user", "content": text_to_clean},
    ],
)`}</pre>
              </div>
            </details>

            <details className="group rounded-lg border border-zinc-800 bg-zinc-950">
              <summary className="flex items-center justify-between px-4 py-3 cursor-pointer text-sm text-zinc-300 hover:text-white transition-colors">
                <span>Anthropic (Python)</span>
                <svg className="w-4 h-4 text-zinc-500 transition-transform group-open:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
              </summary>
              <div className="px-4 pb-4">
                <pre className="text-xs bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-teal-400 font-mono overflow-x-auto whitespace-pre">{`import anthropic
client = anthropic.Anthropic()

SLOPWASH = """  # paste the slopwash prompt here
"""

message = client.messages.create(
    model="claude-sonnet-4-20250514",
    max_tokens=4096,
    system=SLOPWASH,
    messages=[
        {"role": "user", "content": text_to_clean},
    ],
)`}</pre>
              </div>
            </details>

            <details className="group rounded-lg border border-zinc-800 bg-zinc-950">
              <summary className="flex items-center justify-between px-4 py-3 cursor-pointer text-sm text-zinc-300 hover:text-white transition-colors">
                <span>Fetch from MCP endpoint</span>
                <svg className="w-4 h-4 text-zinc-500 transition-transform group-open:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
              </summary>
              <div className="px-4 pb-4 space-y-2">
                <p className="text-xs text-zinc-500">
                  Instead of hardcoding the prompt, fetch it live from the MCP endpoint:
                </p>
                <pre className="text-xs bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-teal-400 font-mono overflow-x-auto whitespace-pre">{`curl -X POST https://slopwash.com/api/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
      "protocolVersion": "2025-03-26",
      "capabilities": {},
      "clientInfo": {"name": "my-app", "version": "1.0"}
    }
  }'`}</pre>
              </div>
            </details>
          </div>
        </section>

        {/* Tips */}
        <section id="tips" className="mt-12 scroll-mt-14">
          <h2 className="text-sm font-semibold text-zinc-300 mb-3">
            Tips
          </h2>
          <ul className="text-sm text-zinc-500 space-y-2">
            <li className="flex gap-2">
              <span className="text-teal-500/60 shrink-0">&bull;</span>
              <span>Paste the slopwash prompt <em>before</em> your text, not after. It works best as a system prompt or preamble.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-teal-500/60 shrink-0">&bull;</span>
              <span>Personas are optional. The default prompt does the heavy lifting on its own.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-teal-500/60 shrink-0">&bull;</span>
              <span>Works with any LLM: GPT-4o, Claude, Gemini, Llama, Mistral, etc. The rules are model-agnostic.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-teal-500/60 shrink-0">&bull;</span>
              <span>For best results, don&apos;t ask the LLM to do other tasks at the same time. Give it only the slopwash prompt + the text to clean.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-teal-500/60 shrink-0">&bull;</span>
              <span>MCP tool vs. agent instructions: MCP is opt-in per task. Agent instructions bake the rules in so the agent always writes clean. Use MCP if you only sometimes need slopwash; use instructions if you want it everywhere.</span>
            </li>
          </ul>
        </section>
      </main>

      {/* Footer */}
      <footer className="py-8 text-center text-xs text-zinc-600">
        slopwash &middot; &copy; 2026 Slopwash International Corporation of Earth.com, LLX &middot; no tracking
      </footer>
    </div>
  );
}
