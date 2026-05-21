/**
 * Formatter for normalized Codex web-search results.
 *
 * This module is the final boundary before Pi sees tool output. It keeps the
 * model-facing text concise, applies the requested output character limit, adds
 * source URLs/snippets when available, and turns structured failures into
 * actionable messages without copying raw stderr, queries, argv, or local paths
 * into the text result.
 */
import type { PiToolResult } from "../pi/piExtensionContract.js";
import {
  CODEX_WEB_SEARCH_DEFAULTS,
  CODEX_WEB_SEARCH_LIMITS,
  CODEX_WEB_SEARCH_TOOL_NAME,
} from "../tool/codexWebSearchApi.js";
import type {
  CodexWebSearchDiagnostics,
  CodexWebSearchErrorDetails,
  CodexWebSearchFailureCode,
  CodexWebSearchMode,
  CodexWebSearchNormalizedFailure,
  CodexWebSearchNormalizedResult,
  CodexWebSearchNormalizedSuccess,
  CodexWebSearchRawEvent,
  CodexWebSearchSource,
} from "../tool/codexWebSearchApi.js";

export const CODEX_WEB_SEARCH_FORMAT_LIMITS = {
  maxSourcesInContent: 10,
  maxSourcesInDetails: 25,
  sourceTitleChars: 160,
  sourceSnippetChars: 240,
  maxRawEventsInDetails: 20,
  maxRawEventsJsonCharsInDetails: 8_000,
} as const;

export interface FormatCodexWebSearchToolResultOptions {
  /**
   * Maximum model-facing text length. Defaults to the normalized tool default
   * and uses the same bounds as the public `maxOutputChars` tool parameter.
   */
  maxOutputChars?: number;
}

export interface CodexWebSearchSafeDiagnostics {
  stdoutBytes?: number;
  stderrBytes?: number;
  exitCode?: number;
  signal?: string;
  truncated?: boolean;
  /** True when raw stderr existed but was intentionally omitted from Pi text/details. */
  stderrOmitted?: true;
}

export interface CodexWebSearchFormattedErrorDetails extends CodexWebSearchErrorDetails {
  action: string;
}

export interface CodexWebSearchToolResultDetails {
  toolName: typeof CODEX_WEB_SEARCH_TOOL_NAME;
  ok: boolean;
  contentTruncated: boolean;
  maxOutputChars: number;
  mode?: CodexWebSearchMode;
  liveSearch?: boolean;
  sourceCount?: number;
  sources?: readonly CodexWebSearchSource[];
  sourcesTruncated?: boolean;
  rawEventCount?: number;
  rawEvents?: readonly CodexWebSearchRawEvent[];
  rawEventsTruncated?: boolean;
  diagnostics?: CodexWebSearchSafeDiagnostics;
  error?: CodexWebSearchFormattedErrorDetails;
}

export type CodexWebSearchPiToolResult = PiToolResult<CodexWebSearchToolResultDetails>;

interface BoundedRawEvents {
  events: readonly CodexWebSearchRawEvent[];
  truncated: boolean;
}

const FAILURE_SUMMARIES: Record<CodexWebSearchFailureCode, string> = {
  invalid_input: "The codex_web_search input was invalid.",
  codex_not_found: "Codex executable was not found.",
  codex_timeout: "Codex execution timed out before completing.",
  codex_nonzero_exit: "Codex exited with a non-zero status.",
  codex_output_too_large: "Codex output exceeded the configured process buffer limit.",
  codex_parse_error: "Codex JSONL output could not be parsed.",
  codex_missing_final_message: "Codex completed without a final assistant message.",
  codex_cancelled: "Codex execution was cancelled.",
  unknown_error: "Codex execution failed before a result was available.",
};

const FAILURE_ACTIONS: Record<CodexWebSearchFailureCode, string> = {
  invalid_input: "Check the tool parameters and retry with a non-empty query and documented option values.",
  codex_not_found: "Install the Codex CLI and ensure the `codex` executable is on PATH.",
  codex_timeout: "Try a narrower query, or retry with a larger timeoutMs within the documented limit.",
  codex_nonzero_exit: "If Codex needs authentication, run `codex login` in a terminal; otherwise retry after checking the local Codex CLI.",
  codex_output_too_large: "Ask for a narrower answer or reduce the amount of requested source material.",
  codex_parse_error: "Retry once; if this persists, update Codex/the extension or report a sanitized JSONL fixture.",
  codex_missing_final_message: "Retry once; if this persists, check that the installed Codex CLI supports `codex exec --json`.",
  codex_cancelled: "Retry the search if the cancellation was unintentional.",
  unknown_error: "Retry once, then check the local Codex CLI installation if the problem persists.",
};

export function formatCodexWebSearchToolResult(
  result: CodexWebSearchNormalizedResult,
  options: FormatCodexWebSearchToolResultOptions = {},
): CodexWebSearchPiToolResult {
  const maxOutputChars = normalizeMaxOutputChars(options.maxOutputChars);
  const fullText = result.ok ? formatSuccessText(result) : formatFailureText(result);
  const boundedText = boundToolText(fullText, maxOutputChars);

  return {
    content: [
      {
        type: "text",
        text: boundedText.text,
      },
    ],
    details: createToolResultDetails(result, {
      contentTruncated: boundedText.truncated,
      maxOutputChars,
    }),
  };
}

export function boundCodexWebSearchToolText(text: string, maxOutputChars: number): { text: string; truncated: boolean } {
  return boundToolText(text, normalizeMaxOutputChars(maxOutputChars));
}

function formatSuccessText(result: CodexWebSearchNormalizedSuccess): string {
  const sections: string[] = [];
  const answer = result.answer.trim();

  sections.push(answer.length > 0 ? answer : "Codex completed but returned an empty answer.");

  const sourceLines = formatSourceLines(result.sources);
  if (sourceLines.length > 0) {
    sections.push(["Sources:", ...sourceLines].join("\n"));
  }

  return sections.join("\n\n").trimEnd();
}

function formatSourceLines(sources: readonly CodexWebSearchSource[]): string[] {
  const displayedSources = sources.slice(0, CODEX_WEB_SEARCH_FORMAT_LIMITS.maxSourcesInContent);
  const lines = displayedSources.map((source, index) => formatSourceLine(source, index + 1));

  if (sources.length > displayedSources.length) {
    const remaining = sources.length - displayedSources.length;
    lines.push(`...and ${remaining} more source${remaining === 1 ? "" : "s"}.`);
  }

  return lines;
}

function formatSourceLine(source: CodexWebSearchSource, displayIndex: number): string {
  const url = source.url.trim();
  const title = source.title === undefined ? "" : truncateInlineText(source.title, CODEX_WEB_SEARCH_FORMAT_LIMITS.sourceTitleChars);
  const snippet = source.snippet === undefined ? "" : truncateInlineText(source.snippet, CODEX_WEB_SEARCH_FORMAT_LIMITS.sourceSnippetChars);
  const firstLine = title.length > 0 && title !== url ? `${displayIndex}. ${title} — ${url}` : `${displayIndex}. ${url}`;

  if (snippet.length === 0) {
    return firstLine;
  }

  return `${firstLine}\n   ${snippet}`;
}

function formatFailureText(result: CodexWebSearchNormalizedFailure): string {
  const summary = failureSummary(result.error.code);
  const action = failureAction(result.error.code);
  const retryable = result.error.retryable ? "yes" : "no";
  const diagnosticsSummary = formatSafeDiagnosticsSummary(result.diagnostics);
  const lines = [
    `Codex web search failed (${result.error.code}).`,
    summary,
    `Action: ${action}`,
    `Retryable: ${retryable}.`,
  ];

  if (diagnosticsSummary.length > 0) {
    lines.push(`Diagnostics: ${diagnosticsSummary}`);
  }

  return lines.join("\n");
}

function createToolResultDetails(
  result: CodexWebSearchNormalizedResult,
  options: { contentTruncated: boolean; maxOutputChars: number },
): CodexWebSearchToolResultDetails {
  const details: CodexWebSearchToolResultDetails = {
    toolName: CODEX_WEB_SEARCH_TOOL_NAME,
    ok: result.ok,
    contentTruncated: options.contentTruncated,
    maxOutputChars: options.maxOutputChars,
  };

  const diagnostics = safeDiagnostics(result.diagnostics);
  if (diagnostics !== undefined) {
    details.diagnostics = diagnostics;
  }

  if (result.ok) {
    details.mode = result.mode;
    details.liveSearch = result.liveSearch;
    details.sourceCount = result.sources.length;

    if (result.sources.length > 0) {
      const sources = boundSourcesForDetails(result.sources);
      details.sources = sources;
      if (result.sources.length > sources.length) {
        details.sourcesTruncated = true;
      }
    }

    if (result.rawEvents !== undefined) {
      details.rawEventCount = result.rawEvents.length;
      const rawEvents = boundRawEventsForDetails(result.rawEvents);
      if (rawEvents.events.length > 0) {
        details.rawEvents = rawEvents.events;
      }
      if (rawEvents.truncated) {
        details.rawEventsTruncated = true;
      }
    }

    return details;
  }

  if (result.mode !== undefined) {
    details.mode = result.mode;
  }

  details.error = {
    code: result.error.code,
    message: failureSummary(result.error.code),
    retryable: result.error.retryable,
    action: failureAction(result.error.code),
  };

  return details;
}

function normalizeMaxOutputChars(value: number | undefined): number {
  if (value === undefined) {
    return CODEX_WEB_SEARCH_DEFAULTS.maxOutputChars;
  }

  if (
    typeof value !== "number"
    || !Number.isFinite(value)
    || !Number.isInteger(value)
    || value < CODEX_WEB_SEARCH_LIMITS.maxOutputCharsMin
    || value > CODEX_WEB_SEARCH_LIMITS.maxOutputCharsMax
  ) {
    throw new TypeError(
      `maxOutputChars must be an integer between ${CODEX_WEB_SEARCH_LIMITS.maxOutputCharsMin} and ${CODEX_WEB_SEARCH_LIMITS.maxOutputCharsMax}.`,
    );
  }

  return value;
}

function boundToolText(text: string, maxOutputChars: number): { text: string; truncated: boolean } {
  const normalizedText = text.trimEnd();
  if (normalizedText.length <= maxOutputChars) {
    return { text: normalizedText, truncated: false };
  }

  const notice = `\n\n[Output truncated to ${maxOutputChars} characters.]`;
  const availableChars = Math.max(0, maxOutputChars - notice.length);
  const prefix = normalizedText.slice(0, availableChars).trimEnd();
  const bounded = `${prefix}${notice}`;

  return {
    text: bounded.length <= maxOutputChars ? bounded : bounded.slice(0, maxOutputChars),
    truncated: true,
  };
}

function truncateInlineText(value: string, maxChars: number): string {
  const normalized = value.replace(/\s+/gu, " ").trim();
  if (normalized.length <= maxChars) {
    return normalized;
  }

  return `${normalized.slice(0, Math.max(0, maxChars - 1)).trimEnd()}…`;
}

function boundSourcesForDetails(sources: readonly CodexWebSearchSource[]): readonly CodexWebSearchSource[] {
  return sources.slice(0, CODEX_WEB_SEARCH_FORMAT_LIMITS.maxSourcesInDetails).map((source) => {
    const boundedSource: CodexWebSearchSource = { url: source.url.trim() };

    if (source.title !== undefined) {
      boundedSource.title = truncateInlineText(source.title, CODEX_WEB_SEARCH_FORMAT_LIMITS.sourceTitleChars);
    }

    if (source.snippet !== undefined) {
      boundedSource.snippet = truncateInlineText(source.snippet, CODEX_WEB_SEARCH_FORMAT_LIMITS.sourceSnippetChars);
    }

    return boundedSource;
  });
}

function safeDiagnostics(diagnostics: CodexWebSearchDiagnostics | undefined): CodexWebSearchSafeDiagnostics | undefined {
  if (diagnostics === undefined) {
    return undefined;
  }

  const safe: CodexWebSearchSafeDiagnostics = {};

  if (diagnostics.stdoutBytes !== undefined) {
    safe.stdoutBytes = diagnostics.stdoutBytes;
  }
  if (diagnostics.stderrBytes !== undefined) {
    safe.stderrBytes = diagnostics.stderrBytes;
  }
  if (diagnostics.exitCode !== undefined) {
    safe.exitCode = diagnostics.exitCode;
  }
  if (diagnostics.signal !== undefined) {
    safe.signal = diagnostics.signal;
  }
  if (diagnostics.truncated !== undefined) {
    safe.truncated = diagnostics.truncated;
  }
  if (diagnostics.stderr !== undefined && diagnostics.stderr.length > 0) {
    safe.stderrOmitted = true;
  }

  return Object.keys(safe).length > 0 ? safe : undefined;
}

function formatSafeDiagnosticsSummary(diagnostics: CodexWebSearchDiagnostics | undefined): string {
  const safe = safeDiagnostics(diagnostics);
  if (safe === undefined) {
    return "";
  }

  const parts: string[] = [];
  if (safe.exitCode !== undefined) {
    parts.push(`exit code ${safe.exitCode}`);
  }
  if (safe.signal !== undefined) {
    parts.push(`signal ${safe.signal}`);
  }
  if (safe.stdoutBytes !== undefined) {
    parts.push(`stdout ${safe.stdoutBytes} bytes`);
  }
  if (safe.stderrBytes !== undefined) {
    parts.push(`stderr ${safe.stderrBytes} bytes`);
  }
  if (safe.truncated === true) {
    parts.push("process output was truncated");
  }
  if (safe.stderrOmitted === true) {
    parts.push("raw stderr omitted from tool output");
  }

  return `${parts.join("; ")}.`;
}

function boundRawEventsForDetails(rawEvents: readonly CodexWebSearchRawEvent[]): BoundedRawEvents {
  const events: CodexWebSearchRawEvent[] = [];
  let usedJsonChars = 0;
  let truncated = rawEvents.length > CODEX_WEB_SEARCH_FORMAT_LIMITS.maxRawEventsInDetails;

  for (const event of rawEvents.slice(0, CODEX_WEB_SEARCH_FORMAT_LIMITS.maxRawEventsInDetails)) {
    const eventJsonChars = safeJsonLength(event);
    if (eventJsonChars === undefined || usedJsonChars + eventJsonChars > CODEX_WEB_SEARCH_FORMAT_LIMITS.maxRawEventsJsonCharsInDetails) {
      truncated = true;
      break;
    }

    usedJsonChars += eventJsonChars;
    events.push(event);
  }

  return { events, truncated };
}

function safeJsonLength(value: unknown): number | undefined {
  try {
    return JSON.stringify(value)?.length ?? 0;
  } catch {
    return undefined;
  }
}

function failureSummary(code: CodexWebSearchFailureCode): string {
  return FAILURE_SUMMARIES[code];
}

function failureAction(code: CodexWebSearchFailureCode): string {
  return FAILURE_ACTIONS[code];
}
