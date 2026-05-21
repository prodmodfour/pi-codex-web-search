import assert from "node:assert/strict";
import test from "node:test";

import { loadTsProjectModule } from "./helpers/load-ts-project-module.mjs";

const pkg = await loadTsProjectModule(new URL("../src/index.ts", import.meta.url));

function success(overrides = {}) {
  return {
    ok: true,
    query: "private user query that should not be repeated",
    mode: "live",
    liveSearch: true,
    answer: "Codex found the current answer.",
    sources: [],
    ...overrides,
  };
}

function failure(overrides = {}) {
  return {
    ok: false,
    query: "private user query that should not be repeated",
    mode: "live",
    error: {
      code: "codex_nonzero_exit",
      message: "raw failure from /home/example/private with token-like text",
      retryable: false,
    },
    diagnostics: {
      stdoutBytes: 0,
      stderrBytes: Buffer.byteLength("raw stderr from /home/example/private\n", "utf8"),
      stderr: "raw stderr from /home/example/private\n",
      exitCode: 1,
    },
    ...overrides,
  };
}

test("formatCodexWebSearchToolResult formats concise answers with sources", () => {
  const formatted = pkg.formatCodexWebSearchToolResult(
    success({
      answer: "Codex found that Pi extensions can register tools.",
      sources: [
        {
          title: "Pi extension docs",
          url: "https://example.com/pi/extensions",
          snippet: "registerTool adds a tool that can return text content.",
        },
        {
          url: "https://example.com/codex/jsonl",
        },
      ],
      diagnostics: {
        stdoutBytes: 120,
        stderrBytes: 0,
      },
    }),
    { maxOutputChars: 1_000 },
  );

  assert.equal(formatted.content.length, 1);
  assert.equal(formatted.content[0].type, "text");
  assert.equal(
    formatted.content[0].text,
    [
      "Codex found that Pi extensions can register tools.",
      "",
      "Sources:",
      "1. Pi extension docs — https://example.com/pi/extensions",
      "   registerTool adds a tool that can return text content.",
      "2. https://example.com/codex/jsonl",
    ].join("\n"),
  );
  assert.doesNotMatch(formatted.content[0].text, /private user query/);
  assert.deepEqual(formatted.details, {
    toolName: "codex_web_search",
    ok: true,
    contentTruncated: false,
    maxOutputChars: 1_000,
    mode: "live",
    liveSearch: true,
    sourceCount: 2,
    sources: [
      {
        title: "Pi extension docs",
        url: "https://example.com/pi/extensions",
        snippet: "registerTool adds a tool that can return text content.",
      },
      {
        url: "https://example.com/codex/jsonl",
      },
    ],
    diagnostics: {
      stdoutBytes: 120,
      stderrBytes: 0,
    },
  });
});

test("formatCodexWebSearchToolResult handles empty successful answers", () => {
  const formatted = pkg.formatCodexWebSearchToolResult(success({ answer: "  \n\t  " }));

  assert.equal(formatted.content[0].text, "Codex completed but returned an empty answer.");
  assert.equal(formatted.details.ok, true);
  assert.equal(formatted.details.sourceCount, 0);
  assert.equal(formatted.details.contentTruncated, false);
});

test("formatCodexWebSearchToolResult bounds huge output and adds a truncation notice", () => {
  const formatted = pkg.formatCodexWebSearchToolResult(
    success({ answer: `Summary: ${"A".repeat(2_000)}` }),
    { maxOutputChars: 500 },
  );

  assert.equal(formatted.content[0].text.length <= 500, true);
  assert.match(formatted.content[0].text, /^Summary: A+/);
  assert.match(formatted.content[0].text, /\[Output truncated to 500 characters\.\]$/);
  assert.equal(formatted.details.contentTruncated, true);
  assert.equal(formatted.details.maxOutputChars, 500);
});

test("formatCodexWebSearchToolResult formats actionable errors without raw stderr or private paths", () => {
  const formatted = pkg.formatCodexWebSearchToolResult(failure(), { maxOutputChars: 1_000 });
  const text = formatted.content[0].text;

  assert.match(text, /Codex web search failed \(codex_nonzero_exit\)\./);
  assert.match(text, /Codex exited with a non-zero status\./);
  assert.match(text, /run `codex login`/);
  assert.match(text, /Retryable: no\./);
  assert.match(text, /stderr \d+ bytes/);
  assert.match(text, /raw stderr omitted from tool output/);
  assert.doesNotMatch(text, /private user query/);
  assert.doesNotMatch(text, /\/home\/example\/private/);
  assert.doesNotMatch(text, /token-like/);
  assert.deepEqual(formatted.details, {
    toolName: "codex_web_search",
    ok: false,
    contentTruncated: false,
    maxOutputChars: 1_000,
    diagnostics: {
      stdoutBytes: 0,
      stderrBytes: Buffer.byteLength("raw stderr from /home/example/private\n", "utf8"),
      exitCode: 1,
      stderrOmitted: true,
    },
    mode: "live",
    error: {
      code: "codex_nonzero_exit",
      message: "Codex exited with a non-zero status.",
      retryable: false,
      action: "If Codex needs authentication, run `codex login` in a terminal; otherwise retry after checking the local Codex CLI.",
    },
  });
});
