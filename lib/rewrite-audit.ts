import { analyze } from "./analyzer";
import type { Severity, Violation } from "./analyzer";
import { countWords } from "./analyzer/utils";
import { wrapDraft } from "./prompt";

export type RewriteAuditCode =
  | "new-number"
  | "length-increase"
  | "em-dash-increase"
  | "colon-increase"
  | "semicolon-increase"
  | "style-pattern";

export interface RewriteStats {
  words: number;
  characters: number;
  emDashes: number;
  colons: number;
  semicolons: number;
}

export interface RewriteAuditFlag {
  code: RewriteAuditCode;
  severity: Severity;
  message: string;
  match: string;
  sentence: string;
  offset: number;
  rule?: string;
}

export interface RewriteAuditOptions {
  model?: string;
  narrative?: boolean;
}

export interface RewriteAuditResult {
  passed: boolean;
  input: RewriteStats;
  output: RewriteStats;
  flags: RewriteAuditFlag[];
  retryMessage?: string;
}

const NUMBER_PATTERN = /\d+(?:,\d{3})*(?:\.\d+)?%?/g;

function countCharacter(text: string, character: string): number {
  return text.split(character).length - 1;
}

function getStats(text: string): RewriteStats {
  return {
    words: countWords(text),
    characters: text.length,
    emDashes: countCharacter(text, "\u2014"),
    colons: countCharacter(text, ":"),
    semicolons: countCharacter(text, ";"),
  };
}

function normalizeNumber(number: string): string {
  return number.replace(/,/g, "");
}

function sentenceAt(text: string, offset: number, length: number): string {
  if (length === 0 || offset < 0 || offset >= text.length) return "";

  let start = offset;
  while (start > 0 && !/[.!?\n]/.test(text[start - 1])) start--;

  let end = Math.min(text.length, offset + length);
  while (end < text.length && !/[.!?\n]/.test(text[end])) end++;
  if (end < text.length && /[.!?]/.test(text[end])) end++;

  return text.slice(start, end).trim();
}

function paragraphIndexAt(text: string, offset: number): number {
  return text.slice(0, Math.max(0, offset)).split(/\n\s*\n/).length - 1;
}

function clusteredVocabularyViolations(
  text: string,
  violations: Violation[]
): Violation[] {
  const vocabulary = violations.filter(
    (violation) => violation.rule === "1.1" || violation.rule === "1.3"
  );
  const counts = new Map<number, number>();

  for (const violation of vocabulary) {
    const paragraph = paragraphIndexAt(text, violation.offset);
    counts.set(paragraph, (counts.get(paragraph) ?? 0) + 1);
  }

  return vocabulary.filter(
    (violation) => (counts.get(paragraphIndexAt(text, violation.offset)) ?? 0) > 1
  );
}

function styleViolations(
  text: string,
  options: RewriteAuditOptions
): Violation[] {
  const violations = analyze(text, options).violations;
  const vocabulary = clusteredVocabularyViolations(text, violations);
  const structural = violations.filter(
    (violation) =>
      violation.rule !== "1.1" &&
      violation.rule !== "1.3" &&
      violation.rule !== "2.10" &&
      violation.rule !== "4.1"
  );
  const transitions = violations.filter((violation) => violation.rule === "2.10");
  const allowedTransitions = Math.max(1, Math.floor(countWords(text) / 1000));

  return [...vocabulary, ...structural, ...transitions.slice(allowedTransitions)];
}

function punctuationFlag(
  code: RewriteAuditCode,
  label: string,
  character: string,
  inputCount: number,
  outputCount: number,
  output: string
): RewriteAuditFlag | undefined {
  if (outputCount <= inputCount) return undefined;

  const matches = Array.from(output.matchAll(new RegExp(character, "g")));
  const firstAdded = matches[inputCount];
  const offset = firstAdded?.index ?? 0;

  return {
    code,
    severity: "moderate",
    message: `${label} count increased from ${inputCount} to ${outputCount}`,
    match: firstAdded?.[0] ?? character,
    sentence: sentenceAt(output, offset, 1),
    offset,
    rule: "4.1",
  };
}

function escapeControlTags(text: string): string {
  return text.replace(
    /<\/?(?:draft|source|failed_checks|flagged_sentences)>/gi,
    (tag) =>
    tag.replace("<", "&lt;").replace(">", "&gt;")
  );
}

export function buildRetryMessage(
  original: string,
  rewritten: string,
  flags: RewriteAuditFlag[]
): string {
  const flaggedSentences = Array.from(
    new Set(flags.map((flag) => flag.sentence).filter(Boolean))
  );
  const checks = flags.map((flag) => `- ${flag.message}`).join("\n");
  const sentences = flaggedSentences.length
    ? flaggedSentences.map((sentence) => `- ${sentence}`).join("\n")
    : "- The rewrite as a whole failed a length or content-preservation check.";

  return `The previous rewrite failed automated checks. Correct the flagged sentences, preserve all unflagged content unless grammar requires a small adjustment, and return the complete rewrite only. Use the source only to remove additions; do not restore slop from it.

<source>
${escapeControlTags(original)}
</source>

${wrapDraft(rewritten)}

<failed_checks>
${checks}
</failed_checks>

<flagged_sentences>
${escapeControlTags(sentences)}
</flagged_sentences>`;
}

export function auditRewrite(
  original: string,
  rewritten: string,
  options: RewriteAuditOptions = {}
): RewriteAuditResult {
  const input = getStats(original);
  const output = getStats(rewritten);
  const flags: RewriteAuditFlag[] = [];
  const inputNumbers = new Set(
    Array.from(original.matchAll(NUMBER_PATTERN), (match) =>
      normalizeNumber(match[0])
    )
  );

  for (const match of rewritten.matchAll(NUMBER_PATTERN)) {
    if (inputNumbers.has(normalizeNumber(match[0]))) continue;
    const offset = match.index ?? 0;
    flags.push({
      code: "new-number",
      severity: "high",
      message: `Number "${match[0]}" does not appear in the original`,
      match: match[0],
      sentence: sentenceAt(rewritten, offset, match[0].length),
      offset,
      rule: "5.1",
    });
  }

  const noticeableGrowth = Math.max(5, Math.ceil(input.words * 0.1));
  if (output.words > input.words + noticeableGrowth) {
    flags.push({
      code: "length-increase",
      severity: "high",
      message: `Rewrite grew from ${input.words} to ${output.words} words`,
      match: `${output.words} words`,
      sentence: "",
      offset: 0,
    });
  }

  const punctuationFlags = [
    punctuationFlag(
      "em-dash-increase",
      "Em dash",
      "\u2014",
      input.emDashes,
      output.emDashes,
      rewritten
    ),
    punctuationFlag(
      "colon-increase",
      "Colon",
      ":",
      input.colons,
      output.colons,
      rewritten
    ),
    punctuationFlag(
      "semicolon-increase",
      "Semicolon",
      ";",
      input.semicolons,
      output.semicolons,
      rewritten
    ),
  ].filter((flag): flag is RewriteAuditFlag => Boolean(flag));
  flags.push(...punctuationFlags);

  const seenStyleFlags = new Set<string>();
  for (const violation of styleViolations(rewritten, options)) {
    const key = `${violation.rule}:${violation.offset}:${violation.match.toLowerCase()}`;
    if (seenStyleFlags.has(key)) continue;
    seenStyleFlags.add(key);
    flags.push({
      code: "style-pattern",
      severity: violation.severity,
      message: violation.message,
      match: violation.match,
      sentence:
        sentenceAt(rewritten, violation.offset, violation.length) || violation.match,
      offset: violation.offset,
      rule: violation.rule,
    });
  }

  const result: RewriteAuditResult = {
    passed: flags.length === 0,
    input,
    output,
    flags,
  };

  if (!result.passed) {
    result.retryMessage = buildRetryMessage(original, rewritten, flags);
  }

  return result;
}