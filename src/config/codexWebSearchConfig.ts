/**
 * Safe configuration loading for the codex_web_search extension.
 *
 * The configuration layer intentionally reads only documented environment
 * variables or an explicit in-process project config object. It never reads
 * Codex credential files, home-directory paths, or arbitrary config files.
 */
import { DEFAULT_CODEX_BINARY } from "../codex/CodexRunner.js";
import {
  CODEX_WEB_SEARCH_DEFAULTS,
  CODEX_WEB_SEARCH_LIMITS,
  CODEX_WEB_SEARCH_MODES,
  isCodexWebSearchMode,
} from "../tool/codexWebSearchApi.js";
import type {
  CodexSandboxMode,
  CodexWebSearchMode,
} from "../tool/codexWebSearchApi.js";

export const CODEX_WEB_SEARCH_CONFIG_ENV_VARS = Object.freeze({
  codexBinary: "PI_CODEX_WEB_SEARCH_CODEX_BINARY",
  defaultMode: "PI_CODEX_WEB_SEARCH_DEFAULT_MODE",
  timeoutMs: "PI_CODEX_WEB_SEARCH_TIMEOUT_MS",
  maxOutputChars: "PI_CODEX_WEB_SEARCH_MAX_OUTPUT_CHARS",
  sandbox: "PI_CODEX_WEB_SEARCH_SANDBOX",
} as const);

const CODEX_WEB_SEARCH_CONFIG_KEYS = [
  "codexBinary",
  "defaultMode",
  "timeoutMs",
  "maxOutputChars",
  "sandbox",
] as const;
const CODEX_WEB_SEARCH_CONFIG_KEY_SET = new Set<string>(CODEX_WEB_SEARCH_CONFIG_KEYS);

type CodexWebSearchConfigKey = (typeof CODEX_WEB_SEARCH_CONFIG_KEYS)[number];

export type CodexWebSearchEnvironment = Record<string, string | undefined>;

export type CodexWebSearchConfigInput = Partial<Record<CodexWebSearchConfigKey, unknown>>;

export interface CodexWebSearchConfig {
  /** Codex executable name or path passed as the execFile binary. */
  codexBinary: string;
  /** Default tool mode used when a tool call omits the public `mode` parameter. */
  defaultMode: CodexWebSearchMode;
  /** Default subprocess timeout used when a tool call omits `timeoutMs`. */
  timeoutMs: number;
  /** Default formatted output cap used when a tool call omits `maxOutputChars`. */
  maxOutputChars: number;
  /** Codex sandbox mode. The first safe version only allows read-only. */
  sandbox: CodexSandboxMode;
}

export const CODEX_WEB_SEARCH_CONFIG_DEFAULTS = Object.freeze({
  codexBinary: DEFAULT_CODEX_BINARY,
  defaultMode: CODEX_WEB_SEARCH_DEFAULTS.mode,
  timeoutMs: CODEX_WEB_SEARCH_DEFAULTS.timeoutMs,
  maxOutputChars: CODEX_WEB_SEARCH_DEFAULTS.maxOutputChars,
  sandbox: CODEX_WEB_SEARCH_DEFAULTS.sandbox,
} as const satisfies CodexWebSearchConfig);

export interface LoadCodexWebSearchConfigOptions {
  /** Environment source. Defaults to process.env. Tests may pass an isolated object. */
  env?: CodexWebSearchEnvironment;
  /** Explicit project/in-process config. Takes precedence over environment values. */
  config?: unknown;
}

export type CodexWebSearchConfigValidationSource = "environment" | "project";

export type CodexWebSearchConfigValidationCode =
  | "expected_object"
  | "unknown_property"
  | "codex_binary_invalid"
  | "default_mode_invalid"
  | "timeout_ms_invalid"
  | "max_output_chars_invalid"
  | "sandbox_invalid";

export interface CodexWebSearchConfigValidationIssue {
  source: CodexWebSearchConfigValidationSource;
  path: string;
  code: CodexWebSearchConfigValidationCode;
  message: string;
}

export type CodexWebSearchConfigValidationResult =
  | { ok: true; value: CodexWebSearchConfig }
  | { ok: false; issues: readonly CodexWebSearchConfigValidationIssue[] };

export class CodexWebSearchConfigError extends Error {
  readonly issues: readonly CodexWebSearchConfigValidationIssue[];

  constructor(issues: readonly CodexWebSearchConfigValidationIssue[]) {
    super(`Invalid codex_web_search configuration: ${formatCodexWebSearchConfigIssues(issues)}`);
    this.name = "CodexWebSearchConfigError";
    this.issues = issues;
  }
}

export function loadCodexWebSearchConfig(
  options: LoadCodexWebSearchConfigOptions = {},
): CodexWebSearchConfig {
  const result = validateCodexWebSearchConfig(options);
  if (!result.ok) {
    throw new CodexWebSearchConfigError(result.issues);
  }

  return result.value;
}

export function validateCodexWebSearchConfig(
  options: LoadCodexWebSearchConfigOptions = {},
): CodexWebSearchConfigValidationResult {
  const issues: CodexWebSearchConfigValidationIssue[] = [];
  const envInput = readCodexWebSearchEnvConfig(options.env ?? process.env);
  const envConfig = normalizeConfigInput(envInput, "environment", issues);
  const projectConfig = normalizeConfigInput(options.config ?? {}, "project", issues);

  if (issues.length > 0) {
    return { ok: false, issues };
  }

  return {
    ok: true,
    value: Object.freeze({
      ...CODEX_WEB_SEARCH_CONFIG_DEFAULTS,
      ...envConfig,
      ...projectConfig,
    }),
  };
}

export function readCodexWebSearchEnvConfig(
  env: CodexWebSearchEnvironment = process.env,
): CodexWebSearchConfigInput {
  const input: CodexWebSearchConfigInput = {};

  copyEnvValue(env, input, "codexBinary");
  copyEnvValue(env, input, "defaultMode");
  copyEnvValue(env, input, "timeoutMs");
  copyEnvValue(env, input, "maxOutputChars");
  copyEnvValue(env, input, "sandbox");

  return input;
}

export function formatCodexWebSearchConfigIssues(
  issues: readonly CodexWebSearchConfigValidationIssue[],
): string {
  if (issues.length === 0) {
    return "no validation issues were provided.";
  }

  return issues
    .map((issue) => `${issue.source}:${issue.path || "config"}: ${issue.message}`)
    .join("; ");
}

function copyEnvValue(
  env: CodexWebSearchEnvironment,
  input: CodexWebSearchConfigInput,
  key: CodexWebSearchConfigKey,
): void {
  const value = env[CODEX_WEB_SEARCH_CONFIG_ENV_VARS[key]];
  if (value !== undefined) {
    input[key] = value;
  }
}

function normalizeConfigInput(
  input: unknown,
  source: CodexWebSearchConfigValidationSource,
  issues: CodexWebSearchConfigValidationIssue[],
): Partial<CodexWebSearchConfig> {
  const normalized: Partial<CodexWebSearchConfig> = {};

  if (!isPlainObject(input)) {
    issues.push({
      source,
      path: "",
      code: "expected_object",
      message: `${source} configuration must be an object.`,
    });
    return normalized;
  }

  for (const key of Object.keys(input)) {
    if (!CODEX_WEB_SEARCH_CONFIG_KEY_SET.has(key)) {
      issues.push({
        source,
        path: key,
        code: "unknown_property",
        message: `unknown configuration setting '${key}' is not supported.`,
      });
    }
  }

  const codexBinary = getConfigValue(input, "codexBinary");
  if (codexBinary !== undefined) {
    const value = normalizeCodexBinaryConfig(codexBinary, source, "codexBinary", issues);
    if (value !== undefined) {
      normalized.codexBinary = value;
    }
  }

  const defaultMode = getConfigValue(input, "defaultMode");
  if (defaultMode !== undefined) {
    const value = normalizeDefaultModeConfig(defaultMode, source, "defaultMode", issues);
    if (value !== undefined) {
      normalized.defaultMode = value;
    }
  }

  const timeoutMs = getConfigValue(input, "timeoutMs");
  if (timeoutMs !== undefined) {
    const value = normalizeIntegerConfig({
      value: timeoutMs,
      source,
      path: "timeoutMs",
      code: "timeout_ms_invalid",
      label: "timeoutMs",
      min: CODEX_WEB_SEARCH_LIMITS.timeoutMsMin,
      max: CODEX_WEB_SEARCH_LIMITS.timeoutMsMax,
      issues,
    });
    if (value !== undefined) {
      normalized.timeoutMs = value;
    }
  }

  const maxOutputChars = getConfigValue(input, "maxOutputChars");
  if (maxOutputChars !== undefined) {
    const value = normalizeIntegerConfig({
      value: maxOutputChars,
      source,
      path: "maxOutputChars",
      code: "max_output_chars_invalid",
      label: "maxOutputChars",
      min: CODEX_WEB_SEARCH_LIMITS.maxOutputCharsMin,
      max: CODEX_WEB_SEARCH_LIMITS.maxOutputCharsMax,
      issues,
    });
    if (value !== undefined) {
      normalized.maxOutputChars = value;
    }
  }

  const sandbox = getConfigValue(input, "sandbox");
  if (sandbox !== undefined) {
    const value = normalizeSandboxConfig(sandbox, source, "sandbox", issues);
    if (value !== undefined) {
      normalized.sandbox = value;
    }
  }

  return normalized;
}

function getConfigValue(
  input: Record<string, unknown>,
  key: CodexWebSearchConfigKey,
): unknown {
  if (!Object.prototype.hasOwnProperty.call(input, key)) {
    return undefined;
  }

  return input[key];
}

function normalizeCodexBinaryConfig(
  value: unknown,
  source: CodexWebSearchConfigValidationSource,
  path: string,
  issues: CodexWebSearchConfigValidationIssue[],
): string | undefined {
  if (typeof value !== "string") {
    pushIssue(issues, source, path, "codex_binary_invalid", "codexBinary must be a string.");
    return undefined;
  }

  const binary = value.trim();
  if (binary.length === 0 || binary.includes("\0")) {
    pushIssue(
      issues,
      source,
      path,
      "codex_binary_invalid",
      "codexBinary must be a non-empty string without null bytes.",
    );
    return undefined;
  }

  return binary;
}

function normalizeDefaultModeConfig(
  value: unknown,
  source: CodexWebSearchConfigValidationSource,
  path: string,
  issues: CodexWebSearchConfigValidationIssue[],
): CodexWebSearchMode | undefined {
  const mode = typeof value === "string" ? value.trim() : value;
  if (!isCodexWebSearchMode(mode)) {
    pushIssue(
      issues,
      source,
      path,
      "default_mode_invalid",
      `defaultMode must be one of: ${CODEX_WEB_SEARCH_MODES.join(", ")}.`,
    );
    return undefined;
  }

  return mode;
}

function normalizeIntegerConfig(options: {
  value: unknown;
  source: CodexWebSearchConfigValidationSource;
  path: string;
  code: Extract<CodexWebSearchConfigValidationCode, "timeout_ms_invalid" | "max_output_chars_invalid">;
  label: string;
  min: number;
  max: number;
  issues: CodexWebSearchConfigValidationIssue[];
}): number | undefined {
  const parsed = parseIntegerConfigValue(options.value);
  if (parsed === undefined || parsed < options.min || parsed > options.max) {
    pushIssue(
      options.issues,
      options.source,
      options.path,
      options.code,
      `${options.label} must be an integer between ${options.min} and ${options.max}.`,
    );
    return undefined;
  }

  return parsed;
}

function parseIntegerConfigValue(value: unknown): number | undefined {
  if (typeof value === "number") {
    return Number.isSafeInteger(value) ? value : undefined;
  }

  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) {
    return undefined;
  }

  const parsed = Number(trimmed);
  return Number.isSafeInteger(parsed) ? parsed : undefined;
}

function normalizeSandboxConfig(
  value: unknown,
  source: CodexWebSearchConfigValidationSource,
  path: string,
  issues: CodexWebSearchConfigValidationIssue[],
): CodexSandboxMode | undefined {
  const sandbox = typeof value === "string" ? value.trim() : value;
  if (sandbox !== CODEX_WEB_SEARCH_DEFAULTS.sandbox) {
    pushIssue(
      issues,
      source,
      path,
      "sandbox_invalid",
      "sandbox must be 'read-only'; write-capable Codex sandboxes are not supported by this package.",
    );
    return undefined;
  }

  return sandbox;
}

function pushIssue(
  issues: CodexWebSearchConfigValidationIssue[],
  source: CodexWebSearchConfigValidationSource,
  path: string,
  code: CodexWebSearchConfigValidationCode,
  message: string,
): void {
  issues.push({ source, path, code, message });
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
