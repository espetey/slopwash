"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Org console (build spec Phase 3). Spec editing as new versions,
 * exemplar management, retention settings, check runs, and corpus
 * reports, over the admin API from Phase 1 and Phase 2.
 *
 * The gate is item 3's admin secret, kept in this tab's session
 * storage and sent as a header. Item 3c owns real user accounts;
 * when Erik provisions an auth provider, this gate is the one piece
 * that changes. This page adds no second auth path.
 */

interface Org {
  id: string;
  name: string;
  created_at: string;
  retention_days: number;
  embeddings_opt_out: boolean;
}

interface SpecVersion {
  id: string;
  version: number;
  spec: {
    terms: {
      banned: { term: string }[];
      required: { term: string }[];
      replacements: { from: string; to: string }[];
    };
    rules: { disabled: string[] };
  };
  created_by: string | null;
  created_at: string;
  note: string | null;
}

interface Exemplar {
  id: string;
  title: string;
  source_url: string | null;
  text_hash: string;
  chars: number;
  added_at: string;
}

interface CheckRun {
  id: string;
  spec_version: number;
  surface: string;
  input_chars: number;
  created_at: string;
  result: { score: number; orgScore: number };
}

interface CorpusGroup {
  period: string;
  genre: string;
  pieces: number;
  chars: number;
}

interface CorpusRunSummary {
  id: string;
  period: string;
  genre: string;
  reading: string;
  piece_count: number;
  created_at: string;
}

interface DraftProposal {
  requiredCandidates: { term: string; exemplarShare: number; occurrences: number }[];
  preferredCandidates: { term: string; exemplarShare: number; occurrences: number }[];
  bannedCandidates: { term: string; corrections: number }[];
  replacementCandidates: { from: string; to: string; corrections: number }[];
  exemplarCount: number;
  note: string;
}

const SECRET_KEY = "slopwash-admin-secret";

const inputClass =
  "w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500";
const labelClass = "block text-xs text-zinc-400 mb-1";
const buttonClass =
  "bg-zinc-100 text-zinc-900 text-sm font-medium rounded px-4 py-2 hover:bg-white disabled:opacity-50";
const quietButtonClass =
  "border border-zinc-700 text-zinc-200 text-sm rounded px-3 py-1.5 hover:border-zinc-500 disabled:opacity-50";

export default function OrgConsolePage() {
  const [secret, setSecret] = useState<string | null>(null);
  const [secretInput, setSecretInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [specs, setSpecs] = useState<SpecVersion[]>([]);
  const [exemplars, setExemplars] = useState<Exemplar[]>([]);
  const [checkRuns, setCheckRuns] = useState<CheckRun[]>([]);
  const [corpusGroups, setCorpusGroups] = useState<CorpusGroup[]>([]);
  const [corpusRuns, setCorpusRuns] = useState<CorpusRunSummary[]>([]);
  const [report, setReport] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftProposal | null>(null);

  // Create org form.
  const [newOrgName, setNewOrgName] = useState("");
  const [newOrgRetention, setNewOrgRetention] = useState("365");
  // Settings form.
  const [retentionInput, setRetentionInput] = useState("");
  const [optOutInput, setOptOutInput] = useState(false);
  // Spec form.
  const [specNote, setSpecNote] = useState("");
  const [bannedInput, setBannedInput] = useState("");
  const [bannedVariants, setBannedVariants] = useState("inflect");
  const [requiredInput, setRequiredInput] = useState("");
  const [replacementsInput, setReplacementsInput] = useState("");
  const [disabledInput, setDisabledInput] = useState("");
  const [overridesInput, setOverridesInput] = useState("");
  // Exemplar form.
  const [exTitle, setExTitle] = useState("");
  const [exUrl, setExUrl] = useState("");
  const [exText, setExText] = useState("");

  const api = useCallback(
    async (path: string, init?: RequestInit) => {
      const res = await fetch(path, {
        ...init,
        headers: {
          "content-type": "application/json",
          "x-admin-secret": secret ?? "",
          ...(init?.headers ?? {}),
        },
      });
      if (res.status === 401) {
        sessionStorage.removeItem(SECRET_KEY);
        setSecret(null);
        throw new Error("The admin secret was not accepted.");
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          (data as { error?: string }).error ?? `Request failed (${res.status}).`
        );
      }
      return data;
    },
    [secret]
  );

  const selected = orgs.find((o) => o.id === selectedId) ?? null;

  const loadOrgs = useCallback(async () => {
    const data = await api("/api/admin/orgs");
    setOrgs(data.orgs as Org[]);
  }, [api]);

  const loadOrgData = useCallback(
    async (orgId: string) => {
      const [specData, exData, runData, corpusData] = await Promise.all([
        api(`/api/admin/orgs/${orgId}/specs`),
        api(`/api/admin/orgs/${orgId}/exemplars`),
        api(`/api/admin/orgs/${orgId}/check-runs`),
        api(`/api/admin/orgs/${orgId}/corpus`),
      ]);
      setSpecs(specData.versions as SpecVersion[]);
      setExemplars(exData.exemplars as Exemplar[]);
      setCheckRuns(runData.check_runs as CheckRun[]);
      setCorpusGroups(corpusData.piece_groups as CorpusGroup[]);
      setCorpusRuns(corpusData.runs as CorpusRunSummary[]);
      setReport(null);
      setDraft(null);
    },
    [api]
  );

  useEffect(() => {
    const stored = sessionStorage.getItem(SECRET_KEY);
    if (stored) setSecret(stored);
  }, []);

  useEffect(() => {
    if (!secret) return;
    loadOrgs().catch((err) => setError(err.message));
  }, [secret, loadOrgs]);

  useEffect(() => {
    if (!selectedId) return;
    loadOrgData(selectedId).catch((err) => setError(err.message));
  }, [selectedId, loadOrgData]);

  useEffect(() => {
    if (selected) {
      setRetentionInput(String(selected.retention_days));
      setOptOutInput(selected.embeddings_opt_out);
    }
  }, [selected]);

  async function act(fn: () => Promise<void>) {
    setError(null);
    try {
      await fn();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something failed.");
    }
  }

  if (!secret) {
    return (
      <div className="min-h-screen px-6 py-16 max-w-md mx-auto">
        <h1 className="text-2xl font-semibold text-zinc-100">Org console</h1>
        <p className="mt-3 text-sm text-zinc-400">
          This console runs on the admin secret. Self-serve accounts land
          with item 3c; until then the secret is the gate, and it is kept
          in this browser tab only.
        </p>
        <form
          className="mt-6 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            sessionStorage.setItem(SECRET_KEY, secretInput);
            setSecret(secretInput);
          }}
        >
          <div>
            <label className={labelClass} htmlFor="secret">
              Admin secret
            </label>
            <input
              id="secret"
              type="password"
              className={inputClass}
              value={secretInput}
              onChange={(e) => setSecretInput(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-red-300">{error}</p>}
          <button type="submit" className={buttonClass}>
            Open the console
          </button>
        </form>
      </div>
    );
  }

  const nextVersion =
    specs.length > 0 ? Math.max(...specs.map((s) => s.version)) + 1 : 1;

  return (
    <div className="min-h-screen px-6 py-10 max-w-4xl mx-auto">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold text-zinc-100">Org console</h1>
        <button
          className="text-xs text-zinc-500 hover:text-zinc-300"
          onClick={() => {
            sessionStorage.removeItem(SECRET_KEY);
            setSecret(null);
          }}
        >
          Lock the console
        </button>
      </div>
      {error && <p className="mt-3 text-sm text-red-300">{error}</p>}

      <section className="mt-8">
        <h2 className="text-sm font-medium text-zinc-200">Organizations</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {orgs.map((org) => (
            <button
              key={org.id}
              onClick={() => setSelectedId(org.id)}
              className={`rounded px-3 py-1.5 text-sm border ${
                org.id === selectedId
                  ? "border-zinc-100 text-zinc-100"
                  : "border-zinc-700 text-zinc-400 hover:border-zinc-500"
              }`}
            >
              {org.name}
            </button>
          ))}
          {orgs.length === 0 && (
            <p className="text-sm text-zinc-500">No orgs yet.</p>
          )}
        </div>
        <form
          className="mt-4 grid gap-3 sm:grid-cols-3"
          onSubmit={(e) => {
            e.preventDefault();
            act(async () => {
              const org = await api("/api/admin/orgs", {
                method: "POST",
                body: JSON.stringify({
                  name: newOrgName,
                  retention_days: Number(newOrgRetention),
                }),
              });
              setNewOrgName("");
              await loadOrgs();
              setSelectedId(org.id as string);
            });
          }}
        >
          <div>
            <label className={labelClass}>New org name</label>
            <input
              className={inputClass}
              value={newOrgName}
              onChange={(e) => setNewOrgName(e.target.value)}
              required
            />
          </div>
          <div>
            <label className={labelClass}>Retention (days)</label>
            <input
              className={inputClass}
              type="number"
              min="0"
              value={newOrgRetention}
              onChange={(e) => setNewOrgRetention(e.target.value)}
            />
          </div>
          <div className="flex items-end">
            <button type="submit" className={buttonClass}>
              Create org
            </button>
          </div>
        </form>
      </section>

      {selected && (
        <>
          <section className="mt-10 border-t border-zinc-800 pt-6">
            <h2 className="text-sm font-medium text-zinc-200">
              Settings for {selected.name}
            </h2>
            <form
              className="mt-3 grid gap-3 sm:grid-cols-3"
              onSubmit={(e) => {
                e.preventDefault();
                act(async () => {
                  await api("/api/admin/orgs", {
                    method: "PATCH",
                    body: JSON.stringify({
                      id: selected.id,
                      retention_days: Number(retentionInput),
                      embeddings_opt_out: optOutInput,
                    }),
                  });
                  await loadOrgs();
                });
              }}
            >
              <div>
                <label className={labelClass}>
                  Retention (days). Corpus pieces older than this are
                  deleted by the retention job. Zero deletes at the next
                  run.
                </label>
                <input
                  className={inputClass}
                  type="number"
                  min="0"
                  value={retentionInput}
                  onChange={(e) => setRetentionInput(e.target.value)}
                />
              </div>
              <div className="flex items-end gap-2 pb-2">
                <input
                  id="optout"
                  type="checkbox"
                  checked={optOutInput}
                  onChange={(e) => setOptOutInput(e.target.checked)}
                />
                <label htmlFor="optout" className="text-sm text-zinc-300">
                  Embeddings opt out
                </label>
              </div>
              <div className="flex items-end">
                <button type="submit" className={quietButtonClass}>
                  Save settings
                </button>
              </div>
            </form>
            <button
              className="mt-4 text-sm text-red-300 border border-red-900 rounded px-3 py-1.5 hover:border-red-700"
              onClick={() => {
                if (
                  window.confirm(
                    `Delete ${selected.name} and everything stored under it? Spec versions, exemplars, check runs, and corpus data go in one step. API keys stay, with the org link cleared.`
                  )
                ) {
                  act(async () => {
                    await api("/api/admin/orgs", {
                      method: "DELETE",
                      body: JSON.stringify({ id: selected.id }),
                    });
                    setSelectedId(null);
                    await loadOrgs();
                  });
                }
              }}
            >
              Delete this org
            </button>
          </section>

          <section className="mt-10 border-t border-zinc-800 pt-6">
            <h2 className="text-sm font-medium text-zinc-200">
              Spec versions
            </h2>
            <p className="mt-1 text-xs text-zinc-500">
              Versions are fixed once saved. A change is a new version.
            </p>
            <ul className="mt-3 space-y-2">
              {specs.map((v) => (
                <li
                  key={v.id}
                  className="text-sm text-zinc-300 border border-zinc-800 rounded px-3 py-2"
                >
                  Version {v.version}
                  {v.note ? `: ${v.note}` : ""}. Banned:{" "}
                  {v.spec.terms.banned.map((t) => t.term).join(", ") || "none"}
                  . Required:{" "}
                  {v.spec.terms.required.map((t) => t.term).join(", ") ||
                    "none"}
                  . Disabled rules: {v.spec.rules.disabled.join(", ") || "none"}
                  .
                </li>
              ))}
              {specs.length === 0 && (
                <li className="text-sm text-zinc-500">No versions yet.</li>
              )}
            </ul>
            <form
              className="mt-4 grid gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                act(async () => {
                  const lines = (s: string) =>
                    s
                      .split("\n")
                      .map((l) => l.trim())
                      .filter(Boolean);
                  const spec = {
                    orgId: selected.id,
                    version: nextVersion,
                    createdAt: new Date().toISOString(),
                    note: specNote || undefined,
                    terms: {
                      banned: lines(bannedInput).map((term) => ({
                        term,
                        variants: bannedVariants,
                      })),
                      required: lines(requiredInput).map((term) => ({
                        term,
                        minPerPiece: 1,
                      })),
                      replacements: lines(replacementsInput)
                        .map((l) => l.split("->").map((p) => p.trim()))
                        .filter((p) => p.length === 2 && p[0] && p[1])
                        .map(([from, to]) => ({ from, to })),
                    },
                    rules: {
                      disabled: disabledInput
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean),
                      severityOverrides: Object.fromEntries(
                        lines(overridesInput)
                          .map((l) => l.split("=").map((p) => p.trim()))
                          .filter((p) => p.length === 2)
                      ),
                    },
                  };
                  await api(`/api/admin/orgs/${selected.id}/specs`, {
                    method: "POST",
                    body: JSON.stringify({ spec }),
                  });
                  setSpecNote("");
                  setBannedInput("");
                  setRequiredInput("");
                  setReplacementsInput("");
                  setDisabledInput("");
                  setOverridesInput("");
                  await loadOrgData(selected.id);
                });
              }}
            >
              <p className="text-sm text-zinc-300">
                Add version {nextVersion}
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Banned terms, one per line</label>
                  <textarea
                    className={inputClass}
                    rows={4}
                    value={bannedInput}
                    onChange={(e) => setBannedInput(e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelClass}>Required terms, one per line</label>
                  <textarea
                    className={inputClass}
                    rows={4}
                    value={requiredInput}
                    onChange={(e) => setRequiredInput(e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelClass}>
                    Replacements, one per line, written as: old -&gt; new
                  </label>
                  <textarea
                    className={inputClass}
                    rows={3}
                    value={replacementsInput}
                    onChange={(e) => setReplacementsInput(e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelClass}>
                    Disabled rules, comma separated, and severity overrides,
                    one per line, written as: 2.1=high
                  </label>
                  <input
                    className={inputClass}
                    value={disabledInput}
                    onChange={(e) => setDisabledInput(e.target.value)}
                    placeholder="Disabled rules"
                  />
                  <textarea
                    className={`${inputClass} mt-2`}
                    rows={2}
                    value={overridesInput}
                    onChange={(e) => setOverridesInput(e.target.value)}
                    placeholder="Severity overrides"
                  />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Banned term matching</label>
                  <select
                    className={inputClass}
                    value={bannedVariants}
                    onChange={(e) => setBannedVariants(e.target.value)}
                  >
                    <option value="inflect">Inflected forms count</option>
                    <option value="exact">Exact term only</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Note for this version</label>
                  <input
                    className={inputClass}
                    value={specNote}
                    onChange={(e) => setSpecNote(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <button type="submit" className={buttonClass}>
                  Save version {nextVersion}
                </button>
              </div>
            </form>
            <div className="mt-4">
              <button
                className={quietButtonClass}
                onClick={() =>
                  act(async () => {
                    const data = await api(
                      `/api/admin/orgs/${selected.id}/spec-draft`,
                      { method: "POST", body: JSON.stringify({}) }
                    );
                    setDraft(data as DraftProposal);
                  })
                }
              >
                Draft proposals from exemplars
              </button>
              {draft && (
                <div className="mt-3 text-sm text-zinc-300 border border-zinc-800 rounded px-3 py-2">
                  <p>{draft.note}</p>
                  <p className="mt-2">
                    Required candidates:{" "}
                    {draft.requiredCandidates
                      .map(
                        (c) =>
                          `${c.term} (in ${Math.round(c.exemplarShare * 100)}% of exemplars)`
                      )
                      .join(", ") || "none"}
                    .
                  </p>
                  <p className="mt-1">
                    Preferred candidates:{" "}
                    {draft.preferredCandidates
                      .map((c) => c.term)
                      .join(", ") || "none"}
                    .
                  </p>
                </div>
              )}
            </div>
          </section>

          <section className="mt-10 border-t border-zinc-800 pt-6">
            <h2 className="text-sm font-medium text-zinc-200">Exemplars</h2>
            <ul className="mt-3 space-y-2">
              {exemplars.map((ex) => (
                <li
                  key={ex.id}
                  className="flex items-center justify-between text-sm text-zinc-300 border border-zinc-800 rounded px-3 py-2"
                >
                  <span>
                    {ex.title}. {ex.chars} characters. Hash{" "}
                    {ex.text_hash.slice(0, 8)}.
                  </span>
                  <button
                    className="text-xs text-zinc-500 hover:text-red-300"
                    onClick={() =>
                      act(async () => {
                        await api(
                          `/api/admin/orgs/${selected.id}/exemplars`,
                          {
                            method: "DELETE",
                            body: JSON.stringify({ id: ex.id }),
                          }
                        );
                        await loadOrgData(selected.id);
                      })
                    }
                  >
                    Remove
                  </button>
                </li>
              ))}
              {exemplars.length === 0 && (
                <li className="text-sm text-zinc-500">No exemplars yet.</li>
              )}
            </ul>
            <form
              className="mt-4 grid gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                act(async () => {
                  await api(`/api/admin/orgs/${selected.id}/exemplars`, {
                    method: "POST",
                    body: JSON.stringify({
                      title: exTitle,
                      source_url: exUrl || null,
                      text: exText,
                    }),
                  });
                  setExTitle("");
                  setExUrl("");
                  setExText("");
                  await loadOrgData(selected.id);
                });
              }}
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Title</label>
                  <input
                    className={inputClass}
                    value={exTitle}
                    onChange={(e) => setExTitle(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className={labelClass}>Source URL, if any</label>
                  <input
                    className={inputClass}
                    value={exUrl}
                    onChange={(e) => setExUrl(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className={labelClass}>Text</label>
                <textarea
                  className={inputClass}
                  rows={6}
                  value={exText}
                  onChange={(e) => setExText(e.target.value)}
                  required
                />
              </div>
              <div>
                <button type="submit" className={buttonClass}>
                  Add exemplar
                </button>
              </div>
            </form>
          </section>

          <section className="mt-10 border-t border-zinc-800 pt-6">
            <h2 className="text-sm font-medium text-zinc-200">Check runs</h2>
            {checkRuns.length === 0 ? (
              <p className="mt-3 text-sm text-zinc-500">
                No org checks recorded yet.
              </p>
            ) : (
              <table className="mt-3 w-full text-sm text-zinc-300">
                <thead>
                  <tr className="text-left text-zinc-500">
                    <th className="py-1 pr-3 font-normal">When</th>
                    <th className="py-1 pr-3 font-normal">Surface</th>
                    <th className="py-1 pr-3 font-normal">Spec version</th>
                    <th className="py-1 pr-3 font-normal">Score</th>
                    <th className="py-1 pr-3 font-normal">Org score</th>
                    <th className="py-1 font-normal">Characters</th>
                  </tr>
                </thead>
                <tbody>
                  {checkRuns.map((run) => (
                    <tr key={run.id} className="border-t border-zinc-800">
                      <td className="py-1 pr-3">
                        {new Date(run.created_at).toLocaleString()}
                      </td>
                      <td className="py-1 pr-3">{run.surface}</td>
                      <td className="py-1 pr-3">{run.spec_version}</td>
                      <td className="py-1 pr-3">{run.result.score}</td>
                      <td className="py-1 pr-3">{run.result.orgScore}</td>
                      <td className="py-1">{run.input_chars}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <section className="mt-10 border-t border-zinc-800 pt-6">
            <h2 className="text-sm font-medium text-zinc-200">Corpus</h2>
            {corpusGroups.length === 0 ? (
              <p className="mt-3 text-sm text-zinc-500">
                No pieces stored. Pieces arrive through the corpus API with
                an org key.
              </p>
            ) : (
              <ul className="mt-3 space-y-1 text-sm text-zinc-300">
                {corpusGroups.map((g) => (
                  <li key={`${g.period}-${g.genre}`}>
                    {g.period}, {g.genre}: {g.pieces} pieces, {g.chars}{" "}
                    characters.
                  </li>
                ))}
              </ul>
            )}
            {corpusRuns.length > 0 && (
              <ul className="mt-4 space-y-2">
                {corpusRuns.map((run) => (
                  <li
                    key={run.id}
                    className="flex items-center justify-between text-sm text-zinc-300 border border-zinc-800 rounded px-3 py-2"
                  >
                    <span>
                      {run.period}, {run.genre}: {run.reading},{" "}
                      {run.piece_count} pieces.
                    </span>
                    <button
                      className={quietButtonClass}
                      onClick={() =>
                        act(async () => {
                          const data = await api(
                            `/api/admin/orgs/${selected.id}/corpus/reports/${run.id}`
                          );
                          setReport(data.report as string);
                        })
                      }
                    >
                      Read the report
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {report && (
              <pre className="mt-4 whitespace-pre-wrap text-xs leading-5 text-zinc-300 border border-zinc-800 rounded px-4 py-3 overflow-x-auto">
                {report}
              </pre>
            )}
          </section>
        </>
      )}
    </div>
  );
}
