#!/usr/bin/env node
import { spawn } from "node:child_process";

const DEFAULT_CODEX_BINARY = "codex";
const DEFAULT_SMOKE_TIMEOUT_MS = 120_000;
const VERSION_TIMEOUT_MS = 10_000;
const MIN_TIMEOUT_MS = 1_000;
const MAX_TIMEOUT_MS = 300_000;
const MAX_CAPTURE_BYTES = 1024 * 1024;
const SUCCESS_PREVIEW_CHARS = 4_000;
const HARMLESS_QUERY =
  "Search the web for the current UTC date. Return one sentence and one public source URL.";

function info(message) {
  console.log(message);
}

function warn(message) {
  console.error(message);
}

function fail(message, hints = []) {
  warn(`Codex smoke test failed: ${message}`);
  for (const hint of hints) {
    warn(`- ${hint}`);
  }
  process.exit(1);
}

function getCodexBinary() {
  const rawValue = process.env.PI_CODEX_WEB_SEARCH_CODEX_BINARY ?? DEFAULT_CODEX_BINARY;
  const value = rawValue.trim();

  if (value.length === 0) {
    fail("PI_CODEX_WEB_SEARCH_CODEX_BINARY is empty after trimming.", [
      "Unset PI_CODEX_WEB_SEARCH_CODEX_BINARY or point it at a trusted Codex executable.",
    ]);
  }

  if (value.includes("\0")) {
    fail("PI_CODEX_WEB_SEARCH_CODEX_BINARY contains a null byte.", [
      "Unset PI_CODEX_WEB_SEARCH_CODEX_BINARY or point it at a trusted Codex executable.",
    ]);
  }

  return value;
}

function getSmokeTimeoutMs() {
  const rawValue = process.env.PI_CODEX_WEB_SEARCH_TIMEOUT_MS;
  if (rawValue === undefined || rawValue === "") {
    return DEFAULT_SMOKE_TIMEOUT_MS;
  }

  if (!/^[0-9]+$/.test(rawValue)) {
    fail("PI_CODEX_WEB_SEARCH_TIMEOUT_MS must be an integer number of milliseconds.", [
      `Accepted range: ${MIN_TIMEOUT_MS}..${MAX_TIMEOUT_MS}.`,
    ]);
  }

  const value = Number(rawValue);
  if (!Number.isSafeInteger(value) || value < MIN_TIMEOUT_MS || value > MAX_TIMEOUT_MS) {
    fail("PI_CODEX_WEB_SEARCH_TIMEOUT_MS is outside the supported smoke-test range.", [
      `Accepted range: ${MIN_TIMEOUT_MS}..${MAX_TIMEOUT_MS}.`,
    ]);
  }

  return value;
}

function truncateForDisplay(text, maxChars) {
  if (text.length <= maxChars) {
    return text;
  }

  return `${text.slice(0, maxChars)}\n[Smoke output truncated to ${maxChars} characters.]`;
}

function firstNonEmptyLine(text) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.length > 0);
}

function runCodex(codexBinary, args, { timeoutMs }) {
  return new Promise((resolve) => {
    let settled = false;
    let timedOut = false;
    let outputTooLarge = false;
    let stdout = "";
    let stdoutBytes = 0;
    let stderrBytes = 0;

    const child = spawn(codexBinary, args, {
      shell: false,
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let timeout;

    const settle = (result) => {
      if (settled) {
        return;
      }

      settled = true;
      if (timeout !== undefined) {
        clearTimeout(timeout);
      }
      resolve({
        ...result,
        timedOut,
        outputTooLarge,
        stdout,
        stdoutBytes,
        stderrBytes,
      });
    };

    const stopProcess = () => {
      if (child.killed) {
        return;
      }

      child.kill("SIGTERM");
      setTimeout(() => {
        if (!settled && child.exitCode === null) {
          child.kill("SIGKILL");
        }
      }, 2_000).unref();
    };

    timeout = setTimeout(() => {
      timedOut = true;
      stopProcess();
    }, timeoutMs);
    timeout.unref();

    child.stdout.on("data", (chunk) => {
      stdoutBytes += chunk.length;
      if (stdoutBytes > MAX_CAPTURE_BYTES) {
        outputTooLarge = true;
        stopProcess();
        return;
      }

      stdout += chunk.toString("utf8");
    });

    child.stderr.on("data", (chunk) => {
      stderrBytes += chunk.length;
      if (stderrBytes > MAX_CAPTURE_BYTES) {
        outputTooLarge = true;
        stopProcess();
      }
    });

    child.on("error", (error) => {
      settle({ error });
    });

    child.on("close", (status, signal) => {
      settle({ status, signal });
    });
  });
}

function explainRunFailure(result, commandLabel) {
  if (result.error?.code === "ENOENT") {
    fail("Codex CLI executable was not found.", [
      "Install Codex with: npm install -g @openai/codex",
      "Ensure `codex` is on PATH, or set PI_CODEX_WEB_SEARCH_CODEX_BINARY to a trusted executable path.",
    ]);
  }

  if (result.error) {
    fail(`${commandLabel} could not be started.`, [
      `Spawn error code: ${result.error.code ?? "unknown"}.`,
      "The smoke script uses shell:false and does not run shell aliases; use a trusted real executable path if needed.",
    ]);
  }

  if (result.timedOut) {
    fail(`${commandLabel} timed out.`, [
      "Check network connectivity and Codex account availability.",
      "For slow networks, set PI_CODEX_WEB_SEARCH_TIMEOUT_MS to a value up to 300000 and rerun the script.",
    ]);
  }

  if (result.outputTooLarge) {
    fail(`${commandLabel} produced more output than the smoke script captures.`, [
      "The script stopped Codex and intentionally did not write a log file.",
    ]);
  }

  if (result.status !== 0) {
    fail(`${commandLabel} exited with status ${result.status ?? "unknown"}.`, [
      "Run `codex login` if the Codex CLI is not authenticated.",
      "Confirm that your Codex account and network allow web search.",
      "Raw stderr/stdout from failed Codex runs is intentionally omitted to avoid leaking account, prompt, or path details.",
    ]);
  }
}

async function main() {
  const codexBinary = getCodexBinary();
  const smokeTimeoutMs = getSmokeTimeoutMs();
  const smokeArgs = [
    "exec",
    "--search",
    "--skip-git-repo-check",
    "--sandbox",
    "read-only",
    "--",
    HARMLESS_QUERY,
  ];

  info("Codex real web-search smoke test");
  info("This opt-in script runs the local Codex CLI and may consume Codex/ChatGPT plan limits.");
  info("It writes no log files and omits raw stderr from failures.");
  info("");

  const versionResult = await runCodex(codexBinary, ["--version"], { timeoutMs: VERSION_TIMEOUT_MS });
  explainRunFailure(versionResult, "codex --version");
  info(`Codex version: ${firstNonEmptyLine(versionResult.stdout) ?? "detected"}`);

  info("Running: codex exec --search --skip-git-repo-check --sandbox read-only -- <harmless query>");
  const smokeResult = await runCodex(codexBinary, smokeArgs, { timeoutMs: smokeTimeoutMs });
  explainRunFailure(smokeResult, "codex exec --search smoke test");

  const output = smokeResult.stdout.trim();
  if (output.length === 0) {
    fail("codex exec --search completed but returned no stdout.", [
      "Retry once, then run the manual validation guide if the empty result persists.",
    ]);
  }

  info("");
  info("Codex real web-search smoke test passed.");
  info("Bounded stdout preview:");
  info(truncateForDisplay(output, SUCCESS_PREVIEW_CHARS));
}

main().catch((error) => {
  fail("unexpected smoke-script error.", [error instanceof Error ? error.message : String(error)]);
});
