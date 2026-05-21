import assert from "node:assert/strict";
import { chmod } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { createMockPiApi } from "./fixtures/mock-pi-api.mjs";
import { loadTsProjectModule } from "./helpers/load-ts-project-module.mjs";

const pkg = await loadTsProjectModule(new URL("../src/index.ts", import.meta.url));
const fakeCodexPath = fileURLToPath(new URL("./fixtures/fake-codex.mjs", import.meta.url));

await chmod(fakeCodexPath, 0o755);

function createToolBackedByFakeCodex() {
  const { api, registeredTools } = createMockPiApi();

  pkg.registerCodexWebSearchTool(api, {
    config: {
      codexBinary: fakeCodexPath,
    },
    env: {},
  });

  assert.equal(registeredTools.length, 1);
  return registeredTools[0];
}

test("registered tool runs the fake Codex executable through CodexRunner", async () => {
  const tool = createToolBackedByFakeCodex();

  const result = await tool.execute(
    "call-fake-codex-success",
    {
      query: "fake-codex:success current public fixture facts",
      mode: "live",
      timeoutMs: 5_000,
      maxOutputChars: 2_000,
      includeRawEvents: true,
    },
    undefined,
    undefined,
    { cwd: process.cwd() },
  );

  assert.match(result.content[0].text, /Fake Codex fixture answer produced through the live subprocess path/);
  assert.match(result.content[0].text, /Sources:/);
  assert.match(result.content[0].text, /https:\/\/example\.com\/fake-codex\/search-result/);
  assert.match(result.content[0].text, /https:\/\/example\.com\/fake-codex\/final-answer/);
  assert.equal(result.details.ok, true);
  assert.equal(result.details.mode, "live");
  assert.equal(result.details.liveSearch, true);
  assert.equal(result.details.sourceCount, 2);
  assert.equal(result.details.rawEventCount, 2);
  assert.equal(result.details.diagnostics.exitCode, 0);
  assert.equal(result.details.diagnostics.stderrBytes, 0);
  assert.equal(result.details.diagnostics.stdoutBytes > 0, true);
});

test(
  "fake Codex timeout fixture maps to a sanitized timeout failure",
  { timeout: 10_000 },
  async () => {
    const tool = createToolBackedByFakeCodex();

    await assert.rejects(
      () => tool.execute(
        "call-fake-codex-timeout",
        {
          query: "fake-codex:timeout",
          timeoutMs: 1_000,
          maxOutputChars: 1_000,
        },
        undefined,
        undefined,
        { cwd: process.cwd() },
      ),
      (error) => {
        assert.equal(error.name, "CodexWebSearchToolExecutionError");
        assert.equal(error.code, "codex_timeout");
        assert.equal(error.retryable, true);
        assert.match(error.message, /Codex web search failed \(codex_timeout\)\./);
        assert.doesNotMatch(error.message, /fake-codex:timeout/);
        assert.equal(error.toolResult.details.error.code, "codex_timeout");
        assert.equal(error.toolResult.details.diagnostics.signal, "SIGTERM");
        return true;
      },
    );
  },
);

test("fake Codex non-zero fixture maps to a sanitized non-zero failure", async () => {
  const tool = createToolBackedByFakeCodex();

  await assert.rejects(
    () => tool.execute(
      "call-fake-codex-nonzero",
      {
        query: "fake-codex:nonzero",
        timeoutMs: 5_000,
        maxOutputChars: 1_000,
      },
      undefined,
      undefined,
      { cwd: process.cwd() },
    ),
    (error) => {
      assert.equal(error.name, "CodexWebSearchToolExecutionError");
      assert.equal(error.code, "codex_nonzero_exit");
      assert.equal(error.retryable, false);
      assert.match(error.message, /Codex web search failed \(codex_nonzero_exit\)\./);
      assert.doesNotMatch(error.message, /fake Codex fixture nonzero diagnostic/);
      assert.doesNotMatch(error.message, /fake-codex:nonzero/);
      assert.equal(error.toolResult.details.error.code, "codex_nonzero_exit");
      assert.equal(error.toolResult.details.diagnostics.exitCode, 42);
      assert.equal(error.toolResult.details.diagnostics.stderrOmitted, true);
      return true;
    },
  );
});

test("fake Codex malformed-JSONL fixture maps to a parse failure", async () => {
  const tool = createToolBackedByFakeCodex();

  await assert.rejects(
    () => tool.execute(
      "call-fake-codex-malformed",
      {
        query: "fake-codex:malformed",
        timeoutMs: 5_000,
        maxOutputChars: 1_000,
      },
      undefined,
      undefined,
      { cwd: process.cwd() },
    ),
    (error) => {
      assert.equal(error.name, "CodexWebSearchToolExecutionError");
      assert.equal(error.code, "codex_parse_error");
      assert.equal(error.retryable, false);
      assert.match(error.message, /Codex web search failed \(codex_parse_error\)\./);
      assert.doesNotMatch(error.message, /fake-codex:malformed/);
      assert.equal(error.toolResult.details.error.code, "codex_parse_error");
      assert.equal(error.toolResult.details.diagnostics.exitCode, 0);
      return true;
    },
  );
});

test("fake Codex missing-final-message fixture maps to a missing-final failure", async () => {
  const tool = createToolBackedByFakeCodex();

  await assert.rejects(
    () => tool.execute(
      "call-fake-codex-missing-final",
      {
        query: "fake-codex:missing-final",
        timeoutMs: 5_000,
        maxOutputChars: 1_000,
      },
      undefined,
      undefined,
      { cwd: process.cwd() },
    ),
    (error) => {
      assert.equal(error.name, "CodexWebSearchToolExecutionError");
      assert.equal(error.code, "codex_missing_final_message");
      assert.equal(error.retryable, false);
      assert.match(error.message, /Codex web search failed \(codex_missing_final_message\)\./);
      assert.doesNotMatch(error.message, /fake-codex:missing-final/);
      assert.equal(error.toolResult.details.error.code, "codex_missing_final_message");
      assert.equal(error.toolResult.details.diagnostics.exitCode, 0);
      assert.equal(error.toolResult.details.diagnostics.stdoutBytes > 0, true);
      return true;
    },
  );
});
