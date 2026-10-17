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

interface RewriteResult {
  rewrite: string;
  score_before: number;
  score_after: number;
  model: string;
  usage: { input_tokens: number; output_tokens: number };
}

type Tab = "score" | "rewrite";

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

const TEXT_LIMITS: Record<Tab, number> = { score: 50000, rewrite: 10000 };

export default function HeroDemo() {
  const [tab, setTab] = useState<Tab>("score");
  const [text, setText] = useState("");
  const [scoreResult, setScoreResult] = useState<ScoreResult | null>(null);
  const [rewriteResult, setRewriteResult] = useState<RewriteResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const switchTab = useCallback((next: Tab) => {
    setTab(next);
    setError(null);
    setCopied(false);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!text.trim() || loading) return;
    setLoading(true);
    setError(null);
    setCopied(false);
    const endpoint = tab === "score" ? "/api/score" : "/api/rewrite";
    const limit = TEXT_LIMITS[tab];
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 429) {
          setError(
            tab === "score"
              ? "Rate limit reached — wait a bit and try again."
              : "Rewrite rate limit reached (20/hour) — wait a bit and try again."
          );
        } else if (res.status === 413) {
          setError(
            `That text is too long — keep it under ${limit.toLocaleString()} characters.`
          );
        } else if (res.status === 502) {
          setError(
            typeof data?.error === "string"
              ? data.error
              : "The rewrite service had a problem. Try again."
          );
        } else {
          setError(
            typeof data?.error === "string"
              ? data.error
              : tab === "score"
                ? "Something went wrong scoring that text."
                : "Something went wrong rewriting that text."
          );
        }
        if (tab === "score") setScoreResult(null);
        else setRewriteResult(null);
        return;
      }
      if (tab === "score") setScoreResult(data as ScoreResult);
      else setRewriteResult(data as RewriteResult);
    } catch {
      setError(
        tab === "score"
          ? "Could not reach the scoring API. Check your connection."
          : "Could not reach the rewrite API. Check your connection."
      );
      if (tab === "score") setScoreResult(null);
      else setRewriteResult(null);
    } finally {
      setLoading(false);
    }
  }, [text, loading, tab]);

  const handleCopyScore = useCallback(async () => {
    if (!scoreResult) return;
    const lines = [
      `Slopwash score: ${scoreResult.score}/100 — ${calibrationLabel(scoreResult.score)}`,
      `Words: ${scoreResult.word_count}`,
    ];
    if (scoreResult.categories.length === 0) {
      lines.push("No AI-tell categories flagged.");
    } else {
      lines.push("Flagged categories:");
      for (const c of scoreResult.categories) {
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
  }, [scoreResult]);

  const handleCopyRewrite = useCallback(async () => {
    if (!rewriteResult) return;
    const lines = [
      `Slopwash rewrite: ${rewriteResult.score_before} → ${rewriteResult.score_after}`,
      "",
      rewriteResult.rewrite,
    ];
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Copy failed — your browser blocked clipboard access.");
    }
  }, [rewriteResult]);

  const limit = TEXT_LIMITS[tab];
  const wordCount = text.trim()
    ? text.split(/\s+/).filter(Boolean).length
    : 0;

  return (
    <section
      aria-label="Try the slop score and rewrite"
      className="mb-10 rounded-xl border border-zinc-800 bg-zinc-950 p-5 sm:p-6"
    >
      <div className="flex items-baseline justify-between gap-4 flex-wrap">
        <h2 className="text-lg font-semibold text-zinc-100">
          Try it — paste text, score it, wash it
        </h2>
        <a
          href="/scanner"
          className="text-xs text-teal-300/80 hover:text-teal-300 transition-colors"
        >
          Full scanner &rarr;
        </a>
      </div>

      <div
        role="tablist"
        aria-label="Demo mode"
        className="mt-4 inline-flex rounded-lg border border-zinc-800 bg-zinc-900/60 p-1"
      >
        {(["score", "rewrite"] as Tab[]).map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            type="button"
            onClick={() => switchTab(t)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors cursor-pointer ${
              tab === t
                ? "bg-zinc-800 text-zinc-100"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {t === "score" ? "Score" : "Rewrite"}
          </button>
        ))}
      </div>

      <div className="mt-4 flex flex-col gap-3">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={
            tab === "score"
              ? "Paste a paragraph or two of text…"
              : "Paste text with AI tells and get a washed rewrite…"
          }
          rows={5}
          maxLength={limit}
          className="w-full rounded-xl border border-zinc-800 bg-zinc-900/60 text-sm text-zinc-200 p-4 leading-relaxed placeholder:text-zinc-600 focus:border-teal-500/50 focus:outline-none resize-y transition-colors"
        />
        <div className="flex items-center gap-3 flex-wrap">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!text.trim() || loading}
            className="px-6 py-2 rounded-lg text-sm font-medium bg-teal-600 text-white hover:bg-teal-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            {loading
              ? tab === "score"
                ? "Scoring…"
                : "Rewriting…"
              : tab === "score"
                ? "Score it"
                : "Rewrite it"}
          </button>
          <p className="text-xs text-zinc-600">
            {text.trim() ? `${wordCount} words` : "No text entered"}
          </p>
        </div>
        <p className="text-[11px] text-zinc-600">
          Text is processed in memory and never stored. The API enforces
          per-IP rate limits
          {tab === "rewrite" ? " (20 rewrites/hour)" : ""}.
        </p>
      </div>

      {error && (
        <p role="alert" className="mt-4 text-sm text-red-300">
          {error}
        </p>
      )}

      {tab === "score" && scoreResult && (
        <div className="mt-5 border-t border-zinc-800 pt-5">
          <div className="flex items-center gap-5 flex-wrap">
            <div className="text-center">
              <div
                className={`text-5xl font-bold ${scoreColor(scoreResult.score)}`}
              >
                {scoreResult.score}
              </div>
              <div className="text-xs text-zinc-500 mt-1">/ 100</div>
            </div>
            <div className="flex-1 min-w-[200px]">
              <p className="text-sm text-zinc-300">
                {calibrationLabel(scoreResult.score)}
              </p>
              <p className="text-xs text-zinc-500 mt-1">
                {scoreResult.word_count} words &middot;{" "}
                {scoreResult.categories.length} categor
                {scoreResult.categories.length === 1 ? "y" : "ies"} flagged
              </p>
            </div>
            <button
              type="button"
              onClick={handleCopyScore}
              className="px-4 py-1.5 rounded-lg text-xs font-medium border border-zinc-700 text-zinc-300 hover:border-zinc-500 hover:text-zinc-100 transition-colors cursor-pointer"
            >
              {copied ? "Copied!" : "Copy results"}
            </button>
          </div>

          {scoreResult.categories.length > 0 && (
            <div className="mt-4 rounded-lg border border-zinc-800 divide-y divide-zinc-800">
              {scoreResult.categories.map((c) => {
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

      {tab === "rewrite" && rewriteResult && (
        <div className="mt-5 border-t border-zinc-800 pt-5">
          <div className="flex items-center gap-5 flex-wrap">
            <div className="text-4xl font-bold tracking-tight">
              <span className={scoreColor(rewriteResult.score_before)}>
                {rewriteResult.score_before}
              </span>
              <span className="text-zinc-600 mx-2">&rarr;</span>
              <span className={scoreColor(rewriteResult.score_after)}>
                {rewriteResult.score_after}
              </span>
            </div>
            <div className="flex-1 min-w-[200px]">
              <p className="text-sm text-zinc-300">
                {calibrationLabel(rewriteResult.score_after)}
              </p>
              <p className="text-xs text-zinc-500 mt-1">
                Rewritten with {rewriteResult.model} &middot;{" "}
                {rewriteResult.usage.input_tokens + rewriteResult.usage.output_tokens}{" "}
                tokens
              </p>
            </div>
            <button
              type="button"
              onClick={handleCopyRewrite}
              className="px-4 py-1.5 rounded-lg text-xs font-medium border border-zinc-700 text-zinc-300 hover:border-zinc-500 hover:text-zinc-100 transition-colors cursor-pointer"
            >
              {copied ? "Copied!" : "Copy rewrite"}
            </button>
          </div>

          <div className="mt-4 rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
            <p className="text-sm text-zinc-200 leading-relaxed whitespace-pre-wrap">
              {rewriteResult.rewrite}
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
