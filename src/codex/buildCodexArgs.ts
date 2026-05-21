/**
 * Safe argv construction for `codex exec`.
 *
 * This module intentionally does not spawn Codex. It only converts already
 * normalized tool input into an argv array suitable for `execFile("codex", argv)`
 * or `spawn("codex", argv)`. User input is always kept as one positional argv
 * element after an end-of-options marker and is never shell-interpolated.
 */
import type { CodexOutputFormat, NormalizedCodexWebSearchInput } from "../tool/codexWebSearchApi.js";

export const CODEX_EXEC_SUBCOMMAND = "exec" as const;
export const CODEX_EXEC_PROMPT_SEPARATOR = "--" as const;

/**
 * The current safe contract permits only the documented read-only sandbox.
 * Future configuration work must deliberately expand this allowlist before
 * write-capable Codex sandboxes can be emitted.
 */
export const SAFE_CODEX_SANDBOXES = ["read-only"] as const;
export type SafeCodexSandboxMode = (typeof SAFE_CODEX_SANDBOXES)[number];

export const SUPPORTED_CODEX_OUTPUT_FORMATS = ["jsonl"] as const satisfies readonly CodexOutputFormat[];
export type SupportedCodexOutputFormat = (typeof SUPPORTED_CODEX_OUTPUT_FORMATS)[number];

export class CodexArgvBuilderError extends Error {
  constructor(message: string) {
    super(`Cannot build Codex argv: ${message}`);
    this.name = "CodexArgvBuilderError";
  }
}

export function isSafeCodexSandboxMode(value: unknown): value is SafeCodexSandboxMode {
  return typeof value === "string" && SAFE_CODEX_SANDBOXES.includes(value as SafeCodexSandboxMode);
}

export function isSupportedCodexOutputFormat(value: unknown): value is SupportedCodexOutputFormat {
  return typeof value === "string" && SUPPORTED_CODEX_OUTPUT_FORMATS.includes(value as SupportedCodexOutputFormat);
}

/**
 * Build arguments for the Codex executable.
 *
 * The returned array intentionally excludes the executable name. A later runner
 * should call Codex with a non-shell API such as:
 *
 * ```ts
 * execFile("codex", buildCodexExecArgs(input), options)
 * ```
 */
export function buildCodexExecArgs(input: NormalizedCodexWebSearchInput): readonly string[] {
  assertNormalizedInputShape(input);

  const args: string[] = [CODEX_EXEC_SUBCOMMAND, "--json"];

  if (input.mode === "live") {
    args.push("--search");
  }

  if (input.codex.skipGitRepoCheck) {
    args.push("--skip-git-repo-check");
  }

  args.push("--sandbox", input.codex.sandbox, CODEX_EXEC_PROMPT_SEPARATOR, input.query);

  return Object.freeze(args);
}

function assertNormalizedInputShape(input: NormalizedCodexWebSearchInput): void {
  if (!isPlainObject(input)) {
    throw new CodexArgvBuilderError("input must be a normalized codex_web_search object.");
  }

  if (input.mode !== "live" && input.mode !== "cached") {
    throw new CodexArgvBuilderError("mode must be either 'live' or 'cached'.");
  }

  if (typeof input.liveSearch !== "boolean" || input.liveSearch !== (input.mode === "live")) {
    throw new CodexArgvBuilderError("liveSearch must match the normalized mode.");
  }

  if (typeof input.query !== "string" || input.query.length === 0) {
    throw new CodexArgvBuilderError("query must be a non-empty string.");
  }

  if (input.query.includes("\0")) {
    throw new CodexArgvBuilderError("query must not contain null bytes.");
  }

  if (!isPlainObject(input.codex)) {
    throw new CodexArgvBuilderError("codex execution options are required.");
  }

  if (!isSupportedCodexOutputFormat(input.codex.outputFormat)) {
    throw new CodexArgvBuilderError("outputFormat must be 'jsonl'.");
  }

  if (!isSafeCodexSandboxMode(input.codex.sandbox)) {
    throw new CodexArgvBuilderError("sandbox must be the documented safe value 'read-only'.");
  }

  if (typeof input.codex.skipGitRepoCheck !== "boolean") {
    throw new CodexArgvBuilderError("skipGitRepoCheck must be a boolean.");
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
