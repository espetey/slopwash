"use client";

import { useState, useCallback, useEffect } from "react";
import { analyze } from "@/lib/analyzer";
import type { AnalysisResult, Violation } from "@/lib/analyzer";
import { modelIds, getAllModelProfiles } from "@/lib/analyzer/models";
import Link from "next/link";
import Image from "next/image";

const MODELS = [
  { id: "", label: "Any model" },
  ...getAllModelProfiles().map((m) => ({ id: m.id, label: m.label })),
];

function scoreColor(score: number): string {
  if (score >= 80) return "text-green-400";
  if (score >= 60) return "text-yellow-400";
  if (score >= 40) return "text-orange-400";
  return "text-red-400";
}

function barColor(score: number): string {
  if (score >= 80) return "bg-green-500/60";
  if (score >= 60) return "bg-yellow-500/60";
  if (score >= 40) return "bg-orange-500/60";
  return "bg-red-500/60";
}

function severityBadge(severity: string): string {
  switch (severity) {
    case "high":
      return "bg-red-500/20 text-red-300 border-red-500/30";
    case "moderate":
      return "bg-yellow-500/20 text-yellow-300 border-yellow-500/30";
    default:
      return "bg-zinc-700/40 text-zinc-400 border-zinc-600/30";
  }
}

export default function ScannerPage() {
  const [text, setText] = useState("");
  const [model, setModel] = useState("");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [expandedSection, setExpandedSection] = useState<number | null>(null);

  const handleScan = useCallback(() => {
    if (!text.trim()) return;
    const r = analyze(text, model ? { model } : undefined);
    setResult(r);
    setExpandedSection(null);
  }, [text, model]);

  const violationsForSection = (section: number): Violation[] =>
    result?.violations.filter((v) => v.section === section) ?? [];

  return (
    <div className="min-h-screen flex flex-col">
      <header className="pt-8 pb-4 px-6 text-center flex flex-col items-center relative">
        <a href="https://github.com/espetey/slopwash" target="_blank" rel="noopener noreferrer" className="absolute top-4 right-4 text-zinc-600 hover:text-zinc-300 transition-colors" aria-label="GitHub">
          <svg viewBox="0 0 16 16" width="20" height="20" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>
        </a>
        <Link href="/">
          <Image
            src="/slopwash-md.png"
            alt="slopwash"
            width={320}
            height={75}
            className="h-16 sm:h-20 w-auto"
            priority
          />
        </Link>
        <p className="mt-2 text-zinc-400 text-sm">
          Slop Scanner — paste text and get a heuristic analysis
        </p>
        <div className="mt-3 flex items-center justify-center gap-5 text-xs">
          <Link href="/" className="nav-link-haze">
            Home
          </Link>
          <Link href="/benchmark" className="nav-link-haze">
            Benchmark
          </Link>
        </div>
      </header>

      <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 pb-20">
        {/* Input area */}
        <section className="mt-6">
          <div className="flex flex-wrap items-end gap-3 mb-3">
            <div className="flex-1 min-w-[200px]">
              <label className="text-xs uppercase tracking-widest text-zinc-500 block mb-1">
                Model (optional)
              </label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg text-sm bg-zinc-900 border border-zinc-800 text-zinc-300 focus:border-teal-500/50 focus:outline-none transition-colors"
              >
                {MODELS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={handleScan}
              disabled={!text.trim()}
              className="px-6 py-1.5 rounded-lg text-sm font-medium bg-teal-600 text-white hover:bg-teal-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              Scan
            </button>
          </div>

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste text to analyze for AI writing patterns..."
            rows={10}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 text-sm text-zinc-300 p-4 font-mono leading-relaxed placeholder:text-zinc-600 focus:border-teal-500/50 focus:outline-none resize-y transition-colors"
          />
          <p className="text-xs text-zinc-600 mt-1">
            {text.trim()
              ? `${text.split(/\s+/).filter(Boolean).length} words`
              : "No text entered"}
          </p>
        </section>

        {/* Results */}
        {result && (
          <section className="mt-8 space-y-6">
            {/* Score */}
            <div className="flex items-center gap-6 p-6 rounded-xl border border-zinc-800 bg-zinc-950">
              <div className="text-center">
                <div className={`text-5xl font-bold ${scoreColor(result.score)}`}>
                  {result.score}
                </div>
                <div className="text-xs text-zinc-500 mt-1">/ 100</div>
              </div>
              <div className="flex-1 text-sm text-zinc-400">
                <p>
                  {result.wordCount} words &middot;{" "}
                  {result.sentenceCount} sentences &middot;{" "}
                  {result.violations.length} violation
                  {result.violations.length !== 1 ? "s" : ""}
                </p>
                <p className="text-xs text-zinc-600 mt-1">
                  {result.score >= 80
                    ? "Clean — minimal AI patterns detected"
                    : result.score >= 60
                      ? "Some AI tells present — could use a pass"
                      : result.score >= 40
                        ? "Noticeable AI patterns — rewrite recommended"
                        : "Heavy AI patterning — full rewrite needed"}
                </p>
              </div>
            </div>

            {/* Section breakdown */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-950 divide-y divide-zinc-800">
              {result.sections.map((s) => {
                const sectionViolations = violationsForSection(s.section);
                const isExpanded = expandedSection === s.section;
                return (
                  <div key={s.section}>
                    <button
                      onClick={() =>
                        setExpandedSection(isExpanded ? null : s.section)
                      }
                      className="w-full flex items-center gap-4 px-4 py-3 text-left hover:bg-zinc-900/50 transition-colors cursor-pointer"
                    >
                      <span className="text-xs text-zinc-500 font-mono w-6">
                        S{s.section}
                      </span>
                      <span className="flex-1 text-sm text-zinc-300">
                        {s.name}
                      </span>
                      <span className="text-xs text-zinc-500">
                        {s.violationCount} issue
                        {s.violationCount !== 1 ? "s" : ""}
                      </span>
                      <div className="w-24 h-2 rounded-full bg-zinc-800 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${barColor(s.score)}`}
                          style={{ width: `${s.score}%` }}
                        />
                      </div>
                      <span
                        className={`text-xs font-mono w-8 text-right ${scoreColor(s.score)}`}
                      >
                        {s.score}
                      </span>
                      <svg
                        className={`w-4 h-4 text-zinc-500 transition-transform ${isExpanded ? "rotate-90" : ""}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </button>

                    {isExpanded && sectionViolations.length > 0 && (
                      <div className="px-4 pb-3 space-y-2">
                        {sectionViolations.map((v, i) => (
                          <div
                            key={i}
                            className="flex items-start gap-3 text-xs pl-6"
                          >
                            <span
                              className={`shrink-0 px-1.5 py-0.5 rounded border text-[10px] font-medium ${severityBadge(v.severity)}`}
                            >
                              {v.severity}
                            </span>
                            <span className="text-zinc-400">{v.message}</span>
                            <span className="ml-auto text-zinc-600 font-mono shrink-0">
                              &ldquo;{v.match.length > 40 ? v.match.slice(0, 40) + "..." : v.match}&rdquo;
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {isExpanded && sectionViolations.length === 0 && (
                      <p className="px-4 pb-3 pl-10 text-xs text-zinc-600">
                        No issues found in this section.
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </main>

      <footer className="py-8 text-center text-xs text-zinc-600">
        slopwash &middot;{" "}
        <a href="https://github.com/espetey/slopwash" target="_blank" rel="noopener noreferrer" className="hover:text-zinc-400 transition-colors">GitHub</a>
        {" "}&middot;{" "}
        <a href="https://x.com/slopwash" target="_blank" rel="noopener noreferrer" className="hover:text-zinc-400 transition-colors">@slopwash</a>
      </footer>
    </div>
  );
}
