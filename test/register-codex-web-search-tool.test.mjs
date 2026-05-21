import assert from "node:assert/strict";
import test from "node:test";

import { createMockPiApi } from "./fixtures/mock-pi-api.mjs";
import { loadTsProjectModule } from "./helpers/load-ts-project-module.mjs";

const pkg = await loadTsProjectModule(new URL("../src/index.ts", import.meta.url));
const extensionModule = await loadTsProjectModule(new URL("../extensions/codex-web-search.ts", import.meta.url));

function jsonlEvent(event) {
  return `${JSON.stringify(event)}\n`;
}

function createFakeRunner(handler) {
  const calls = [];

  return {
    calls,
    async run(input, options) {
      calls.push({ input, options });
      return handler(input, options);
    },
  };
}

function clearConfigEnvForExtensionTest() {
  const names = Object.values(pkg.CODEX_WEB_SEARCH_CONFIG_ENV_VARS);
  const previous = new Map(names.map((name) => [name, process.env[name]]));
  for (const name of names) {
    delete process.env[name];
  }

  return () => {
    for (const [name, value] of previous) {
      if (value === undefined) {
        delete process.env[name];
      } else {
        process.env[name] = value;
      }
    }
  };
}

test("extension entrypoint registers codex_web_search with useful metadata and schema", () => {
  const { api, registeredTools, registeredCommands } = createMockPiApi();
  const restoreEnv = clearConfigEnvForExtensionTest();

  try {
    extensionModule.default(api);
  } finally {
    restoreEnv();
  }

  assert.equal(registeredTools.length, 1);
  assert.equal(registeredCommands.size, 1);
  assert.equal(registeredCommands.has("codex-web-search"), true);

  const [tool] = registeredTools;
  assert.equal(tool.name, "codex_web_search");
  assert.equal(tool.label, "Codex Web Search");
  assert.match(tool.description, /local Codex CLI/);
  assert.match(tool.promptSnippet, /current, source-backed information/);
  assert.equal(tool.promptGuidelines.length >= 2, true);
  for (const guideline of tool.promptGuidelines) {
    assert.match(guideline, /codex_web_search/);
  }

  assert.equal(tool.parameters.type, "object");
  assert.equal(tool.parameters.additionalProperties, false);
  assert.deepEqual(tool.parameters.required, ["query"]);
  assert.deepEqual(tool.parameters.properties.mode.enum, ["live", "cached"]);
  assert.equal(tool.parameters.properties.timeoutMs.default, 120_000);
  assert.equal(tool.parameters.properties.maxOutputChars.maximum, 50_000);
});

test("extension help command shows bounded codex_web_search usage help", async () => {
  const { api, registeredCommands } = createMockPiApi();
  const notifications = [];
  const restoreEnv = clearConfigEnvForExtensionTest();

  try {
    extensionModule.default(api);
  } finally {
    restoreEnv();
  }

  const command = registeredCommands.get("codex-web-search");
  assert.ok(command);
  assert.match(command.description, /codex_web_search/);

  await command.handler("ignored args", {
    cwd: process.cwd(),
    hasUI: true,
    ui: {
      notify(message, level) {
        notifications.push({ message, level });
      },
    },
  });

  assert.equal(notifications.length, 1);
  assert.equal(notifications[0].level, "info");
  assert.match(notifications[0].message, /codex_web_search help/);
  assert.match(notifications[0].message, /mode: "live"/);
  assert.match(notifications[0].message, /--sandbox read-only/);
  assert.match(notifications[0].message, /never reads Codex credential files/);
  assert.equal(notifications[0].message.length < 2_000, true);
});

test("help command is informational and safe without an interactive UI", async () => {
  let notified = false;
  const command = pkg.createCodexWebSearchHelpCommandDefinition();

  await command.handler("", {
    cwd: process.cwd(),
    hasUI: false,
    ui: {
      notify() {
        notified = true;
      },
    },
  });

  assert.equal(notified, false);
  assert.equal(pkg.showCodexWebSearchHelp({ cwd: process.cwd(), hasUI: false }), false);
});

test("registered tool normalizes parameters, runs fake Codex, parses JSONL, and formats output", async () => {
  const controller = new AbortController();
  const runner = createFakeRunner((input) => {
    const stdout = jsonlEvent({
      type: "item.completed",
      item: {
        id: "msg-1",
        type: "agent_message",
        text: "Codex found the current Pi extension guidance.",
        annotations: [
          {
            title: "Pi extension docs",
            url: "https://example.com/pi/extensions",
            snippet: "registerTool adds model-callable tools.",
          },
        ],
      },
    });

    return {
      stdout,
      stderr: "",
      diagnostics: {
        stdoutBytes: Buffer.byteLength(stdout, "utf8"),
        stderrBytes: 0,
      },
    };
  });
  const { api, registeredTools } = createMockPiApi();

  pkg.registerCodexWebSearchTool(api, { runner, env: {} });
  const result = await registeredTools[0].execute(
    "call-1",
    {
      query: "  current Pi extension docs  ",
      mode: "live",
      timeoutMs: 5_000,
      maxOutputChars: 1_000,
      includeRawEvents: true,
    },
    controller.signal,
    undefined,
    { cwd: process.cwd() },
  );

  assert.equal(runner.calls.length, 1);
  assert.equal(runner.calls[0].input.query, "current Pi extension docs");
  assert.equal(runner.calls[0].input.mode, "live");
  assert.equal(runner.calls[0].input.liveSearch, true);
  assert.equal(runner.calls[0].input.timeoutMs, 5_000);
  assert.equal(runner.calls[0].input.maxOutputChars, 1_000);
  assert.equal(runner.calls[0].input.includeRawEvents, true);
  assert.equal(runner.calls[0].input.codex.sandbox, "read-only");
  assert.equal(runner.calls[0].options.signal, controller.signal);

  assert.match(result.content[0].text, /Codex found the current Pi extension guidance/);
  assert.match(result.content[0].text, /Sources:/);
  assert.match(result.content[0].text, /https:\/\/example.com\/pi\/extensions/);
  assert.equal(result.details.ok, true);
  assert.equal(result.details.mode, "live");
  assert.equal(result.details.liveSearch, true);
  assert.equal(result.details.sourceCount, 1);
  assert.equal(result.details.rawEventCount, 1);
  assert.equal(result.details.maxOutputChars, 1_000);
});

test("registered tool applies config defaults and lets tool-call parameters take precedence", async () => {
  const env = {
    [pkg.CODEX_WEB_SEARCH_CONFIG_ENV_VARS.defaultMode]: "cached",
    [pkg.CODEX_WEB_SEARCH_CONFIG_ENV_VARS.timeoutMs]: "5000",
    [pkg.CODEX_WEB_SEARCH_CONFIG_ENV_VARS.maxOutputChars]: "900",
    [pkg.CODEX_WEB_SEARCH_CONFIG_ENV_VARS.sandbox]: "read-only",
  };
  const runner = createFakeRunner(() => {
    const stdout = jsonlEvent({
      type: "item.completed",
      item: {
        id: "msg-config",
        type: "agent_message",
        text: "Configured default answer.",
      },
    });

    return {
      stdout,
      stderr: "",
      diagnostics: {
        stdoutBytes: Buffer.byteLength(stdout, "utf8"),
        stderrBytes: 0,
      },
    };
  });
  const tool = pkg.createCodexWebSearchToolDefinition({ runner, env });

  assert.equal(tool.parameters.properties.mode.default, "cached");
  assert.equal(tool.parameters.properties.timeoutMs.default, 5_000);
  assert.equal(tool.parameters.properties.maxOutputChars.default, 900);

  await tool.execute("call-config-1", { query: "uses configured defaults" }, undefined, undefined, { cwd: process.cwd() });
  assert.equal(runner.calls[0].input.mode, "cached");
  assert.equal(runner.calls[0].input.liveSearch, false);
  assert.equal(runner.calls[0].input.timeoutMs, 5_000);
  assert.equal(runner.calls[0].input.maxOutputChars, 900);
  assert.equal(runner.calls[0].input.codex.sandbox, "read-only");

  await tool.execute(
    "call-config-2",
    {
      query: "uses tool-call overrides",
      mode: "live",
      timeoutMs: 6_000,
      maxOutputChars: 1_000,
    },
    undefined,
    undefined,
    { cwd: process.cwd() },
  );
  assert.equal(runner.calls[1].input.mode, "live");
  assert.equal(runner.calls[1].input.liveSearch, true);
  assert.equal(runner.calls[1].input.timeoutMs, 6_000);
  assert.equal(runner.calls[1].input.maxOutputChars, 1_000);
});

test("registered tool rejects invalid config before registration", () => {
  assert.throws(
    () => pkg.createCodexWebSearchToolDefinition({
      runner: createFakeRunner(() => {
        throw new Error("runner should not have been called");
      }),
      env: {
        [pkg.CODEX_WEB_SEARCH_CONFIG_ENV_VARS.sandbox]: "workspace-write",
      },
    }),
    (error) => {
      assert.equal(error.name, "CodexWebSearchConfigError");
      assert.match(error.message, /sandbox must be 'read-only'/);
      assert.doesNotMatch(error.message, /auth\.json/);
      return true;
    },
  );
});

test("registered tool rejects invalid input before calling the runner", async () => {
  const runner = createFakeRunner(() => {
    throw new Error("runner should not have been called");
  });
  const tool = pkg.createCodexWebSearchToolDefinition({ runner, env: {} });

  await assert.rejects(
    () => tool.execute("call-2", { query: "   ", maxOutputChars: 600 }, undefined, undefined, { cwd: process.cwd() }),
    (error) => {
      assert.equal(error.name, "CodexWebSearchToolExecutionError");
      assert.equal(error.code, "invalid_input");
      assert.equal(error.retryable, false);
      assert.match(error.message, /Codex web search failed \(invalid_input\)\./);
      assert.doesNotMatch(error.message, /runner should not/);
      assert.equal(error.toolResult.details.ok, false);
      assert.equal(error.toolResult.details.maxOutputChars, 600);
      assert.equal(error.toolResult.details.error.code, "invalid_input");
      return true;
    },
  );

  assert.equal(runner.calls.length, 0);
});

test("registered tool formats and throws sanitized runner failures", async () => {
  const privateStderr = "auth failure in /home/example/private/project\n";
  const runner = createFakeRunner(() => {
    throw new pkg.CodexRunnerError({
      code: "codex_nonzero_exit",
      message: "raw process failure from /home/example/private/project",
      retryable: false,
      diagnostics: {
        stdoutBytes: 0,
        stderrBytes: Buffer.byteLength(privateStderr, "utf8"),
        stderr: privateStderr,
        exitCode: 1,
      },
    });
  });
  const tool = pkg.createCodexWebSearchToolDefinition({ runner, env: {} });

  await assert.rejects(
    () => tool.execute("call-3", { query: "private query", maxOutputChars: 1_000 }, undefined, undefined, { cwd: process.cwd() }),
    (error) => {
      assert.equal(error.name, "CodexWebSearchToolExecutionError");
      assert.equal(error.code, "codex_nonzero_exit");
      assert.match(error.message, /Codex web search failed \(codex_nonzero_exit\)\./);
      assert.match(error.message, /run `codex login`/);
      assert.match(error.message, /raw stderr omitted from tool output/);
      assert.doesNotMatch(error.message, /private query/);
      assert.doesNotMatch(error.message, /\/home\/example\/private/);
      assert.equal(error.toolResult.details.ok, false);
      assert.equal(error.toolResult.details.mode, "live");
      assert.equal(error.toolResult.details.diagnostics.stderrOmitted, true);
      assert.equal(error.toolResult.details.error.code, "codex_nonzero_exit");
      return true;
    },
  );
});

test("registered tool reports malformed fake Codex JSONL as a parse failure", async () => {
  const runner = createFakeRunner(() => ({
    stdout: "not json\n",
    stderr: "",
    diagnostics: {
      stdoutBytes: Buffer.byteLength("not json\n", "utf8"),
      stderrBytes: 0,
    },
  }));
  const tool = pkg.createCodexWebSearchToolDefinition({ runner, env: {} });

  await assert.rejects(
    () => tool.execute("call-4", { query: "current docs" }, undefined, undefined, { cwd: process.cwd() }),
    (error) => {
      assert.equal(error.name, "CodexWebSearchToolExecutionError");
      assert.equal(error.code, "codex_parse_error");
      assert.match(error.message, /Codex web search failed \(codex_parse_error\)\./);
      assert.equal(error.toolResult.details.error.code, "codex_parse_error");
      return true;
    },
  );
});
