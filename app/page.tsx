"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { personas } from "@/lib/personas";
import { buildPrompt } from "@/lib/prompt";

export default function Home() {
  const [activePersona, setActivePersona] = useState("none");
  const [copied, setCopied] = useState(false);
  const promptRef = useRef<HTMLPreElement>(null);

  const prompt = buildPrompt(activePersona);

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

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 w-full border-b border-zinc-800/60 bg-[#09090b]/80 backdrop-blur-md">
        <div className="max-w-4xl mx-auto flex items-center justify-between px-4 sm:px-6 h-10">
          <a href="#" className="text-sm font-semibold text-teal-400 tracking-tight">
            slopwash
          </a>
          <div className="flex items-center gap-5 text-xs text-zinc-500">
            <a href="#how-to-use" className="hover:text-zinc-300 transition-colors">How to use</a>
            <a href="#mcp-server" className="hover:text-zinc-300 transition-colors">MCP server</a>
            <a href="#mcp-quick-start" className="hover:text-zinc-300 transition-colors">Quick start</a>
          </div>
        </div>
      </nav>

      {/* Header */}
      <header className="pt-10 pb-6 px-6 text-center">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-cyan-300">
            slopwash
          </span>
        </h1>
        <p className="mt-2 text-zinc-400 text-sm max-w-lg mx-auto">
          A prompt that scrubs AI tells from any text. Copy it, paste it into
          your LLM, and get output that reads like a human wrote it.
        </p>
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
                onClick={() => setActivePersona(p.id)}
                className={`
                  px-4 py-2 rounded-full text-sm font-medium transition-all duration-200
                  border cursor-pointer
                  ${
                    activePersona === p.id
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
              {activePersona !== "none" && (
                <span className="text-teal-500/80">
                  {" "}
                  + {personas.find((p) => p.id === activePersona)?.label}
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
          <div className="prompt-scroll overflow-auto max-h-[40vh]">
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
              <li>Pick a persona (or leave it on Default)</li>
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
              <span className="text-zinc-400">persona</span>
            </p>
          </div>
        </section>

        {/* MCP Quick Start */}
        <section id="mcp-quick-start" className="mt-12 scroll-mt-14">
          <h2 className="text-sm font-semibold text-zinc-300 mb-4">
            MCP quick start
          </h2>
          <p className="text-sm text-zinc-500 mb-4">
            Add slopwash to your editor so your AI agent can use it as a tool.
            Pick your setup and paste the config.
          </p>

          <div className="space-y-4">
            {/* VS Code / GitHub Copilot */}
            <details className="group rounded-lg border border-zinc-800 bg-zinc-950">
              <summary className="flex items-center justify-between px-4 py-3 cursor-pointer text-sm text-zinc-300 hover:text-white transition-colors">
                <span>VS Code (GitHub Copilot)</span>
                <svg
                  className="w-4 h-4 text-zinc-500 transition-transform group-open:rotate-90"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </summary>
              <div className="px-4 pb-4 space-y-2">
                <p className="text-xs text-zinc-500">
                  Add to <span className="text-zinc-400">.vscode/mcp.json</span> in your project (or your user settings):
                </p>
                <pre className="text-xs bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-teal-400 font-mono overflow-x-auto whitespace-pre">{`{
  "servers": {
    "slopwash": {
      "type": "http",
      "url": "https://slopwash.com/api/mcp"
    }
  }
}`}</pre>
              </div>
            </details>

            {/* Cursor */}
            <details className="group rounded-lg border border-zinc-800 bg-zinc-950">
              <summary className="flex items-center justify-between px-4 py-3 cursor-pointer text-sm text-zinc-300 hover:text-white transition-colors">
                <span>Cursor</span>
                <svg
                  className="w-4 h-4 text-zinc-500 transition-transform group-open:rotate-90"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </summary>
              <div className="px-4 pb-4 space-y-2">
                <p className="text-xs text-zinc-500">
                  Add to <span className="text-zinc-400">.cursor/mcp.json</span> in your project root:
                </p>
                <pre className="text-xs bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-teal-400 font-mono overflow-x-auto whitespace-pre">{`{
  "mcpServers": {
    "slopwash": {
      "url": "https://slopwash.com/api/mcp"
    }
  }
}`}</pre>
              </div>
            </details>

            {/* Claude Code */}
            <details className="group rounded-lg border border-zinc-800 bg-zinc-950">
              <summary className="flex items-center justify-between px-4 py-3 cursor-pointer text-sm text-zinc-300 hover:text-white transition-colors">
                <span>Claude Code</span>
                <svg
                  className="w-4 h-4 text-zinc-500 transition-transform group-open:rotate-90"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </summary>
              <div className="px-4 pb-4 space-y-2">
                <p className="text-xs text-zinc-500">
                  Run this in your terminal:
                </p>
                <pre className="text-xs bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-teal-400 font-mono overflow-x-auto whitespace-pre">{`claude mcp add slopwash \\
  --transport http \\
  https://slopwash.com/api/mcp`}</pre>
                <p className="text-xs text-zinc-500 mt-1">
                  Or add to <span className="text-zinc-400">.mcp.json</span> in your project:
                </p>
                <pre className="text-xs bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-teal-400 font-mono overflow-x-auto whitespace-pre">{`{
  "mcpServers": {
    "slopwash": {
      "type": "url",
      "url": "https://slopwash.com/api/mcp"
    }
  }
}`}</pre>
              </div>
            </details>

            {/* Windsurf */}
            <details className="group rounded-lg border border-zinc-800 bg-zinc-950">
              <summary className="flex items-center justify-between px-4 py-3 cursor-pointer text-sm text-zinc-300 hover:text-white transition-colors">
                <span>Windsurf</span>
                <svg
                  className="w-4 h-4 text-zinc-500 transition-transform group-open:rotate-90"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </summary>
              <div className="px-4 pb-4 space-y-2">
                <p className="text-xs text-zinc-500">
                  Add to <span className="text-zinc-400">~/.codeium/windsurf/mcp_config.json</span>:
                </p>
                <pre className="text-xs bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-teal-400 font-mono overflow-x-auto whitespace-pre">{`{
  "mcpServers": {
    "slopwash": {
      "serverUrl": "https://slopwash.com/api/mcp"
    }
  }
}`}</pre>
              </div>
            </details>

            {/* Claude Desktop */}
            <details className="group rounded-lg border border-zinc-800 bg-zinc-950">
              <summary className="flex items-center justify-between px-4 py-3 cursor-pointer text-sm text-zinc-300 hover:text-white transition-colors">
                <span>Claude Desktop</span>
                <svg
                  className="w-4 h-4 text-zinc-500 transition-transform group-open:rotate-90"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </summary>
              <div className="px-4 pb-4 space-y-2">
                <p className="text-xs text-zinc-500">
                  Add to <span className="text-zinc-400">claude_desktop_config.json</span> (Settings &rarr; Developer &rarr; Edit Config):
                </p>
                <pre className="text-xs bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-teal-400 font-mono overflow-x-auto whitespace-pre">{`{
  "mcpServers": {
    "slopwash": {
      "type": "url",
      "url": "https://slopwash.com/api/mcp"
    }
  }
}`}</pre>
              </div>
            </details>
          </div>

          <p className="text-xs text-zinc-600 mt-4">
            Once connected, your agent gets a{" "}
            <span className="text-zinc-400">get_slopwash_prompt</span> tool.
            Call it (optionally with a{" "}
            <span className="text-zinc-400">persona</span> like{" "}
            <span className="text-teal-500/80">&quot;journalist&quot;</span> or{" "}
            <span className="text-teal-500/80">&quot;humorist&quot;</span>) and
            use the returned prompt as a system prompt when rewriting text.
          </p>
        </section>
      </main>

      {/* Footer */}
      <footer className="py-8 text-center text-xs text-zinc-600">
        slopwash &middot; &copy; 2026 &middot; no tracking
      </footer>
    </div>
  );
}
