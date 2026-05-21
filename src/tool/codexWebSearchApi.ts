/**
 * Public and internal API contract for the codex_web_search Pi tool.
 *
 * This module intentionally performs no Codex execution. It only defines the
 * tool input/result shapes and normalizes untrusted tool-call arguments into a
 * bounded execution request consumed by the argv builder and runner.
 */
export const CODEX_WEB_SEARCH_TOOL_NAME = "codex_web_search" as const;

export const CODEX_WEB_SEARCH_MODES = ["live", "cached"] as const;
export type CodexWebSearchMode = (typeof CODEX_WEB_SEARCH_MODES)[number];

export type CodexSandboxMode = "read-only";
export type CodexOutputFormat = "jsonl";

export const CODEX_WEB_SEARCH_DEFAULTS = {
  mode: "live",
  timeoutMs: 120_000,
  maxOutputChars: 12_000,
  includeRawEvents: false,
  sandbox: "read-only",
  outputFormat: "jsonl",
  maxBufferBytes: 2 * 1024 * 1024,
  skipGitRepoCheck: true,
} as const satisfies {
  mode: CodexWebSearchMode;
  timeoutMs: number;
  maxOutputChars: number;
  includeRawEvents: boolean;
  sandbox: CodexSandboxMode;
  outputFormat: CodexOutputFormat;
  maxBufferBytes: number;
  skipGitRepoCheck: boolean;
};

export const CODEX_WEB_SEARCH_LIMITS = {
  queryMaxChars: 4_000,
  timeoutMsMin: 1_000,
  timeoutMsMax: 300_000,
  maxOutputCharsMin: 500,
  maxOutputCharsMax: 50_000,
} as const;

const CODEX_WEB_SEARCH_INPUT_KEYS = ["query", "mode", "timeoutMs", "maxOutputChars", "includeRawEvents"] as const;
const CODEX_WEB_SEARCH_INPUT_KEY_SET = new Set<string>(CODEX_WEB_SEARCH_INPUT_KEYS);

export interface CodexWebSearchToolInput {
  query: string;
  mode?: CodexWebSearchMode;
  timeoutMs?: number;
  maxOutputChars?: number;
  includeRawEvents?: boolean;
}

export interface CodexWebSearchInputDefaults {
  mode?: CodexWebSearchMode;
  timeoutMs?: number;
  maxOutputChars?: number;
  sandbox?: CodexSandboxMode;
}

export interface CodexWebSearchInputNormalizationOptions {
  defaults?: CodexWebSearchInputDefaults;
}

interface ResolvedCodexWebSearchInputDefaults {
  mode: CodexWebSearchMode;
  timeoutMs: number;
  maxOutputChars: number;
  sandbox: CodexSandboxMode;
}

export interface NormalizedCodexExecutionOptions {
  sandbox: CodexSandboxMode;
  outputFormat: CodexOutputFormat;
  maxBufferBytes: number;
  skipGitRepoCheck: boolean;
}

export interface NormalizedCodexWebSearchInput {
  toolName: typeof CODEX_WEB_SEARCH_TOOL_NAME;
  query: string;
  mode: CodexWebSearchMode;
  liveSearch: boolean;
  timeoutMs: number;
  maxOutputChars: number;
  includeRawEvents: boolean;
  codex: NormalizedCodexExecutionOptions;
}

export interface CodexWebSearchSource {
  url: string;
  title?: string;
  snippet?: string;
}

export interface CodexWebSearchRawEvent {
  type?: string;
  data: unknown;
}

export interface CodexWebSearchDiagnostics {
  stderr?: string;
  stdoutBytes?: number;
  stderrBytes?: number;
  exitCode?: number;
  signal?: string;
  truncated?: boolean;
}

export type CodexWebSearchFailureCode =
  | "invalid_input"
  | "codex_not_found"
  | "codex_timeout"
  | "codex_nonzero_exit"
  | "codex_output_too_large"
  | "codex_parse_error"
  | "codex_missing_final_message"
  | "codex_cancelled"
  | "unknown_error";

export interface CodexWebSearchErrorDetails {
  code: CodexWebSearchFailureCode;
  message: string;
  retryable: boolean;
}

export interface CodexWebSearchNormalizedSuccess {
  ok: true;
  query: string;
  mode: CodexWebSearchMode;
  liveSearch: boolean;
  answer: string;
  sources: readonly CodexWebSearchSource[];
  rawEvents?: readonly CodexWebSearchRawEvent[];
  diagnostics?: CodexWebSearchDiagnostics;
}

export interface CodexWebSearchNormalizedFailure {
  ok: false;
  error: CodexWebSearchErrorDetails;
  query?: string;
  mode?: CodexWebSearchMode;
  diagnostics?: CodexWebSearchDiagnostics;
}

export type CodexWebSearchNormalizedResult =
  | CodexWebSearchNormalizedSuccess
  | CodexWebSearchNormalizedFailure;

export type CodexWebSearchValidationCode =
  | "expected_object"
  | "unknown_property"
  | "query_required"
  | "query_type"
  | "query_empty"
  | "query_too_long"
  | "mode_invalid"
  | "timeout_ms_invalid"
  | "max_output_chars_invalid"
  | "include_raw_events_invalid";

export interface CodexWebSearchValidationIssue {
  path: string;
  code: CodexWebSearchValidationCode;
  message: string;
}

export type CodexWebSearchValidationResult =
  | { ok: true; value: NormalizedCodexWebSearchInput }
  | { ok: false; issues: readonly CodexWebSearchValidationIssue[] };

export class CodexWebSearchValidationError extends Error {
  readonly issues: readonly CodexWebSearchValidationIssue[];

  constructor(issues: readonly CodexWebSearchValidationIssue[]) {
    super(`Invalid ${CODEX_WEB_SEARCH_TOOL_NAME} input: ${formatCodexWebSearchValidationIssues(issues)}`);
    this.name = "CodexWebSearchValidationError";
    this.issues = issues;
  }
}

export function isCodexWebSearchMode(value: unknown): value is CodexWebSearchMode {
  return typeof value === "string" && CODEX_WEB_SEARCH_MODES.includes(value as CodexWebSearchMode);
}

export function validateCodexWebSearchInput(
  input: unknown,
  options: CodexWebSearchInputNormalizationOptions = {},
): CodexWebSearchValidationResult {
  const issues: CodexWebSearchValidationIssue[] = [];
  const defaults = resolveInputDefaults(options.defaults);

  if (!isPlainObject(input)) {
    return {
      ok: false,
      issues: [
        {
          path: "",
          code: "expected_object",
          message: "input must be an object with codex_web_search parameters.",
        },
      ],
    };
  }

  for (const key of Object.keys(input)) {
    if (!CODEX_WEB_SEARCH_INPUT_KEY_SET.has(key)) {
      issues.push({
        path: key,
        code: "unknown_property",
        message: `unknown parameter '${key}' is not supported.`,
      });
    }
  }

  const query = normalizeQuery(input.query, issues);
  const mode = normalizeMode(input.mode, defaults.mode, issues);
  const timeoutMs = normalizeIntegerOption({
    value: input.timeoutMs,
    defaultValue: defaults.timeoutMs,
    path: "timeoutMs",
    code: "timeout_ms_invalid",
    min: CODEX_WEB_SEARCH_LIMITS.timeoutMsMin,
    max: CODEX_WEB_SEARCH_LIMITS.timeoutMsMax,
    label: "timeoutMs",
    issues,
  });
  const maxOutputChars = normalizeIntegerOption({
    value: input.maxOutputChars,
    defaultValue: defaults.maxOutputChars,
    path: "maxOutputChars",
    code: "max_output_chars_invalid",
    min: CODEX_WEB_SEARCH_LIMITS.maxOutputCharsMin,
    max: CODEX_WEB_SEARCH_LIMITS.maxOutputCharsMax,
    label: "maxOutputChars",
    issues,
  });
  const includeRawEvents = normalizeBooleanOption({
    value: input.includeRawEvents,
    defaultValue: CODEX_WEB_SEARCH_DEFAULTS.includeRawEvents,
    path: "includeRawEvents",
    code: "include_raw_events_invalid",
    label: "includeRawEvents",
    issues,
  });

  if (issues.length > 0) {
    return { ok: false, issues };
  }

  return {
    ok: true,
    value: {
      toolName: CODEX_WEB_SEARCH_TOOL_NAME,
      query,
      mode,
      liveSearch: mode === "live",
      timeoutMs,
      maxOutputChars,
      includeRawEvents,
      codex: {
        sandbox: defaults.sandbox,
        outputFormat: CODEX_WEB_SEARCH_DEFAULTS.outputFormat,
        maxBufferBytes: CODEX_WEB_SEARCH_DEFAULTS.maxBufferBytes,
        skipGitRepoCheck: CODEX_WEB_SEARCH_DEFAULTS.skipGitRepoCheck,
      },
    },
  };
}

export function normalizeCodexWebSearchInput(
  input: unknown,
  options: CodexWebSearchInputNormalizationOptions = {},
): NormalizedCodexWebSearchInput {
  const result = validateCodexWebSearchInput(input, options);
  if (!result.ok) {
    throw new CodexWebSearchValidationError(result.issues);
  }
  return result.value;
}

export function formatCodexWebSearchValidationIssues(
  issues: readonly CodexWebSearchValidationIssue[],
): string {
  if (issues.length === 0) {
    return "no validation issues were provided.";
  }
  return issues.map((issue) => `${issue.path || "input"}: ${issue.message}`).join("; ");
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function resolveInputDefaults(
  defaults: CodexWebSearchInputDefaults | undefined,
): ResolvedCodexWebSearchInputDefaults {
  const mode = defaults?.mode ?? CODEX_WEB_SEARCH_DEFAULTS.mode;
  const timeoutMs = defaults?.timeoutMs ?? CODEX_WEB_SEARCH_DEFAULTS.timeoutMs;
  const maxOutputChars = defaults?.maxOutputChars ?? CODEX_WEB_SEARCH_DEFAULTS.maxOutputChars;
  const sandbox = defaults?.sandbox ?? CODEX_WEB_SEARCH_DEFAULTS.sandbox;

  if (!isCodexWebSearchMode(mode)) {
    throw new TypeError("default mode must be either 'live' or 'cached'.");
  }

  assertDefaultIntegerInRange(
    timeoutMs,
    "timeoutMs",
    CODEX_WEB_SEARCH_LIMITS.timeoutMsMin,
    CODEX_WEB_SEARCH_LIMITS.timeoutMsMax,
  );
  assertDefaultIntegerInRange(
    maxOutputChars,
    "maxOutputChars",
    CODEX_WEB_SEARCH_LIMITS.maxOutputCharsMin,
    CODEX_WEB_SEARCH_LIMITS.maxOutputCharsMax,
  );

  if (sandbox !== CODEX_WEB_SEARCH_DEFAULTS.sandbox) {
    throw new TypeError("default sandbox must be 'read-only'.");
  }

  return { mode, timeoutMs, maxOutputChars, sandbox };
}

function assertDefaultIntegerInRange(value: unknown, label: string, min: number, max: number): void {
  if (typeof value !== "number" || !Number.isInteger(value) || value < min || value > max) {
    throw new TypeError(`default ${label} must be an integer between ${min} and ${max}.`);
  }
}

function normalizeQuery(value: unknown, issues: CodexWebSearchValidationIssue[]): string {
  if (value === undefined) {
    issues.push({
      path: "query",
      code: "query_required",
      message: "query is required.",
    });
    return "";
  }

  if (typeof value !== "string") {
    issues.push({
      path: "query",
      code: "query_type",
      message: "query must be a string.",
    });
    return "";
  }

  const query = value.trim();
  if (query.length === 0) {
    issues.push({
      path: "query",
      code: "query_empty",
      message: "query must not be empty after trimming.",
    });
    return "";
  }

  if (query.length > CODEX_WEB_SEARCH_LIMITS.queryMaxChars) {
    issues.push({
      path: "query",
      code: "query_too_long",
      message: `query must be at most ${CODEX_WEB_SEARCH_LIMITS.queryMaxChars} characters.`,
    });
    return "";
  }

  return query;
}

function normalizeMode(
  value: unknown,
  defaultValue: CodexWebSearchMode,
  issues: CodexWebSearchValidationIssue[],
): CodexWebSearchMode {
  if (value === undefined) {
    return defaultValue;
  }

  if (!isCodexWebSearchMode(value)) {
    issues.push({
      path: "mode",
      code: "mode_invalid",
      message: "mode must be either 'live' or 'cached'.",
    });
    return defaultValue;
  }

  return value;
}

function normalizeIntegerOption(options: {
  value: unknown;
  defaultValue: number;
  path: string;
  code: CodexWebSearchValidationCode;
  min: number;
  max: number;
  label: string;
  issues: CodexWebSearchValidationIssue[];
}): number {
  const { value, defaultValue, path, code, min, max, label, issues } = options;

  if (value === undefined) {
    return defaultValue;
  }

  if (typeof value !== "number" || !Number.isFinite(value) || !Number.isInteger(value) || value < min || value > max) {
    issues.push({
      path,
      code,
      message: `${label} must be an integer between ${min} and ${max}.`,
    });
    return defaultValue;
  }

  return value;
}

function normalizeBooleanOption(options: {
  value: unknown;
  defaultValue: boolean;
  path: string;
  code: CodexWebSearchValidationCode;
  label: string;
  issues: CodexWebSearchValidationIssue[];
}): boolean {
  const { value, defaultValue, path, code, label, issues } = options;

  if (value === undefined) {
    return defaultValue;
  }

  if (typeof value !== "boolean") {
    issues.push({
      path,
      code,
      message: `${label} must be a boolean.`,
    });
    return defaultValue;
  }

  return value;
}
