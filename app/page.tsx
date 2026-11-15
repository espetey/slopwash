"use client";

import { useState, useCallback, useRef, useEffect, type ReactNode } from "react";
import Image from "next/image";
import { track } from "@vercel/analytics";
import { personas } from "@/lib/personas";
import { buildPrompt, SKILL_FRONTMATTER, type PromptMode } from "@/lib/prompt";
import HeroDemo from "./_components/hero-demo";

const MCP_URL = "https://slopwash.com/api/mcp";

const PROMPT_FORMATS: {
  id: PromptMode;
  label: string;
  filename: string;
  description: string;
}[] = [
  {
    id: "rewrite",
    label: "Rewrite prompt",
    filename: "slopwash-prompt.md",
    description:
      "For chat apps and APIs. Paste your text after it, in the same message or the next one.",
  },
  {
    id: "skill",
    label: "Agent skill",
    filename: "SKILL.md",
    description:
      "An on-demand skill for coding agents and Claude. Invoke it with /slopwash on pasted text or a file.",
  },
  {
    id: "rules",
    label: "Writing rules",
    filename: "slopwash-rules.md",
    description:
      "Always-on rules for the prose an agent writes itself: docs, comments, commit messages, and replies.",
  },
];

export default function Home() {
  const [activePersonas, setActivePersonas] = useState<Set<string>>(new Set());
  const [includeNarrative, setIncludeNarrative] = useState(false);
  const [mode, setMode] = useState<PromptMode>("rewrite");
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const promptRef = useRef<HTMLPreElement>(null);

  const format = PROMPT_FORMATS.find((f) => f.id === mode) ?? PROMPT_FORMATS[0];
  const promptBody = buildPrompt(Array.from(activePersonas), undefined, {
    includeNarrative,
    mode,
  });
  const prompt =
    mode === "skill" ? `${SKILL_FRONTMATTER}\n\n${promptBody}` : promptBody;
  const handleDownload = useCallback(() => {
    const url = URL.createObjectURL(
      new Blob([prompt], { type: "text/markdown;charset=utf-8" })
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = format.filename;
    link.click();
    URL.revokeObjectURL(url);
  }, [prompt, format.filename]);

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

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="pt-12 pb-6 px-6 text-center flex flex-col items-center relative">
        <a href="https://github.com/espetey/slopwash" target="_blank" rel="noopener noreferrer" className="absolute top-4 right-4 text-zinc-600 hover:text-zinc-300 transition-colors" aria-label="GitHub">
          <svg viewBox="0 0 16 16" width="20" height="20" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>
        </a>
        <Image src="/slopwash-md.png" alt="slopwash" width={480} height={112} className="h-14 sm:h-16 w-auto" priority />
        <p className="mt-8 text-[11px] uppercase tracking-[0.2em] text-teal-300/80">
          Editorial quality control for AI writing
        </p>
        <h1 className="mt-3 text-4xl sm:text-6xl font-semibold tracking-tight text-zinc-100 max-w-3xl">
          Catch the AI writing patterns before your readers do.
        </h1>
        <p className="mt-4 text-zinc-400 text-sm sm:text-base max-w-xl mx-auto">
          Slopwash scores any text against a published standard for AI writing
          patterns, names what fails, and rewrites it clean. Find the repeated
          frames, the stock vocabulary, and the claims with nothing under
          them, then revise with every finding in view.
        </p>
        <p className="mt-3 text-xs text-zinc-600">
          Free to try &middot; Open standard &middot; Every finding explained
        </p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs">
          <a href="#how-to-use" className="text-zinc-400 hover:text-zinc-100 transition-colors">How to use</a>
          <a href="#what-it-catches" className="text-zinc-400 hover:text-zinc-100 transition-colors">What it catches</a>
          <a href="#audit" className="text-zinc-400 hover:text-zinc-100 transition-colors">The audit</a>
          <a href="#for-teams" className="text-zinc-400 hover:text-zinc-100 transition-colors">For teams</a>
          <a href="/setup" className="text-zinc-400 hover:text-zinc-100 transition-colors">Setup</a>
          <a href="/scanner" className="text-zinc-400 hover:text-zinc-100 transition-colors">Scanner</a>
          <a href="/benchmark" className="text-zinc-400 hover:text-zinc-100 transition-colors">Benchmark</a>
          <a href="/privacy" className="text-zinc-400 hover:text-zinc-100 transition-colors">Data handling</a>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 w-full pb-20">
        <div className="w-full max-w-6xl mx-auto px-4 sm:px-6">
          <HeroDemo />
        </div>
        <div className="w-full max-w-4xl mx-auto px-4 sm:px-6">

        {/* Format selector */}
        <section className="mb-6">
          <p className="text-xs uppercase tracking-widest text-zinc-500 mb-3">
            Format
          </p>
          <div role="radiogroup" aria-label="Prompt format" className="flex flex-wrap gap-2">
            {PROMPT_FORMATS.map((f) => (
              <button
                key={f.id}
                type="button"
                role="radio"
                aria-checked={mode === f.id}
                onClick={() => setMode(f.id)}
                className={`
                  px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200
                  border cursor-pointer
                  ${
                    mode === f.id
                      ? "bg-teal-500/15 border-teal-500/40 text-teal-300 shadow-[0_0_12px_-3px_rgba(45,212,191,0.25)]"
                      : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-zinc-300"
                  }
                `}
              >
                {f.label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-zinc-600">{format.description}</p>
        </section>

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
            <span className="min-w-0 truncate text-xs text-zinc-500 font-mono">
              {format.filename}
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
            <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={handleDownload}
              className="shrink-0 whitespace-nowrap px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-white"
            >
              Download
            </button>
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
              {copied ? "Copied!" : "Copy"}
            </button>
            </div>
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

        {/* What it catches */}
        <section id="what-it-catches" className="mt-12 scroll-mt-14">
          <h2 className="text-sm font-semibold text-zinc-300 mb-2">
            What it catches
          </h2>
          <p className="text-sm text-zinc-500 mb-4">
            Six sections, one published standard. Every finding names the
            passage and the pattern it matches.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-3">
              <p className="text-sm text-zinc-300 mb-1">Vocabulary</p>
              <p className="text-xs text-zinc-500">AI-vocabulary clusters and banned terms: the words models reach for when the specific word would take work.</p>
            </div>
            <div className="rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-3">
              <p className="text-sm text-zinc-300 mb-1">Structure</p>
              <p className="text-xs text-zinc-500">Repeated sentence frames, triplet stacks, and &ldquo;not only, but&rdquo; constructions that pad a paragraph and add no content.</p>
            </div>
            <div className="rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-3">
              <p className="text-sm text-zinc-300 mb-1">Tone &amp; Voice</p>
              <p className="text-xs text-zinc-500">Chat residue such as &ldquo;Certainly!&rdquo; and stock praise shapes that survive from the chat window into published text.</p>
            </div>
            <div className="rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-3">
              <p className="text-sm text-zinc-300 mb-1">Formatting &amp; Style</p>
              <p className="text-xs text-zinc-500">Em dash pile-ups, a bolded lead-in on every bullet, and list shapes that stand in for an argument.</p>
            </div>
            <div className="rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-3">
              <p className="text-sm text-zinc-300 mb-1">Content Depth</p>
              <p className="text-xs text-zinc-500">Claims with no numbers, no names, and no dates: text that sounds complete and says little.</p>
            </div>
            <div className="rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-3">
              <p className="text-sm text-zinc-300 mb-1">Consistency</p>
              <p className="text-xs text-zinc-500">Terms that drift inside one document, and a voice that changes between the first paragraph and the last.</p>
            </div>
          </div>
          <p className="text-xs text-zinc-600 mt-4">
            Slopwash evaluates writing patterns. A score does not determine
            whether a human or an AI wrote a text, and a higher score does not
            guarantee better writing.
          </p>
        </section>

        {/* Info section */}
        <section className="mt-12 grid gap-8 sm:grid-cols-2">
          <div id="how-to-use" className="scroll-mt-14">
            <h2 className="text-sm font-semibold text-zinc-300 mb-2">
              Getting started
            </h2>
            <ol className="text-sm text-zinc-500 space-y-1.5 list-decimal list-inside">
              <li>Pick a format: the rewrite prompt for chat and APIs, a skill for agents, or always-on writing rules</li>
              <li>Add personas for a specific voice, or narrative rules for stories and scenes (optional)</li>
              <li>Copy or download it</li>
              <li>Paste the rewrite prompt into a chat, then paste your text below it or in the next message</li>
            </ol>
            <p className="text-xs text-zinc-600 mt-2">
              Works with any current model, including GPT, Claude, Gemini, Llama, and Mistral.
            </p>
          </div>
          <div id="mcp-server" className="scroll-mt-14">
            <h2 className="text-sm font-semibold text-zinc-300 mb-2">
              MCP server
            </h2>
            <p className="text-sm text-zinc-500 mb-2">
              Connect an agent or chat app to the public MCP endpoint. It needs
              no API key, and every tool is read-only.
            </p>
            <code className="block text-xs bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-teal-400 font-mono break-all">
              {MCP_URL}
            </code>
            <p className="text-xs text-zinc-600 mt-2">
              Tools: <span className="text-zinc-400">get_slopwash_prompt</span>,{" "}
              <span className="text-zinc-400">prepare_rewrite</span>,{" "}
              <span className="text-zinc-400">audit_rewrite</span>, and{" "}
              <span className="text-zinc-400">analyze_text</span>. Prompts:{" "}
              <span className="text-zinc-400">rewrite</span> and{" "}
              <span className="text-zinc-400">writing_rules</span>.
            </p>
          </div>
        </section>

        {/* The audit */}
        <section id="audit" className="mt-12 scroll-mt-14">
          <h2 className="text-sm font-semibold text-zinc-300 mb-2">
            The audit
          </h2>
          <p className="text-sm text-zinc-500 mb-3">
            A one-time check of a document set: a launch post, a help center
            section, a batch of pages headed for publication. Every document is
            scored with the analyzer, and a person reads the findings before
            the report ships. The report names each failing passage, the
            pattern it matches, and the finding density per 1,000 words, so an
            editor can work from the report without trusting a number.
          </p>
          <p className="text-sm text-zinc-500 mb-3">
            The score appears in the report as context. The passages are the
            product.
          </p>
          <p className="text-sm text-zinc-300">
            $249 per audit. Book one with a message on X:{" "}
            <a href="https://x.com/slopwash" target="_blank" rel="noopener noreferrer" onClick={() => track("audit_cta_clicked")} className="text-teal-400 hover:text-teal-300 transition-colors">@slopwash</a>
          </p>
        </section>

        {/* For teams */}
        <section id="for-teams" className="mt-12 scroll-mt-14">
          <h2 className="text-sm font-semibold text-zinc-300 mb-2">
            For teams
          </h2>
          <p className="text-sm text-zinc-500 mb-4">
            Teams that publish every week usually start with an audit, then
            move to standing checks against their own voice.
          </p>
          <ul className="text-sm text-zinc-500 space-y-2">
            <li className="flex gap-2">
              <span className="text-teal-500/60 shrink-0">&bull;</span>
              <span><span className="text-zinc-300">Your voice, written down.</span> An org spec holds your terms, your banned list, and your exemplars. Specs are versioned, and a published version never changes.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-teal-500/60 shrink-0">&bull;</span>
              <span><span className="text-zinc-300">Every check on record.</span> Each run stores the spec version, the ruleset version, and the analyzer version that produced it.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-teal-500/60 shrink-0">&bull;</span>
              <span><span className="text-zinc-300">Corpus reports.</span> A period of publishing read as one set, on two readings: consistency to your voice, and dispersion inside the set. A set collapsing toward one shape is the earliest sign of AI texture spreading through a channel.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-teal-500/60 shrink-0">&bull;</span>
              <span><span className="text-zinc-300">API keys with metering,</span> for checks inside a publishing pipeline.</span>
            </li>
          </ul>
          <p className="text-xs text-zinc-600 mt-3">
            Org accounts and keys are issued directly while self-serve signup
            is in build. Ask on X:{" "}
            <a href="https://x.com/slopwash" target="_blank" rel="noopener noreferrer" className="text-zinc-400 hover:text-zinc-300 transition-colors">@slopwash</a>
          </p>
          <div className="mt-5 rounded-lg border border-teal-500/30 bg-teal-500/5 px-4 py-4">
            <p className="text-sm text-zinc-200">
              Founding pilot: $199/month
            </p>
            <p className="text-sm text-zinc-500 mt-1">
              A small number of teams run the full standing setup: an org spec
              in their voice, standing checks, corpus reports, and API access,
              with a monthly review of the findings. Pilots are set up
              directly and billed monthly. There is no self-serve checkout
              while signup is in build.
            </p>
            <p className="text-sm text-zinc-300 mt-2">
              Ask about a pilot on X:{" "}
              <a href="https://x.com/slopwash" target="_blank" rel="noopener noreferrer" onClick={() => track("pilot_cta_clicked")} className="text-teal-400 hover:text-teal-300 transition-colors">@slopwash</a>
            </p>
          </div>
        </section>

        {/* Setup guide pointer */}
        <section className="mt-12 rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-4">
          <h2 className="text-sm font-semibold text-zinc-300 mb-2">
            Setup guide
          </h2>
          <p className="text-sm text-zinc-500 mb-3">
            Connect the MCP server, load the agent skill or the writing rules,
            set up a chat app, or call the API from code. Every instruction
            lives on the setup page.
          </p>
          <a href="/setup" className="inline-block px-4 py-1.5 rounded-lg text-sm font-medium bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white transition-all duration-200">
            Open the setup guide
          </a>
        </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-8 text-center text-xs text-zinc-600">
        slopwash &middot; <a href="https://github.com/espetey/slopwash" target="_blank" rel="noopener noreferrer" className="hover:text-zinc-400 transition-colors">GitHub</a> &middot; <a href="https://x.com/slopwash" target="_blank" rel="noopener noreferrer" className="hover:text-zinc-400 transition-colors">@slopwash</a> &middot; &copy; 2026 Slopwash &middot; <a href="/privacy" className="hover:text-zinc-400 transition-colors">Data handling</a> &middot; aggregate analytics, no ad trackers
      </footer>
    </div>
  );
}

