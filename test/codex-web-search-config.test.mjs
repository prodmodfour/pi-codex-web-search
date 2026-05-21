import assert from "node:assert/strict";
import test from "node:test";

import { loadTsProjectModule } from "./helpers/load-ts-project-module.mjs";

const pkg = await loadTsProjectModule(new URL("../src/index.ts", import.meta.url));

const ENV = pkg.CODEX_WEB_SEARCH_CONFIG_ENV_VARS;

function env(overrides = {}) {
  return { ...overrides };
}

test("loadCodexWebSearchConfig returns safe defaults without reading Codex credentials", () => {
  const accessed = [];
  const source = new Proxy(env(), {
    get(target, property) {
      accessed.push(String(property));
      return target[property];
    },
  });

  const config = pkg.loadCodexWebSearchConfig({ env: source });

  assert.deepEqual(config, {
    codexBinary: "codex",
    defaultMode: "live",
    timeoutMs: 120_000,
    maxOutputChars: 12_000,
    sandbox: "read-only",
  });
  assert.deepEqual(accessed, [
    ENV.codexBinary,
    ENV.defaultMode,
    ENV.timeoutMs,
    ENV.maxOutputChars,
    ENV.sandbox,
  ]);
  assert.equal(accessed.some((key) => key.includes("AUTH") || key.includes("HOME")), false);
});

test("loadCodexWebSearchConfig applies documented environment overrides", () => {
  const config = pkg.loadCodexWebSearchConfig({
    env: env({
      [ENV.codexBinary]: "/opt/codex/bin/codex",
      [ENV.defaultMode]: "cached",
      [ENV.timeoutMs]: "5000",
      [ENV.maxOutputChars]: "900",
      [ENV.sandbox]: "read-only",
    }),
  });

  assert.deepEqual(config, {
    codexBinary: "/opt/codex/bin/codex",
    defaultMode: "cached",
    timeoutMs: 5_000,
    maxOutputChars: 900,
    sandbox: "read-only",
  });
});

test("explicit project config takes precedence over environment config", () => {
  const config = pkg.loadCodexWebSearchConfig({
    env: env({
      [ENV.codexBinary]: "/env/codex",
      [ENV.defaultMode]: "live",
      [ENV.timeoutMs]: "1000",
      [ENV.maxOutputChars]: "600",
      [ENV.sandbox]: "read-only",
    }),
    config: {
      codexBinary: "/project/codex",
      defaultMode: "cached",
      timeoutMs: 2_000,
      maxOutputChars: 800,
      sandbox: "read-only",
    },
  });

  assert.deepEqual(config, {
    codexBinary: "/project/codex",
    defaultMode: "cached",
    timeoutMs: 2_000,
    maxOutputChars: 800,
    sandbox: "read-only",
  });
});

test("validateCodexWebSearchConfig reports invalid environment and project values", () => {
  const result = pkg.validateCodexWebSearchConfig({
    env: env({
      [ENV.codexBinary]: "   ",
      [ENV.defaultMode]: "offline",
      [ENV.timeoutMs]: "999",
      [ENV.maxOutputChars]: "100",
      [ENV.sandbox]: "workspace-write",
    }),
    config: {
      extraSetting: true,
      timeoutMs: "5.5",
    },
  });

  assert.equal(result.ok, false);
  assert.deepEqual(
    result.issues.map((issue) => issue.code),
    [
      "codex_binary_invalid",
      "default_mode_invalid",
      "timeout_ms_invalid",
      "max_output_chars_invalid",
      "sandbox_invalid",
      "unknown_property",
      "timeout_ms_invalid",
    ],
  );
  assert.deepEqual(
    result.issues.map((issue) => issue.source),
    ["environment", "environment", "environment", "environment", "environment", "project", "project"],
  );

  assert.throws(
    () => pkg.loadCodexWebSearchConfig({ env: { [ENV.defaultMode]: "offline" } }),
    (error) => {
      assert.equal(error.name, "CodexWebSearchConfigError");
      assert.match(error.message, /Invalid codex_web_search configuration/);
      assert.doesNotMatch(error.message, /auth\.json/);
      return true;
    },
  );
});
