/**
 * Safe subprocess runner for `codex exec`.
 *
 * The runner owns process execution only: it builds the reviewed argv array,
 * calls the configured Codex executable with `execFile`, and converts process
 * failures into structured errors. It intentionally does not parse Codex JSONL;
 * a parser can be injected through `runAndParse` so parse failures receive the
 * same structured error treatment without implementing parsing in this module.
 */
import { execFile as nodeExecFile } from "node:child_process";
import type {
  ChildProcess,
  ExecFileException,
  ExecFileOptionsWithStringEncoding,
} from "node:child_process";

import { buildCodexExecArgs } from "./buildCodexArgs.js";
import type {
  CodexWebSearchDiagnostics,
  CodexWebSearchFailureCode,
  NormalizedCodexWebSearchInput,
} from "../tool/codexWebSearchApi.js";

export const DEFAULT_CODEX_BINARY = "codex" as const;
export const CODEX_RUNNER_KILL_SIGNAL = "SIGTERM" as const;

export type CodexRunnerErrorCode = Extract<
  CodexWebSearchFailureCode,
  | "invalid_input"
  | "codex_not_found"
  | "codex_timeout"
  | "codex_nonzero_exit"
  | "codex_output_too_large"
  | "codex_parse_error"
  | "codex_cancelled"
  | "unknown_error"
>;

export interface CodexRunnerExecutorOptions {
  encoding: "utf8";
  timeoutMs: number;
  maxBufferBytes: number;
  killSignal: typeof CODEX_RUNNER_KILL_SIGNAL;
  shell: false;
  signal?: AbortSignal;
}

export interface CodexRunnerProcessError extends Error {
  code?: string | number | null;
  killed?: boolean;
  signal?: string | null;
}

export type CodexRunnerExecutorCallback = (
  error: CodexRunnerProcessError | null,
  stdout: string | Buffer | undefined,
  stderr: string | Buffer | undefined,
) => void;

export type CodexRunnerExecutor = (
  file: string,
  args: readonly string[],
  options: CodexRunnerExecutorOptions,
  callback: CodexRunnerExecutorCallback,
) => ChildProcess | unknown;

export type CodexArgsBuilder = (input: NormalizedCodexWebSearchInput) => readonly string[];

export interface CodexRunnerOptions {
  /**
   * Codex executable to invoke. Defaults to the PATH-resolved `codex` binary.
   */
  codexBinary?: string;
  /**
   * Test seam for process execution. Production code uses node:child_process
   * execFile through a thin adapter that never enables shell execution.
   */
  execFile?: CodexRunnerExecutor;
  /**
   * Test seam for argv construction. Production code uses buildCodexExecArgs.
   */
  buildArgs?: CodexArgsBuilder;
}

export interface CodexRunnerRunOptions {
  /** Optional caller cancellation signal passed to execFile. */
  signal?: AbortSignal;
}

export interface CodexRunnerRawResult {
  stdout: string;
  stderr: string;
  diagnostics: CodexWebSearchDiagnostics;
}

export interface CodexRunnerParsedResult<TParsed> extends CodexRunnerRawResult {
  parsed: TParsed;
}

export type CodexOutputParser<TParsed> = (
  raw: CodexRunnerRawResult,
) => TParsed | Promise<TParsed>;

export interface CodexRunnerErrorOptions {
  code: CodexRunnerErrorCode;
  message: string;
  retryable: boolean;
  diagnostics?: CodexWebSearchDiagnostics;
  cause?: unknown;
}

export class CodexRunnerError extends Error {
  readonly code: CodexRunnerErrorCode;
  readonly retryable: boolean;
  readonly diagnostics?: CodexWebSearchDiagnostics;

  constructor(options: CodexRunnerErrorOptions) {
    super(options.message);
    this.name = "CodexRunnerError";
    this.code = options.code;
    this.retryable = options.retryable;

    if (options.diagnostics !== undefined) {
      this.diagnostics = options.diagnostics;
    }

    if (options.cause !== undefined) {
      (this as Error & { cause?: unknown }).cause = options.cause;
    }
  }
}

export class CodexRunner {
  private readonly codexBinary: string;
  private readonly execFile: CodexRunnerExecutor;
  private readonly buildArgs: CodexArgsBuilder;

  constructor(options: CodexRunnerOptions = {}) {
    this.codexBinary = normalizeCodexBinary(options.codexBinary);
    this.execFile = options.execFile ?? defaultExecFile;
    this.buildArgs = options.buildArgs ?? buildCodexExecArgs;
  }

  async run(
    input: NormalizedCodexWebSearchInput,
    options: CodexRunnerRunOptions = {},
  ): Promise<CodexRunnerRawResult> {
    const args = this.safeBuildArgs(input);
    const timeoutMs = requirePositiveInteger(input.timeoutMs, "timeoutMs");
    const maxBufferBytes = requirePositiveInteger(input.codex.maxBufferBytes, "maxBufferBytes");
    const executorOptionInput: { timeoutMs: number; maxBufferBytes: number; signal?: AbortSignal } = {
      timeoutMs,
      maxBufferBytes,
    };
    if (options.signal !== undefined) {
      executorOptionInput.signal = options.signal;
    }
    const executorOptions = buildExecutorOptions(executorOptionInput);

    return new Promise<CodexRunnerRawResult>((resolve, reject) => {
      const callback: CodexRunnerExecutorCallback = (error, rawStdout, rawStderr) => {
        const stdout = normalizeProcessOutput(rawStdout);
        const stderr = normalizeProcessOutput(rawStderr);

        if (error !== null) {
          reject(toCodexRunnerError(error, stdout, stderr));
          return;
        }

        resolve({
          stdout,
          stderr,
          diagnostics: createDiagnostics(stdout, stderr, { exitCode: 0 }),
        });
      };

      try {
        this.execFile(this.codexBinary, args, executorOptions, callback);
      } catch (error) {
        reject(toCodexRunnerError(toProcessError(error), "", ""));
      }
    });
  }

  async runAndParse<TParsed>(
    input: NormalizedCodexWebSearchInput,
    parseOutput: CodexOutputParser<TParsed>,
    options: CodexRunnerRunOptions = {},
  ): Promise<CodexRunnerParsedResult<TParsed>> {
    const raw = await this.run(input, options);

    try {
      const parsed = await parseOutput(raw);
      return { ...raw, parsed };
    } catch (error) {
      throw new CodexRunnerError({
        code: "codex_parse_error",
        message: "Codex JSONL output could not be parsed.",
        retryable: false,
        diagnostics: raw.diagnostics,
        cause: error,
      });
    }
  }

  private safeBuildArgs(input: NormalizedCodexWebSearchInput): readonly string[] {
    try {
      return this.buildArgs(input);
    } catch (error) {
      throw new CodexRunnerError({
        code: "invalid_input",
        message: "Codex execution input could not be converted into a safe argv array.",
        retryable: false,
        cause: error,
      });
    }
  }
}

function defaultExecFile(
  file: string,
  args: readonly string[],
  options: CodexRunnerExecutorOptions,
  callback: CodexRunnerExecutorCallback,
): ChildProcess {
  const execFileOptions: ExecFileOptionsWithStringEncoding = {
    encoding: options.encoding,
    timeout: options.timeoutMs,
    maxBuffer: options.maxBufferBytes,
    killSignal: options.killSignal,
    windowsHide: true,
    shell: false,
  };

  if (options.signal !== undefined) {
    execFileOptions.signal = options.signal;
  }

  return nodeExecFile(
    file,
    [...args],
    execFileOptions,
    (error: ExecFileException | null, stdout: string, stderr: string) => {
      callback(error, stdout, stderr);
    },
  );
}

function buildExecutorOptions(options: {
  timeoutMs: number;
  maxBufferBytes: number;
  signal?: AbortSignal;
}): CodexRunnerExecutorOptions {
  const executorOptions: CodexRunnerExecutorOptions = {
    encoding: "utf8",
    timeoutMs: options.timeoutMs,
    maxBufferBytes: options.maxBufferBytes,
    killSignal: CODEX_RUNNER_KILL_SIGNAL,
    shell: false,
  };

  if (options.signal !== undefined) {
    executorOptions.signal = options.signal;
  }

  return executorOptions;
}

function normalizeCodexBinary(value: string | undefined): string {
  if (value === undefined) {
    return DEFAULT_CODEX_BINARY;
  }

  const binary = value.trim();
  if (binary.length === 0) {
    throw new TypeError("codexBinary must be a non-empty string after trimming.");
  }

  if (binary.includes("\0")) {
    throw new TypeError("codexBinary must not contain null bytes.");
  }

  return binary;
}

function requirePositiveInteger(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value <= 0) {
    throw new CodexRunnerError({
      code: "invalid_input",
      message: `${label} must be a positive integer before Codex can be executed.`,
      retryable: false,
    });
  }

  return value;
}

function toCodexRunnerError(
  error: CodexRunnerProcessError,
  stdout: string,
  stderr: string,
): CodexRunnerError {
  const diagnosticOptions: { exitCode?: number; signal?: string } = {};
  const exitCode = getNumericExitCode(error);
  const signal = getSignal(error);
  if (exitCode !== undefined) {
    diagnosticOptions.exitCode = exitCode;
  }
  if (signal !== undefined) {
    diagnosticOptions.signal = signal;
  }
  const diagnostics = createDiagnostics(stdout, stderr, diagnosticOptions);

  if (isAbortError(error)) {
    return new CodexRunnerError({
      code: "codex_cancelled",
      message: "Codex execution was cancelled.",
      retryable: true,
      diagnostics,
      cause: error,
    });
  }

  if (isMissingBinaryError(error)) {
    return new CodexRunnerError({
      code: "codex_not_found",
      message: "Codex executable was not found. Install the Codex CLI or configure the Codex binary path.",
      retryable: false,
      diagnostics,
      cause: error,
    });
  }

  if (isMaxBufferError(error)) {
    diagnostics.truncated = true;
    return new CodexRunnerError({
      code: "codex_output_too_large",
      message: "Codex output exceeded the configured stdout/stderr buffer limit.",
      retryable: false,
      diagnostics,
      cause: error,
    });
  }

  if (isTimeoutError(error)) {
    return new CodexRunnerError({
      code: "codex_timeout",
      message: "Codex execution timed out before completing.",
      retryable: true,
      diagnostics,
      cause: error,
    });
  }

  if (typeof error.code === "number" || diagnostics.signal !== undefined) {
    const exitDescription = typeof error.code === "number" ? `status ${error.code}` : `signal ${diagnostics.signal}`;
    return new CodexRunnerError({
      code: "codex_nonzero_exit",
      message: `Codex exited with ${exitDescription}.`,
      retryable: false,
      diagnostics,
      cause: error,
    });
  }

  return new CodexRunnerError({
    code: "unknown_error",
    message: "Codex execution failed before a result was available.",
    retryable: false,
    diagnostics,
    cause: error,
  });
}

function createDiagnostics(
  stdout: string,
  stderr: string,
  options: { exitCode?: number; signal?: string },
): CodexWebSearchDiagnostics {
  const diagnostics: CodexWebSearchDiagnostics = {
    stdoutBytes: Buffer.byteLength(stdout, "utf8"),
    stderrBytes: Buffer.byteLength(stderr, "utf8"),
  };

  if (stderr.length > 0) {
    diagnostics.stderr = stderr;
  }

  if (options.exitCode !== undefined) {
    diagnostics.exitCode = options.exitCode;
  }

  if (options.signal !== undefined) {
    diagnostics.signal = options.signal;
  }

  return diagnostics;
}

function normalizeProcessOutput(value: string | Buffer | undefined): string {
  if (Buffer.isBuffer(value)) {
    return value.toString("utf8");
  }

  return value ?? "";
}

function getNumericExitCode(error: CodexRunnerProcessError): number | undefined {
  return typeof error.code === "number" ? error.code : undefined;
}

function getSignal(error: CodexRunnerProcessError): string | undefined {
  if (typeof error.signal === "string" && error.signal.length > 0) {
    return error.signal;
  }

  return undefined;
}

function getStringCode(error: CodexRunnerProcessError): string | undefined {
  return typeof error.code === "string" ? error.code : undefined;
}

function isAbortError(error: CodexRunnerProcessError): boolean {
  return error.name === "AbortError" || getStringCode(error) === "ABORT_ERR";
}

function isMissingBinaryError(error: CodexRunnerProcessError): boolean {
  return getStringCode(error) === "ENOENT";
}

function isMaxBufferError(error: CodexRunnerProcessError): boolean {
  return getStringCode(error) === "ERR_CHILD_PROCESS_STDIO_MAXBUFFER";
}

function isTimeoutError(error: CodexRunnerProcessError): boolean {
  return getStringCode(error) === "ETIMEDOUT" || (
    error.killed === true && error.signal === CODEX_RUNNER_KILL_SIGNAL && error.code === null
  );
}

function toProcessError(error: unknown): CodexRunnerProcessError {
  if (error instanceof Error) {
    return error;
  }

  return new Error("Unknown Codex process error.");
}
