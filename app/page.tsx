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
      {/* Header */}
      <header className="pt-16 pb-10 px-6 text-center">
        <h1 className="text-5xl sm:text-6xl font-bold tracking-tight">
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-cyan-300">
            slopwash
          </span>
        </h1>
        <p className="mt-4 text-zinc-400 text-lg max-w-xl mx-auto">
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
          <div className="prompt-scroll overflow-auto max-h-[60vh]">
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
          <div>
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
          <div>
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
      </main>

      {/* Footer */}
      <footer className="py-8 text-center text-xs text-zinc-600">
        slopwash &middot; open source &middot; no tracking
      </footer>
    </div>
  );
}
