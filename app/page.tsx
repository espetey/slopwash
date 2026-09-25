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
  const [includeNarrative, setIncludeNarrative] = useState(false);
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const promptRef = useRef<HTMLPreElement>(null);

  const prompt = buildPrompt(Array.from(activePersonas), undefined, {
    includeNarrative,
  });
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
    const enabling = !activePersonas.has(id);
    setActivePersonas((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
    if (id === "novelist" && enabling) {
      setIncludeNarrative(true);
    }
  }, [activePersonas]);

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
      <header className="pt-12 pb-6 px-6 text-center flex flex-col items-center relative">
        <a href="https://github.com/espetey/slopwash" target="_blank" rel="noopener noreferrer" className="absolute top-4 right-4 text-zinc-600 hover:text-zinc-300 transition-colors" aria-label="GitHub">
          <svg viewBox="0 0 16 16" width="20" height="20" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>
        </a>
        <Image src="/slopwash-md.png" alt="slopwash" width={480} height={112} className="h-24 sm:h-32 w-auto" priority />
        <p className="mt-3 text-zinc-400 text-sm max-w-lg mx-auto">
          A prompt that removes AI-generated writing patterns from any text.
          Copy it, paste it into your LLM, and get output that reads like a
          human wrote it.
        </p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs">
          <a href="#how-to-use" className="nav-link-haze">How to use</a>
          <a href="#mcp-quick-start" className="nav-link-haze">MCP</a>
          <a href="#agent-instructions" className="nav-link-haze">Agent rules</a>
          <a href="#chat-ui" className="nav-link-haze">Chat UI</a>
          <a href="#api-usage" className="nav-link-haze">API</a>
          <a href="#things-to-know" className="nav-link-haze">Tips</a>
          <a href="/scanner" className="nav-link-haze">Scanner</a>
          <a href="/benchmark" className="nav-link-haze">Benchmark</a>
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
          <div className="mt-4 flex items-center justify-between gap-4 border-t border-zinc-900 pt-4">
            <div>
              <p className="text-sm text-zinc-300">Narrative rules</p>
              <p className="text-xs text-zinc-600">
                Section 9 for fiction, scenes, and narrative nonfiction
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={includeNarrative}
              onClick={() => setIncludeNarrative((enabled) => !enabled)}
              className={`relative h-6 w-11 shrink-0 rounded-full border transition-colors cursor-pointer ${
                includeNarrative
                  ? "border-teal-500/50 bg-teal-500/25"
                  : "border-zinc-700 bg-zinc-900"
              }`}
            >
              <span
                className={`absolute left-0.5 top-0.5 h-4.5 w-4.5 rounded-full transition-transform ${
                  includeNarrative
                    ? "translate-x-5 bg-teal-300"
                    : "translate-x-0 bg-zinc-500"
                }`}
              />
              <span className="sr-only">Toggle narrative rules</span>
            </button>
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
                {includeNarrative && (
                  <span className="text-teal-500/80"> + narrative</span>
                )}
            </span>
            <button
              onClick={handleCopy}
              className={`
                shrink-0 whitespace-nowrap px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200
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
          <div className={`prompt-scroll overflow-auto ${expanded ? '' : 'max-h-[28vh]'}`}>
            <pre
              ref={promptRef}
              className="p-4 sm:p-6 text-sm leading-relaxed text-zinc-300 whitespace-pre-wrap font-mono selection:bg-teal-500/20"
            >
              {prompt}
            </pre>
          </div>

          {/* Expand/collapse toggle */}
          <div className="flex justify-center border-t border-zinc-800">
            <button
              onClick={() => setExpanded((e) => !e)}
              className="w-full py-2 text-xs text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
            >
              {expanded ? 'Collapse' : 'Expand full prompt'}
            </button>
          </div>
        </section>

        {/* Info section */}
        <section className="mt-12 grid gap-8 sm:grid-cols-2">
          <div id="how-to-use" className="scroll-mt-14">
            <h2 className="text-sm font-semibold text-zinc-300 mb-2">
              Getting started
            </h2>
            <ol className="text-sm text-zinc-500 space-y-1.5 list-decimal list-inside">
              <li>Pick one or more personas to layer in a specific voice (optional)</li>
              <li>Turn on narrative rules only for stories and scenes</li>
              <li>Copy the prompt</li>
              <li>Paste it as a system instruction or at the top of any LLM chat</li>
              <li>Send the text inside <span className="text-zinc-400 font-mono">&lt;draft&gt;...&lt;/draft&gt;</span> tags</li>
            </ol>
            <p className="text-xs text-zinc-600 mt-2">
              Works with GPT-4o, Claude, Gemini, Llama, Mistral, and other models.
            </p>
          </div>
          <div id="mcp-server" className="scroll-mt-14">
            <h2 className="text-sm font-semibold text-zinc-300 mb-2">
              MCP server
            </h2>
            <p className="text-sm text-zinc-500 mb-2">
              Connect through the MCP endpoint to let your AI agent fetch the
              prompt programmatically instead of hardcoding it.
            </p>
            <code className="block text-xs bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-teal-400 font-mono break-all">
              https://slopwash.com/api/mcp
            </code>
            <p className="text-xs text-zinc-600 mt-2">
              Tools: <span className="text-zinc-400">prepare_rewrite</span>,{" "}
              <span className="text-zinc-400">audit_rewrite</span>, and{" "}
              <span className="text-zinc-400">analyze_text</span>
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
            Once connected, call{" "}
            <span className="text-zinc-400">prepare_rewrite</span> with the source text.
            It returns separate system and draft-wrapped user messages. You can add{" "}
            <span className="text-zinc-400">personas</span> like{" "}
            <span className="text-teal-500/80">&quot;journalist&quot;</span> or{" "}
            <span className="text-teal-500/80">&quot;humorist&quot;</span>. After the model
            responds, call <span className="text-zinc-400">audit_rewrite</span> and
            use its retry message once if the audit fails.
          </p>
        </section>

        {/* Agent Instructions */}
        <section id="agent-instructions" className="mt-12 scroll-mt-14">
          <h2 className="text-sm font-semibold text-zinc-300 mb-2">
            Agent instructions (always-on mode)
          </h2>
          <p className="text-sm text-zinc-500 mb-4">
            Bake the slopwash rules directly into your agent so every response
            follows them. Copy the prompt and paste it into the file for your editor.
          </p>

          <div className="space-y-4">
            <details className="group rounded-lg border border-zinc-800 bg-zinc-950">
              <summary className="flex items-center justify-between px-4 py-3 cursor-pointer text-sm text-zinc-300 hover:text-white transition-colors">
                <span>VS Code (GitHub Copilot)</span>
                <svg className="w-4 h-4 text-zinc-500 transition-transform group-open:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
              </summary>
              <div className="px-4 pb-4 space-y-2">
                <p className="text-xs text-zinc-500">
                  Create <span className="text-zinc-400">.github/copilot-instructions.md</span> in your repo and paste the prompt. Copilot follows it for all chats in that project.
                </p>
                <p className="text-xs text-zinc-500">
                  Or create <span className="text-zinc-400">.github/agents/slopwash.md</span> with the prompt and invoke it with <span className="text-zinc-400">@slopwash</span> in chat.
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
                  Create <span className="text-zinc-400">.cursorrules</span> in your project root and paste the prompt. Cursor applies it to all AI interactions in that project.
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
                  Create <span className="text-zinc-400">CLAUDE.md</span> in your repo root and paste the prompt. Claude Code reads it automatically.
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
                  Create <span className="text-zinc-400">.windsurfrules</span> in your project root and paste the prompt. Windsurf applies it on every interaction.
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
            Not using an editor? Add slopwash as a custom system instruction.
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
                  It applies to all new conversations.
                </p>
                <p className="text-xs text-zinc-500">
                  Or paste it at the top of any single chat along with your text.
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
                  Create a <span className="text-zinc-400">Project</span> with slopwash as the custom instructions. The rules apply to all conversations in that project.
                </p>
                <p className="text-xs text-zinc-500">
                  Or paste the prompt directly into a conversation before your text.
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
                  Create a <span className="text-zinc-400">Gem</span> (custom chatbot) with slopwash as its instructions. Use that Gem whenever you need text cleaned.
                </p>
                <p className="text-xs text-zinc-500">
                  Or paste the prompt at the start of any Gemini conversation.
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
            Use slopwash as the system message and wrap untrusted source text before sending it.
          </p>

          <div className="space-y-4">
            <details className="group rounded-lg border border-zinc-800 bg-zinc-950" open>
              <summary className="flex items-center justify-between px-4 py-3 cursor-pointer text-sm text-zinc-300 hover:text-white transition-colors">
                <span>OpenAI (Python)</span>
                <svg className="w-4 h-4 text-zinc-500 transition-transform group-open:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
              </summary>
              <div className="px-4 pb-4">
                <pre className="text-xs bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-teal-400 font-mono overflow-x-auto whitespace-pre">{`import re
        from openai import OpenAI
client = OpenAI()

SLOPWASH = """  # paste the slopwash prompt here
"""

        def wrap_draft(text):
          escaped = re.sub(
            r"</?draft>",
            lambda match: match.group(0).replace("<", "&lt;").replace(">", "&gt;"),
            text,
            flags=re.IGNORECASE,
          )
          return f"<draft>\\n{escaped}\\n</draft>"

response = client.chat.completions.create(
    model="gpt-4o",
    messages=[
        {"role": "system", "content": SLOPWASH},
            {"role": "user", "content": wrap_draft(text_to_clean)},
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
                <pre className="text-xs bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-teal-400 font-mono overflow-x-auto whitespace-pre">{`import re
        import anthropic
client = anthropic.Anthropic()

SLOPWASH = """  # paste the slopwash prompt here
"""

        def wrap_draft(text):
          escaped = re.sub(
            r"</?draft>",
            lambda match: match.group(0).replace("<", "&lt;").replace(">", "&gt;"),
            text,
            flags=re.IGNORECASE,
          )
          return f"<draft>\\n{escaped}\\n</draft>"

message = client.messages.create(
    model="claude-sonnet-4-20250514",
    max_tokens=4096,
    system=SLOPWASH,
    messages=[
      {"role": "user", "content": wrap_draft(text_to_clean)},
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
                  Fetch the prompt live from the MCP endpoint instead of hardcoding it. You get updates automatically.
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
        <section id="things-to-know" className="mt-12 scroll-mt-14">
          <h2 className="text-sm font-semibold text-zinc-300 mb-3">
            Things to know
          </h2>
          <ul className="text-sm text-zinc-500 space-y-2">
            <li className="flex gap-2">
              <span className="text-teal-500/60 shrink-0">&bull;</span>
              <span>Put the slopwash prompt in the system message and the source in <span className="font-mono">&lt;draft&gt;</span> tags in the user message.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-teal-500/60 shrink-0">&bull;</span>
              <span>Personas are optional. The base prompt handles most of the work on its own.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-teal-500/60 shrink-0">&bull;</span>
              <span>The rules are model-agnostic. Any modern LLM can follow them.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-teal-500/60 shrink-0">&bull;</span>
              <span>For best results, don&apos;t layer on other tasks. Give the model the slopwash prompt and the text to clean.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-teal-500/60 shrink-0">&bull;</span>
              <span>Run model output through <span className="font-mono">audit_rewrite</span>. If it fails, use its retry message for one correction pass.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-teal-500/60 shrink-0">&bull;</span>
              <span>MCP is opt-in per task when you need it. Agent instructions are always-on so every response follows the rules. Use MCP if slopwash is occasional, instructions if you want it everywhere.</span>
            </li>
          </ul>
        </section>
      </main>

      {/* Footer */}
      <footer className="py-8 text-center text-xs text-zinc-600">
        slopwash &middot; <a href="https://github.com/espetey/slopwash" target="_blank" rel="noopener noreferrer" className="hover:text-zinc-400 transition-colors">GitHub</a> &middot; <a href="https://x.com/slopwash" target="_blank" rel="noopener noreferrer" className="hover:text-zinc-400 transition-colors">@slopwash</a> &middot; &copy; 2026 Slopwash International Corporation, Laniakea, LLX &middot; no tracking
      </footer>
    </div>
  );
}
