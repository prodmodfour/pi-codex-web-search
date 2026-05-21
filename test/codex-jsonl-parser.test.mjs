import assert from "node:assert/strict";
import test from "node:test";

import { loadTsProjectModule } from "./helpers/load-ts-project-module.mjs";

const pkg = await loadTsProjectModule(new URL("../src/index.ts", import.meta.url));

function jsonl(events) {
  return `${events.map((event) => JSON.stringify(event)).join("\n")}\n`;
}

function normalized(overrides = {}) {
  const base = pkg.normalizeCodexWebSearchInput({
    query: "latest Codex CLI JSON output docs",
    includeRawEvents: true,
    mode: "live",
  });

  return {
    ...base,
    ...overrides,
  };
}

test("parseCodexJsonlOutput extracts final agent message, web-search summaries, sources, raw events, and diagnostics", () => {
  const stdout = jsonl([
    { type: "thread.started", thread_id: "thread_1" },
    { type: "event.unknown", payload: { ignored: true } },
    {
      type: "item.completed",
      item: {
        id: "ws_1",
        type: "web_search",
        query: "Codex CLI JSON output docs",
        action: { type: "search", query: "Codex CLI JSON output docs" },
        status: "completed",
      },
    },
    {
      type: "item.completed",
      item: {
        id: "msg_1",
        type: "agent_message",
        text: "Codex emits JSONL events when --json is set.",
        content: [
          {
            type: "output_text",
            text: "Codex emits JSONL events when --json is set.",
            annotations: [
              {
                type: "url_citation",
                url: "https://developers.openai.com/codex/noninteractive",
                title: "Non-interactive mode",
              },
            ],
          },
        ],
      },
    },
    { type: "turn.completed", usage: { input_tokens: 10, output_tokens: 5 } },
  ]);

  const parsed = pkg.parseCodexJsonlOutput(
    {
      stdout,
      stderr: "warning: stderr stays separate\n",
    },
    { includeRawEvents: true },
  );

  assert.equal(parsed.answer, "Codex emits JSONL events when --json is set.");
  assert.deepEqual(parsed.finalAgentMessage, {
    id: "msg_1",
    text: "Codex emits JSONL events when --json is set.",
    lineNumber: 4,
    eventType: "item.completed",
  });
  assert.deepEqual(parsed.webSearches, [
    {
      id: "ws_1",
      query: "Codex CLI JSON output docs",
      action: "search",
      status: "completed",
      lineNumber: 3,
      eventType: "item.completed",
    },
  ]);
  assert.deepEqual(parsed.sources, [
    {
      url: "https://developers.openai.com/codex/noninteractive",
      title: "Non-interactive mode",
    },
  ]);
  assert.equal(parsed.rawEvents.length, 5);
  assert.deepEqual(parsed.rawEvents.map((event) => event.type), [
    "thread.started",
    "event.unknown",
    "item.completed",
    "item.completed",
    "turn.completed",
  ]);
  assert.deepEqual(parsed.diagnostics, {
    stdoutBytes: Buffer.byteLength(stdout, "utf8"),
    stderrBytes: Buffer.byteLength("warning: stderr stays separate\n", "utf8"),
    stderr: "warning: stderr stays separate\n",
  });
});

test("parseCodexJsonlOutput uses the last completed assistant message as the final answer", () => {
  const stdout = jsonl([
    {
      type: "item.completed",
      item: {
        id: "msg_progress",
        item_type: "assistant_message",
        text: "I will search first.",
      },
    },
    {
      type: "item.completed",
      item: {
        id: "msg_final",
        item_type: "assistant_message",
        text: "Final answer after the search.",
      },
    },
  ]);

  const parsed = pkg.parseCodexJsonlOutput({ stdout });

  assert.equal(parsed.answer, "Final answer after the search.");
  assert.equal(parsed.agentMessages.length, 2);
  assert.equal(parsed.rawEvents, undefined);
});

test("parseCodexJsonlOutput supports JSON-RPC item/completed agentMessage and webSearch shapes", () => {
  const stdout = jsonl([
    {
      method: "item/completed",
      params: {
        item: {
          id: "web_1",
          type: "webSearch",
          query: "OpenAI Codex CLI reference",
          action: {
            type: "open_page",
            url: "https://developers.openai.com/codex/cli/reference",
            title: "Command line options",
          },
          status: "completed",
        },
      },
    },
    {
      method: "item/completed",
      params: {
        item: {
          id: "msg_1",
          type: "agentMessage",
          content: ["Legacy ", { text: "JSON-RPC answer." }],
        },
      },
    },
  ]);

  const parsed = pkg.parseCodexJsonlOutput({ stdout });

  assert.equal(parsed.answer, "Legacy JSON-RPC answer.");
  assert.deepEqual(parsed.webSearches, [
    {
      id: "web_1",
      query: "OpenAI Codex CLI reference",
      action: "open_page",
      status: "completed",
      url: "https://developers.openai.com/codex/cli/reference",
      title: "Command line options",
      lineNumber: 1,
      eventType: "item/completed",
    },
  ]);
  assert.deepEqual(parsed.sources, [
    {
      url: "https://developers.openai.com/codex/cli/reference",
      title: "Command line options",
    },
  ]);
});

test("parseCodexJsonlToolResult returns the normalized success shape for downstream formatter work", () => {
  const input = normalized();
  const raw = {
    stdout: jsonl([
      {
        type: "item.completed",
        item: {
          id: "msg_1",
          type: "agent_message",
          text: "Final normalized answer.",
        },
      },
    ]),
    stderr: "diagnostic only\n",
  };

  const result = pkg.parseCodexJsonlToolResult(raw, input);

  assert.deepEqual(result, {
    ok: true,
    query: "latest Codex CLI JSON output docs",
    mode: "live",
    liveSearch: true,
    answer: "Final normalized answer.",
    sources: [],
    rawEvents: [
      {
        type: "item.completed",
        data: {
          type: "item.completed",
          item: {
            id: "msg_1",
            type: "agent_message",
            text: "Final normalized answer.",
          },
        },
      },
    ],
    diagnostics: {
      stdoutBytes: Buffer.byteLength(raw.stdout, "utf8"),
      stderrBytes: Buffer.byteLength("diagnostic only\n", "utf8"),
      stderr: "diagnostic only\n",
    },
  });
});

test("parseCodexJsonlOutput reports malformed JSONL without echoing line contents", () => {
  assert.throws(
    () => pkg.parseCodexJsonlOutput({ stdout: '{"type":"thread.started"}\n{"private":"bad"\n' }),
    (error) => {
      assert.equal(error.name, "CodexJsonlParserError");
      assert.equal(error.code, "codex_parse_error");
      assert.equal(error.retryable, false);
      assert.equal(error.lineNumber, 2);
      assert.match(error.message, /malformed JSON at line 2/);
      assert.doesNotMatch(error.message, /private/);
      assert.equal(pkg.isCodexJsonlParserError(error), true);
      return true;
    },
  );
});

test("parseCodexJsonlOutput reports non-object JSONL records clearly", () => {
  assert.throws(
    () => pkg.parseCodexJsonlOutput({ stdout: "[]\n" }),
    (error) => {
      assert.equal(error.code, "codex_parse_error");
      assert.equal(error.lineNumber, 1);
      assert.match(error.message, /line 1 was not a JSON object/);
      return true;
    },
  );
});

test("parseCodexJsonlOutput reports missing final agent messages and keeps stderr in diagnostics", () => {
  assert.throws(
    () => pkg.parseCodexJsonlOutput({
      stdout: jsonl([{ type: "turn.completed" }]),
      stderr: "login required\n",
    }),
    (error) => {
      assert.equal(error.name, "CodexJsonlParserError");
      assert.equal(error.code, "codex_missing_final_message");
      assert.equal(error.retryable, false);
      assert.match(error.message, /did not include a completed final agent message/);
      assert.deepEqual(error.diagnostics, {
        stdoutBytes: Buffer.byteLength(jsonl([{ type: "turn.completed" }]), "utf8"),
        stderrBytes: Buffer.byteLength("login required\n", "utf8"),
        stderr: "login required\n",
      });
      return true;
    },
  );
});
