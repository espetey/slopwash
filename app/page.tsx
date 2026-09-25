"use client";

import { useState, useCallback, useRef, useEffect, type ReactNode } from "react";
import Image from "next/image";
import { personas } from "@/lib/personas";
import { buildPrompt, SKILL_FRONTMATTER, type PromptMode } from "@/lib/prompt";

const MCP_URL = "https://slopwash.com/api/mcp";

const json = (value: unknown) => JSON.stringify(value, null, 2);

interface McpConfig {
  id: string;
  label: string;
  file?: string;
  note?: string;
  config?: string;
  steps?: string;
  alt?: string;
  altNote?: string;
}

const MCP_CONFIGS: McpConfig[] = [
  {
    id: "vscode",
    label: "VS Code",
    file: ".vscode/mcp.json",
    note: "or run MCP: Open User Configuration to add it to every workspace",
    config: json({ servers: { slopwash: { type: "http", url: MCP_URL } } }),
    alt: `code --add-mcp '{"name":"slopwash","type":"http","url":"${MCP_URL}"}'`,
  },
  {
    id: "cursor",
    label: "Cursor",
    file: ".cursor/mcp.json",
    note: "or ~/.cursor/mcp.json for every project",
    config: json({ mcpServers: { slopwash: { url: MCP_URL } } }),
  },
  {
    id: "claude-code",
    label: "Claude Code",
    file: ".mcp.json",
    config: json({ mcpServers: { slopwash: { type: "http", url: MCP_URL } } }),
    alt: `claude mcp add --transport http slopwash ${MCP_URL}`,
    altNote: "Add --scope user to use it in every project.",
  },
  {
    id: "codex",
    label: "Codex",
    file: "~/.codex/config.toml",
    note: "shared by the Codex CLI, IDE extension, and app",
    config: `[mcp_servers.slopwash]\nurl = "${MCP_URL}"`,
    alt: `codex mcp add slopwash --url ${MCP_URL}`,
  },
  {
    id: "gemini-cli",
    label: "Gemini CLI",
    file: "~/.gemini/settings.json",
    note: "httpUrl selects Streamable HTTP; url would mean SSE",
    config: json({ mcpServers: { slopwash: { httpUrl: MCP_URL } } }),
    alt: `gemini mcp add --transport http slopwash ${MCP_URL}`,
  },
  {
    id: "windsurf",
    label: "Windsurf / Devin",
    file: "~/.config/devin/mcp_config.json",
    note: "or .devin/mcp_config.json in a project; older Windsurf builds use ~/.codeium/windsurf/mcp_config.json",
    config: json({ mcpServers: { slopwash: { url: MCP_URL } } }),
    alt: `devin mcp add -s user slopwash ${MCP_URL}`,
  },
  {
    id: "zed",
    label: "Zed",
    file: "settings.json",
    note: "or Settings \u2192 AI \u2192 MCP Servers \u2192 Add Remote Server",
    config: json({ context_servers: { slopwash: { url: MCP_URL } } }),
  },
  {
    id: "cline",
    label: "Cline",
    file: "cline_mcp_settings.json",
    note: "MCP Servers \u2192 Configure; without type, Cline falls back to SSE",
    config: json({
      mcpServers: { slopwash: { type: "streamableHttp", url: MCP_URL } },
    }),
  },
  {
    id: "claude",
    label: "Claude app",
    steps:
      "In Claude on the web or desktop, go to Customize \u2192 Connectors \u2192 + \u2192 Add custom connector and paste the URL. On Team and Enterprise plans, an Owner adds it first under Organization settings \u2192 Connectors. Free plans allow one custom connector.",
  },
  {
    id: "chatgpt",
    label: "ChatGPT",
    steps:
      "On chatgpt.com, turn on Settings \u2192 Security and login \u2192 Developer mode, then add the server at chatgpt.com/plugins with + and No Authentication. Developer mode is web-only and limited to paid plans; some plans allow only read-only tools, which is all slopwash has.",
  },
];

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
      "System prompt for chat apps and APIs. Send the text to clean inside <draft> tags.",
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
  const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null);
  const [selectedEditor, setSelectedEditor] = useState<string | null>(null);
  const selectedConfig = selectedEditor
    ? MCP_CONFIGS.find((c) => c.id === selectedEditor)
    : null;

  const copyConfig = useCallback(async (id: string, config: string) => {
    setSelectedEditor(id);
    try {
      await navigator.clipboard.writeText(config);
      setCopiedSnippet(id);
    } catch {}
  }, []);

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
          <a href="#agent-instructions" className="nav-link-haze">Skills</a>
          <a href="#chat-ui" className="nav-link-haze">Chat apps</a>
          <a href="#api-usage" className="nav-link-haze">API</a>
          <a href="#things-to-know" className="nav-link-haze">Tips</a>
          <a href="/scanner" className="nav-link-haze">Scanner</a>
          <a href="/benchmark" className="nav-link-haze">Benchmark</a>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 pb-20">
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
              <li>For the rewrite prompt, set it as the system instruction and send your text inside <span className="text-zinc-400 font-mono">&lt;draft&gt;...&lt;/draft&gt;</span> tags</li>
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

        {/* MCP Quick Start */}
        <section id="mcp-quick-start" className="mt-12 scroll-mt-14">
          <h2 className="text-sm font-semibold text-zinc-300 mb-2">
            MCP quick start
          </h2>
          <p className="text-sm text-zinc-500 mb-4">
            Pick your tool to copy its config, then paste it into the file shown.
          </p>

          <div className="flex flex-wrap gap-2">
            {MCP_CONFIGS.map((c) => (
              <button
                key={c.id}
                onClick={() => copyConfig(c.id, c.config ?? MCP_URL)}
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
              {selectedConfig.file ? (
                <p className="text-xs text-zinc-500 mb-3">
                  Paste into{" "}
                  <span className="text-zinc-300 font-mono break-all">{selectedConfig.file}</span>
                  {selectedConfig.note && (
                    <span className="text-zinc-600"> ({selectedConfig.note})</span>
                  )}
                </p>
              ) : (
                <p className="text-xs text-zinc-500 mb-3">{selectedConfig.steps}</p>
              )}
              <pre className="text-xs bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-teal-400 font-mono overflow-x-auto whitespace-pre">{selectedConfig.config ?? MCP_URL}</pre>
              {selectedConfig.alt && (
                <>
                  <p className="text-xs text-zinc-500 mt-3 mb-1">Or run in a terminal:</p>
                  <pre className="text-xs bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-teal-400 font-mono overflow-x-auto whitespace-pre">{selectedConfig.alt}</pre>
                  {selectedConfig.altNote && (
                    <p className="text-xs text-zinc-600 mt-1">{selectedConfig.altNote}</p>
                  )}
                </>
              )}
            </div>
          )}

          <p className="text-xs text-zinc-600 mt-4">
            Once connected, ask the agent to slopwash some text or a file. It calls{" "}
            <span className="text-zinc-400">prepare_rewrite</span> to get the prompt and the
            draft-wrapped text, and{" "}
            <span className="text-zinc-400">audit_rewrite</span> to check the result, using the
            retry message once if the audit fails. Pass{" "}
            <span className="text-zinc-400">personas</span> such as{" "}
            <span className="text-teal-500/80">&quot;journalist&quot;</span> to{" "}
            <span className="text-zinc-400">prepare_rewrite</span> for a specific voice. In clients that
            support MCP prompts, <span className="text-zinc-400">rewrite</span> and{" "}
            <span className="text-zinc-400">writing_rules</span> also show up as slash commands;
            type <span className="font-mono">/</span> to find them (in Claude Code,{" "}
            <span className="font-mono text-zinc-400">/mcp__slopwash__rewrite</span>).
          </p>
        </section>

        {/* Agent Instructions */}
        <section id="agent-instructions" className="mt-12 scroll-mt-14">
          <h2 className="text-sm font-semibold text-zinc-300 mb-2">
            Agent skills and rules
          </h2>
          <p className="text-sm text-zinc-500 mb-4">
            Coding agents can load slopwash two ways. A skill loads only when
            you invoke it. Writing rules load on every request, adding about
            8,000 tokens, and shape the prose the agent writes on its own. Pick
            the matching format at the top of the page before you copy or
            download.
          </p>

          <div className="space-y-4">
            <Disclosure title="Skill: Claude Code, VS Code, Cursor" open>
              <p className="text-xs text-zinc-500">
                Choose <Em>Agent skill</Em> and save the download as{" "}
                <Path>.claude/skills/slopwash/SKILL.md</Path>. All three tools
                read that folder. VS Code also reads <Path>.github/skills/</Path>,
                and Cursor also reads <Path>.cursor/skills/</Path>.
              </p>
              <p className="text-xs text-zinc-500">
                Type <Path>/slopwash</Path> followed by pasted text or a file
                reference, or ask the agent to de-slop something and it will
                load the skill on its own.
              </p>
            </Disclosure>

            <Disclosure title="VS Code (GitHub Copilot)">
              <p className="text-xs text-zinc-500">
                Writing rules in <Path>.github/copilot-instructions.md</Path>{" "}
                apply to every chat in the repo. To apply them only to docs, save
                them as <Path>.github/instructions/slopwash.instructions.md</Path>{" "}
                with an <Path>applyTo</Path> pattern at the top:
              </p>
              <CodeBlock>{`---\napplyTo: "**/*.md"\n---`}</CodeBlock>
              <p className="text-xs text-zinc-500">
                For a dedicated editor, save the agent skill download as{" "}
                <Path>.github/agents/slopwash.agent.md</Path> and pick slopwash
                from the agent dropdown in Chat. Custom agents are chosen there,
                not with <Path>@</Path>.
              </p>
            </Disclosure>

            <Disclosure title="Cursor">
              <p className="text-xs text-zinc-500">
                Save the writing rules as <Path>.cursor/rules/slopwash.mdc</Path>{" "}
                with this at the top. The <Path>.mdc</Path> extension is
                required, and <Path>.cursorrules</Path> is legacy.
              </p>
              <CodeBlock>{`---\ndescription: slopwash writing rules\nalwaysApply: true\n---`}</CodeBlock>
              <p className="text-xs text-zinc-500">
                To apply the rules only to docs, set <Path>alwaysApply: false</Path>{" "}
                and add <Path>globs: **/*.md</Path>.
              </p>
            </Disclosure>

            <Disclosure title="Claude Code">
              <p className="text-xs text-zinc-500">
                <Path>CLAUDE.md</Path> loads into every session. Save the writing
                rules as <Path>slopwash-rules.md</Path> and import them with one
                line in <Path>CLAUDE.md</Path>, so your own instructions stay
                readable:
              </p>
              <CodeBlock>@slopwash-rules.md</CodeBlock>
            </Disclosure>

            <Disclosure title="Codex, Cline, and other AGENTS.md tools">
              <p className="text-xs text-zinc-500">
                Codex, VS Code, Cursor, Devin, and Cline read{" "}
                <Path>AGENTS.md</Path> at the repo root, so pasting the writing
                rules there covers all of them. Claude Code reads it only when
                there is no <Path>CLAUDE.md</Path>. Gemini CLI reads{" "}
                <Path>GEMINI.md</Path> unless you add <Path>AGENTS.md</Path> to{" "}
                <Path>context.fileName</Path> in its settings.
              </p>
            </Disclosure>

            <Disclosure title="Windsurf / Devin">
              <p className="text-xs text-zinc-500">
                Rule files in <Path>.devin/rules/</Path> hold at most 12,000
                characters. The prompt is about 31,000, so use the MCP server
                instead. <Path>.windsurfrules</Path> still loads but is legacy.
              </p>
            </Disclosure>
          </div>
        </section>

        {/* Chat UI Setup */}
        <section id="chat-ui" className="mt-12 scroll-mt-14">
          <h2 className="text-sm font-semibold text-zinc-300 mb-2">
            Chat app setup
          </h2>
          <p className="text-sm text-zinc-500 mb-4">
            The rewrite prompt is about 31,000 characters, more than most
            settings fields hold. Put it in a project or Gem, or connect the MCP
            server. Then send your text inside{" "}
            <span className="font-mono">&lt;draft&gt;</span> tags.
          </p>

          <div className="space-y-4">
            <Disclosure title="ChatGPT">
              <p className="text-xs text-zinc-500">
                Custom instructions hold at most 5,000 characters (1,500 on Free
                and Go), so the prompt won&apos;t fit there. Create a{" "}
                <Em>project</Em> instead and paste the prompt into its
                instructions, or upload the downloaded file and set the
                instructions to &quot;Rewrite the text I send using
                slopwash-prompt.md.&quot;
              </p>
              <p className="text-xs text-zinc-500">
                On paid plans you can also connect the MCP server in developer
                mode (see MCP quick start). OpenAI retires custom GPTs on
                December 11, 2026, so don&apos;t build a new one.
              </p>
            </Disclosure>

            <Disclosure title="Claude">
              <p className="text-xs text-zinc-500">
                Create a <Em>Project</Em> and paste the prompt into its
                instructions. The rules apply to every chat in that project.
              </p>
              <p className="text-xs text-zinc-500">
                To use slopwash in any chat, upload it as a skill. Download the{" "}
                <Em>Agent skill</Em> format, put <Path>SKILL.md</Path> in a folder
                named <Path>slopwash</Path>, zip the folder, and upload it under{" "}
                <Em>Customize &rarr; Skills &rarr; + &rarr; Create skill &rarr; Upload a skill</Em>.
                Skills need code execution turned on.
              </p>
              <p className="text-xs text-zinc-500">
                Or add the MCP server as a custom connector (see MCP quick start).
              </p>
            </Disclosure>

            <Disclosure title="Gemini">
              <p className="text-xs text-zinc-500">
                Go to <Em>Gems &rarr; New Gem</Em> and paste the prompt as its
                instructions, or upload the downloaded file under Knowledge. Use
                that Gem whenever you need text cleaned.
              </p>
            </Disclosure>

            <Disclosure title="Any other chat">
              <p className="text-xs text-zinc-500">
                Paste the prompt at the start of a new conversation, followed by
                your text in <span className="font-mono">&lt;draft&gt;</span> tags.
              </p>
            </Disclosure>
          </div>
        </section>

        {/* API Usage */}
        <section id="api-usage" className="mt-12 scroll-mt-14">
          <h2 className="text-sm font-semibold text-zinc-300 mb-2">
            API usage
          </h2>
          <p className="text-sm text-zinc-500 mb-4">
            Send the rewrite prompt as the system instruction and the source
            text in <span className="font-mono">&lt;draft&gt;</span> tags. The
            examples load the downloaded file and use this helper, which escapes
            any draft tags already in the text:
          </p>
          <CodeBlock>{`import re

SLOPWASH = open("slopwash-prompt.md").read()  # from the Download button

def wrap_draft(text):
    escaped = re.sub(
        r"</?draft>",
        lambda m: m.group(0).replace("<", "&lt;").replace(">", "&gt;"),
        text,
        flags=re.IGNORECASE,
    )
    return f"<draft>\\n{escaped}\\n</draft>"`}</CodeBlock>

          <div className="space-y-4 mt-4">
            <Disclosure title="OpenAI (Responses API)" open>
              <CodeBlock>{`from openai import OpenAI

client = OpenAI()

response = client.responses.create(
    model="gpt-6-astra",
    instructions=SLOPWASH,
    input=wrap_draft(text_to_clean),
)
print(response.output_text)`}</CodeBlock>
            </Disclosure>

            <Disclosure title="Anthropic (Messages API)">
              <CodeBlock>{`import anthropic

client = anthropic.Anthropic()

message = client.messages.create(
    model="claude-opus-5-5",
    max_tokens=16000,
    system=SLOPWASH,
    messages=[{"role": "user", "content": wrap_draft(text_to_clean)}],
)
print("".join(b.text for b in message.content if b.type == "text"))`}</CodeBlock>
            </Disclosure>

            <Disclosure title="Google Gemini (Interactions API)">
              <CodeBlock>{`from google import genai

client = genai.Client()

interaction = client.interactions.create(
    model="gemini-3.8-flash",
    system_instruction=SLOPWASH,
    input=wrap_draft(text_to_clean),
)
print(interaction.output_text)`}</CodeBlock>
              <p className="text-xs text-zinc-600">Requires google-genai 2.3.0 or later.</p>
            </Disclosure>

            <Disclosure title="Let the model audit its own rewrite">
              <p className="text-xs text-zinc-500">
                The OpenAI and Anthropic APIs can call the slopwash MCP server
                during a request, so the model checks its rewrite with{" "}
                <Path>audit_rewrite</Path> before it answers. Gemini 3 models
                don&apos;t support remote MCP servers yet.
              </p>
              <CodeBlock>{`AUDIT = (
    "\\n\\nBefore you answer, pass the draft and your rewrite to "
    "audit_rewrite and fix anything it flags."
)

# OpenAI
response = client.responses.create(
    model="gpt-6-astra",
    instructions=SLOPWASH + AUDIT,
    input=wrap_draft(text_to_clean),
    tools=[{
        "type": "mcp",
        "server_label": "slopwash",
        "server_url": "${MCP_URL}",
        "allowed_tools": ["audit_rewrite"],
        "require_approval": "never",
    }],
)

# Anthropic (beta)
message = client.beta.messages.create(
    model="claude-opus-5-5",
    max_tokens=16000,
    system=SLOPWASH + AUDIT,
    messages=[{"role": "user", "content": wrap_draft(text_to_clean)}],
    mcp_servers=[{"type": "url", "url": "${MCP_URL}", "name": "slopwash"}],
    tools=[{"type": "mcp_toolset", "mcp_server_name": "slopwash"}],
    betas=["mcp-client-2025-11-20"],
)`}</CodeBlock>
            </Disclosure>

            <Disclosure title="Fetch the prompt from the MCP endpoint">
              <p className="text-xs text-zinc-500">
                Pull the current prompt at build or deploy time instead of
                committing a copy. Set <Path>mode</Path> to{" "}
                <Path>skill</Path> or <Path>rules</Path> for the other formats,
                and add <Path>personas</Path> or <Path>narrative</Path> as
                needed.
              </p>
              <CodeBlock>{`curl -s ${MCP_URL} \\
  -H "Content-Type: application/json" \\
  -H "Accept: application/json, text/event-stream" \\
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"get_slopwash_prompt","arguments":{"mode":"rewrite"}}}' \\
  | jq -r '.result.content[0].text' > slopwash-prompt.md`}</CodeBlock>
            </Disclosure>
          </div>

          <p className="text-xs text-zinc-600 mt-4">
            Model IDs are current as of September 2026. Any current model
            works, so swap in the one you use.
          </p>
        </section>

        {/* Tips */}
        <section id="things-to-know" className="mt-12 scroll-mt-14">
          <h2 className="text-sm font-semibold text-zinc-300 mb-3">
            Things to know
          </h2>
          <ul className="text-sm text-zinc-500 space-y-2">
            <li className="flex gap-2">
              <span className="text-teal-500/60 shrink-0">&bull;</span>
              <span>Put the rewrite prompt in the system message and the source in <span className="font-mono">&lt;draft&gt;</span> tags in the user message.</span>
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
              <span>Use MCP or a skill when you need slopwash now and then. Use writing rules only when every response should follow them, since they add about 8,000 tokens to each request.</span>
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

function Disclosure({
  title,
  open,
  children,
}: {
  title: string;
  open?: boolean;
  children: ReactNode;
}) {
  return (
    <details className="group rounded-lg border border-zinc-800 bg-zinc-950" open={open}>
      <summary className="flex items-center justify-between px-4 py-3 cursor-pointer text-sm text-zinc-300 hover:text-white transition-colors">
        <span>{title}</span>
        <svg className="w-4 h-4 text-zinc-500 transition-transform group-open:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
      </summary>
      <div className="px-4 pb-4 space-y-2">{children}</div>
    </details>
  );
}

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="text-xs bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-teal-400 font-mono overflow-x-auto whitespace-pre">
      {children}
    </pre>
  );
}

function Path({ children }: { children: ReactNode }) {
  return <span className="text-zinc-400 font-mono break-all">{children}</span>;
}

function Em({ children }: { children: ReactNode }) {
  return <span className="text-zinc-400">{children}</span>;
}
