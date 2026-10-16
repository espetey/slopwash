"use client";

import { useState, useCallback } from "react";

interface Category {
  id: string;
  label: string;
  deduction: number;
  evidence: string[];
}

interface ScoreResult {
  score: number;
  word_count: number;
  categories: Category[];
}

function scoreColor(score: number): string {
  if (score >= 80) return "text-green-400";
  if (score >= 60) return "text-yellow-400";
  if (score >= 40) return "text-orange-400";
  return "text-red-400";
}

function calibrationLabel(score: number): string {
  if (score >= 90) return "Clean — minimal AI patterns detected";
  if (score >= 70) return "Light tells — could use a pass";
  if (score >= 50) return "Obvious AI texture — rewrite recommended";
  return "Slop — full rewrite needed";
}

export default function HeroDemo() {
  const [text, setText] = useState("");
  const [result, setResult] = useState<ScoreResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const handleScore = useCallback(async () => {
    if (!text.trim() || loading) return;
    setLoading(true);
    setError(null);
    setCopied(false);
    try {
      const res = await fetch("/api/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 429) {
          setError("Rate limit reached — wait a bit and try again.");
        } else if (res.status === 413) {
          setError("That text is too long — keep it under 50,000 characters.");
        } else {
          setError(
            typeof data?.error === "string"
              ? data.error
              : "Something went wrong scoring that text."
          );
        }
        setResult(null);
        return;
      }
      setResult(data as ScoreResult);
    } catch {
      setError("Could not reach the scoring API. Check your connection.");
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, [text, loading]);

  const handleCopy = useCallback(async () => {
    if (!result) return;
    const lines = [
      `Slopwash score: ${result.score}/100 — ${calibrationLabel(result.score)}`,
      `Words: ${result.word_count}`,
    ];
    if (result.categories.length === 0) {
      lines.push("No AI-tell categories flagged.");
    } else {
      lines.push("Flagged categories:");
      for (const c of result.categories) {
        lines.push(`- ${c.label} (-${c.deduction})`);
      }
    }
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Copy failed — your browser blocked clipboard access.");
    }
  }, [result]);

  return (
    <section
      aria-label="Try the slop score"
      className="mb-10 rounded-xl border border-zinc-800 bg-zinc-950 p-5 sm:p-6"
    >
      <div className="flex items-baseline justify-between gap-4 flex-wrap">
        <h2 className="text-lg font-semibold text-zinc-100">
          Try it — paste text, get a slop score
        </h2>
        <a
          href="/scanner"
          className="text-xs text-teal-300/80 hover:text-teal-300 transition-colors"
        >
          Full scanner &rarr;
        </a>
      </div>

      <div className="mt-4 flex flex-col gap-3">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste a paragraph or two of text…"
          rows={5}
          maxLength={50000}
          className="w-full rounded-xl border border-zinc-800 bg-zinc-900/60 text-sm text-zinc-200 p-4 leading-relaxed placeholder:text-zinc-600 focus:border-teal-500/50 focus:outline-none resize-y transition-colors"
        />
        <div className="flex items-center gap-3 flex-wrap">
          <button
            type="button"
            onClick={handleScore}
            disabled={!text.trim() || loading}
            className="px-6 py-2 rounded-lg text-sm font-medium bg-teal-600 text-white hover:bg-teal-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            {loading ? "Scoring…" : "Score it"}
          </button>
          <p className="text-xs text-zinc-600">
            {text.trim()
              ? `${text.split(/\s+/).filter(Boolean).length} words`
              : "No text entered"}
          </p>
        </div>
        <p className="text-[11px] text-zinc-600">
          Text is scored in memory and never stored. The API enforces per-IP
          rate limits.
        </p>
      </div>

      {error && (
        <p role="alert" className="mt-4 text-sm text-red-300">
          {error}
        </p>
      )}

      {result && (
        <div className="mt-5 border-t border-zinc-800 pt-5">
          <div className="flex items-center gap-5 flex-wrap">
            <div className="text-center">
              <div className={`text-5xl font-bold ${scoreColor(result.score)}`}>
                {result.score}
              </div>
              <div className="text-xs text-zinc-500 mt-1">/ 100</div>
            </div>
            <div className="flex-1 min-w-[200px]">
              <p className="text-sm text-zinc-300">
                {calibrationLabel(result.score)}
              </p>
              <p className="text-xs text-zinc-500 mt-1">
                {result.word_count} words &middot;{" "}
                {result.categories.length} categor
                {result.categories.length === 1 ? "y" : "ies"} flagged
              </p>
            </div>
            <button
              type="button"
              onClick={handleCopy}
              className="px-4 py-1.5 rounded-lg text-xs font-medium border border-zinc-700 text-zinc-300 hover:border-zinc-500 hover:text-zinc-100 transition-colors cursor-pointer"
            >
              {copied ? "Copied!" : "Copy results"}
            </button>
          </div>

          {result.categories.length > 0 && (
            <div className="mt-4 rounded-lg border border-zinc-800 divide-y divide-zinc-800">
              {result.categories.map((c) => {
                const isOpen = expanded === c.id;
                return (
                  <div key={c.id}>
                    <button
                      type="button"
                      onClick={() => setExpanded(isOpen ? null : c.id)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-zinc-900/50 transition-colors cursor-pointer"
                    >
                      <span className="flex-1 text-sm text-zinc-300">
                        {c.label}
                      </span>
                      <span className="text-xs text-zinc-500 font-mono">
                        -{c.deduction}
                      </span>
                      <svg
                        className={`w-3.5 h-3.5 text-zinc-500 transition-transform ${isOpen ? "rotate-90" : ""}`}
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
                    {isOpen && (
                      <ul className="px-4 pb-3 pl-8 space-y-1.5">
                        {c.evidence.slice(0, 3).map((e, i) => (
                          <li
                            key={i}
                            className="text-xs text-zinc-500 font-mono"
                          >
                            &ldquo;
                            {e.length > 60 ? e.slice(0, 60) + "…" : e}
                            &rdquo;
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
