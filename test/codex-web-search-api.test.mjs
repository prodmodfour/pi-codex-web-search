import assert from "node:assert/strict";
import test from "node:test";

import { loadTsModule } from "./helpers/load-ts-module.mjs";

const api = await loadTsModule(new URL("../src/tool/codexWebSearchApi.ts", import.meta.url));

test("normalizes required codex_web_search input with safe defaults", () => {
  const normalized = api.normalizeCodexWebSearchInput({ query: "  current Pi release notes  " });

  assert.deepEqual(normalized, {
    toolName: "codex_web_search",
    query: "current Pi release notes",
    mode: "live",
    liveSearch: true,
    timeoutMs: 120_000,
    maxOutputChars: 12_000,
    includeRawEvents: false,
    codex: {
      sandbox: "read-only",
      outputFormat: "jsonl",
      maxBufferBytes: 2 * 1024 * 1024,
      skipGitRepoCheck: true,
    },
  });
});

test("normalizes optional codex_web_search parameters", () => {
  const normalized = api.normalizeCodexWebSearchInput({
    query: "Summarize current TypeScript release news",
    mode: "cached",
    timeoutMs: 5_000,
    maxOutputChars: 500,
    includeRawEvents: true,
  });

  assert.equal(normalized.mode, "cached");
  assert.equal(normalized.liveSearch, false);
  assert.equal(normalized.timeoutMs, 5_000);
  assert.equal(normalized.maxOutputChars, 500);
  assert.equal(normalized.includeRawEvents, true);
  assert.equal(normalized.codex.sandbox, "read-only");
  assert.equal(normalized.codex.outputFormat, "jsonl");
});

test("validateCodexWebSearchInput returns structured validation issues", () => {
  const result = api.validateCodexWebSearchInput({
    query: "   ",
    mode: "offline",
    timeoutMs: 999,
    maxOutputChars: 100,
    includeRawEvents: "yes",
    unexpected: true,
  });

  assert.equal(result.ok, false);
  assert.deepEqual(
    result.issues.map((issue) => issue.code),
    [
      "unknown_property",
      "query_empty",
      "mode_invalid",
      "timeout_ms_invalid",
      "max_output_chars_invalid",
      "include_raw_events_invalid",
    ],
  );
  assert.deepEqual(
    result.issues.map((issue) => issue.path),
    ["unexpected", "query", "mode", "timeoutMs", "maxOutputChars", "includeRawEvents"],
  );
});

test("validateCodexWebSearchInput rejects non-object input", () => {
  for (const value of [null, undefined, "query", ["query"]]) {
    const result = api.validateCodexWebSearchInput(value);
    assert.equal(result.ok, false);
    assert.equal(result.issues[0].code, "expected_object");
  }
});

test("validateCodexWebSearchInput enforces query type and length", () => {
  assert.equal(api.validateCodexWebSearchInput({}).issues[0].code, "query_required");
  assert.equal(api.validateCodexWebSearchInput({ query: 123 }).issues[0].code, "query_type");

  const oversizedQuery = "x".repeat(api.CODEX_WEB_SEARCH_LIMITS.queryMaxChars + 1);
  const result = api.validateCodexWebSearchInput({ query: oversizedQuery });
  assert.equal(result.ok, false);
  assert.equal(result.issues[0].code, "query_too_long");
});

test("normalizeCodexWebSearchInput throws a validation error without echoing query values", () => {
  assert.throws(
    () => api.normalizeCodexWebSearchInput({ query: "", timeoutMs: Number.NaN }),
    (error) => {
      assert.equal(error.name, "CodexWebSearchValidationError");
      assert.deepEqual(
        error.issues.map((issue) => issue.code),
        ["query_empty", "timeout_ms_invalid"],
      );
      assert.match(error.message, /Invalid codex_web_search input/);
      assert.doesNotMatch(error.message, /Number\.NaN/);
      return true;
    },
  );
});
