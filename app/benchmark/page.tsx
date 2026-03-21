"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { benchmarkData } from "@/lib/benchmark-data";

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

export default function BenchmarkPage() {
  const [expanded, setExpanded] = useState<string | null>(null);
  const sorted = [...benchmarkData].sort((a, b) => b.avgScore - a.avgScore);

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
          Slop Benchmark — how models score out of the box
        </p>
        <div className="mt-3 flex items-center justify-center gap-5 text-xs">
          <Link href="/" className="nav-link-haze">
            Home
          </Link>
          <Link href="/scanner" className="nav-link-haze">
            Scanner
          </Link>
        </div>
      </header>

      <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 pb-20">
        <p className="mt-6 text-sm text-zinc-500 mb-6">
          Each model was given the same set of writing prompts with no system
          instructions. The output was scored using the slopwash analyzer.
          Higher scores mean fewer AI writing patterns detected.
        </p>

        <p className="text-xs text-zinc-600 mb-6 border border-zinc-800 rounded-lg px-3 py-2 bg-zinc-950">
          Placeholder data. Real benchmark results will be added once
          standardized test outputs are collected and scored.
        </p>

        {/* Leaderboard */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 divide-y divide-zinc-800">
          {/* Header */}
          <div className="flex items-center gap-4 px-4 py-2 text-xs text-zinc-500 uppercase tracking-wider">
            <span className="w-6">#</span>
            <span className="flex-1">Model</span>
            <span className="w-16 text-right">Score</span>
            <span className="w-28 hidden sm:block">Worst section</span>
            <span className="w-24" />
            <span className="w-4" />
          </div>

          {sorted.map((entry, rank) => {
            const isExpanded = expanded === entry.model;
            return (
              <div key={entry.model}>
                <button
                  onClick={() =>
                    setExpanded(isExpanded ? null : entry.model)
                  }
                  className="w-full flex items-center gap-4 px-4 py-3 text-left hover:bg-zinc-900/50 transition-colors cursor-pointer"
                >
                  <span className="text-sm text-zinc-500 font-mono w-6">
                    {rank + 1}
                  </span>
                  <div className="flex-1">
                    <span className="text-sm text-zinc-300">
                      {entry.label}
                    </span>
                    <span className="ml-2 text-xs text-zinc-600">
                      {entry.version}
                    </span>
                  </div>
                  <span
                    className={`text-sm font-mono w-16 text-right font-semibold ${scoreColor(entry.avgScore)}`}
                  >
                    {entry.avgScore}
                  </span>
                  <span className="text-xs text-zinc-500 w-28 hidden sm:block">
                    {entry.worstSection}
                  </span>
                  <div className="w-24 h-2 rounded-full bg-zinc-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${barColor(entry.avgScore)}`}
                      style={{ width: `${entry.avgScore}%` }}
                    />
                  </div>
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

                {isExpanded && (
                  <div className="px-4 pb-4 space-y-3">
                    <div className="pl-6">
                      <p className="text-xs text-zinc-500 mb-2">
                        Common tells:
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {entry.commonTells.map((t) => (
                          <span
                            key={t}
                            className="px-2 py-0.5 rounded text-[10px] bg-red-500/10 text-red-300 border border-red-500/20"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="pl-6">
                      <p className="text-xs text-zinc-500 mb-2">
                        Per-prompt scores:
                      </p>
                      <div className="space-y-1.5">
                        {entry.prompts.map((p, i) => (
                          <div
                            key={i}
                            className="flex items-center gap-3 text-xs"
                          >
                            <span className="flex-1 text-zinc-400 truncate">
                              {p.prompt}
                            </span>
                            <div className="w-16 h-1.5 rounded-full bg-zinc-800 overflow-hidden shrink-0">
                              <div
                                className={`h-full rounded-full ${barColor(p.score)}`}
                                style={{ width: `${p.score}%` }}
                              />
                            </div>
                            <span
                              className={`font-mono w-6 text-right ${scoreColor(p.score)}`}
                            >
                              {p.score}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <p className="text-xs text-zinc-600 mt-6">
          Methodology: each model receives identical prompts with default
          parameters and no system instructions. Outputs are scored by the
          slopwash heuristic analyzer. Scores reflect AI pattern density, not
          writing quality.
        </p>
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
