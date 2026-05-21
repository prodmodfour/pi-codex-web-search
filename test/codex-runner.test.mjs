import assert from "node:assert/strict";
import test from "node:test";

import { loadTsProjectModule } from "./helpers/load-ts-project-module.mjs";

const pkg = await loadTsProjectModule(new URL("../src/index.ts", import.meta.url));

function normalized(overrides = {}) {
  const base = pkg.normalizeCodexWebSearchInput({
    query: "current Codex CLI release notes",
    timeoutMs: 5_000,
  });

  return {
    ...base,
    ...overrides,
    codex: {
      ...base.codex,
      ...(overrides.codex ?? {}),
    },
  };
}

function createMockExecutor(handler) {
  const calls = [];

  const execFile = (file, args, options, callback) => {
    const call = { file, args: [...args], options };
    calls.push(call);
    queueMicrotask(() => handler({ ...call, callback }));
    return { pid: 1234 };
  };

  return { execFile, calls };
}

function processError(message, properties = {}) {
  return Object.assign(new Error(message), properties);
}

test("CodexRunner executes safe argv with default binary and bounded execFile options", async () => {
  const { execFile, calls } = createMockExecutor(({ callback }) => {
    callback(null, "final answer\n", "diagnostic\n");
  });
  const runner = new pkg.CodexRunner({ execFile });

  const result = await runner.run(normalized());

  assert.equal(calls.length, 1);
  assert.equal(calls[0].file, "codex");
  assert.deepEqual(calls[0].args, [
    "exec",
    "--json",
    "--search",
    "--skip-git-repo-check",
    "--sandbox",
    "read-only",
    "--",
    "current Codex CLI release notes",
  ]);
  assert.equal(calls[0].options.encoding, "utf8");
  assert.equal(calls[0].options.timeoutMs, 5_000);
  assert.equal(calls[0].options.maxBufferBytes, 2 * 1024 * 1024);
  assert.equal(calls[0].options.killSignal, "SIGTERM");
  assert.equal(calls[0].options.shell, false);
  assert.equal(result.stdout, "final answer\n");
  assert.equal(result.stderr, "diagnostic\n");
  assert.deepEqual(result.diagnostics, {
    stdoutBytes: Buffer.byteLength("final answer\n"),
    stderrBytes: Buffer.byteLength("diagnostic\n"),
    stderr: "diagnostic\n",
    exitCode: 0,
  });
});

test("CodexRunner supports a configured Codex binary path and AbortSignal", async () => {
  const controller = new AbortController();
  const { execFile, calls } = createMockExecutor(({ callback }) => callback(null, "{}\n", ""));
  const runner = new pkg.CodexRunner({ codexBinary: "/opt/codex/bin/codex", execFile });

  await runner.run(normalized(), { signal: controller.signal });

  assert.equal(calls[0].file, "/opt/codex/bin/codex");
  assert.equal(calls[0].options.signal, controller.signal);
});

test("CodexRunner returns a structured codex_not_found error", async () => {
  const { execFile } = createMockExecutor(({ callback }) => {
    callback(processError("spawn private path ENOENT", { code: "ENOENT" }), "", "");
  });
  const runner = new pkg.CodexRunner({ execFile });

  await assert.rejects(
    () => runner.run(normalized()),
    (error) => {
      assert.equal(error.name, "CodexRunnerError");
      assert.equal(error.code, "codex_not_found");
      assert.equal(error.retryable, false);
      assert.match(error.message, /Codex executable was not found/);
      assert.doesNotMatch(error.message, /private path/);
      assert.deepEqual(error.diagnostics, { stdoutBytes: 0, stderrBytes: 0 });
      return true;
    },
  );
});

test("CodexRunner returns a structured timeout error", async () => {
  const { execFile } = createMockExecutor(({ callback }) => {
    callback(processError("Command failed with private query", { code: null, killed: true, signal: "SIGTERM" }), "", "");
  });
  const runner = new pkg.CodexRunner({ execFile });

  await assert.rejects(
    () => runner.run(normalized({ query: "private query" })),
    (error) => {
      assert.equal(error.code, "codex_timeout");
      assert.equal(error.retryable, true);
      assert.equal(error.diagnostics.signal, "SIGTERM");
      assert.doesNotMatch(error.message, /private query/);
      return true;
    },
  );
});

test("CodexRunner maps maxBuffer failures to codex_output_too_large", async () => {
  const { execFile } = createMockExecutor(({ callback }) => {
    callback(
      processError("stdout maxBuffer length exceeded", { code: "ERR_CHILD_PROCESS_STDIO_MAXBUFFER" }),
      Buffer.from("partial"),
      "",
    );
  });
  const runner = new pkg.CodexRunner({ execFile });

  await assert.rejects(
    () => runner.run(normalized()),
    (error) => {
      assert.equal(error.code, "codex_output_too_large");
      assert.equal(error.retryable, false);
      assert.equal(error.diagnostics.truncated, true);
      assert.equal(error.diagnostics.stdoutBytes, Buffer.byteLength("partial"));
      assert.match(error.message, /buffer limit/);
      return true;
    },
  );
});

test("CodexRunner maps non-zero exits without copying stderr into the message", async () => {
  const { execFile } = createMockExecutor(({ callback }) => {
    callback(processError("Command failed and echoed stderr", { code: 7, killed: false, signal: null }), "", "login required\n");
  });
  const runner = new pkg.CodexRunner({ execFile });

  await assert.rejects(
    () => runner.run(normalized()),
    (error) => {
      assert.equal(error.code, "codex_nonzero_exit");
      assert.equal(error.retryable, false);
      assert.equal(error.message, "Codex exited with status 7.");
      assert.doesNotMatch(error.message, /login required/);
      assert.deepEqual(error.diagnostics, {
        stdoutBytes: 0,
        stderrBytes: Buffer.byteLength("login required\n"),
        stderr: "login required\n",
        exitCode: 7,
      });
      return true;
    },
  );
});

test("CodexRunner runAndParse wraps parser failures as codex_parse_error", async () => {
  const { execFile } = createMockExecutor(({ callback }) => callback(null, "not jsonl\n", ""));
  const runner = new pkg.CodexRunner({ execFile });

  await assert.rejects(
    () => runner.runAndParse(normalized(), () => {
      throw new Error("malformed private JSONL detail");
    }),
    (error) => {
      assert.equal(error.code, "codex_parse_error");
      assert.equal(error.retryable, false);
      assert.equal(error.message, "Codex JSONL output could not be parsed.");
      assert.doesNotMatch(error.message, /private JSONL/);
      assert.equal(error.diagnostics.stdoutBytes, Buffer.byteLength("not jsonl\n"));
      return true;
    },
  );
});

test("CodexRunner runAndParse returns parsed output on success", async () => {
  const { execFile } = createMockExecutor(({ callback }) => callback(null, '{"type":"done"}\n', ""));
  const runner = new pkg.CodexRunner({ execFile });

  const result = await runner.runAndParse(normalized(), (raw) => ({ lineCount: raw.stdout.trim().split("\n").length }));

  assert.deepEqual(result.parsed, { lineCount: 1 });
  assert.equal(result.stdout, '{"type":"done"}\n');
});

test("CodexRunner rejects invalid configured binary paths before spawning", () => {
  assert.throws(() => new pkg.CodexRunner({ codexBinary: "   " }), /codexBinary must be a non-empty string/);
  assert.throws(() => new pkg.CodexRunner({ codexBinary: "codex\0bad" }), /codexBinary must not contain null bytes/);
});
