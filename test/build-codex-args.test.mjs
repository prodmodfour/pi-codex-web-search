import assert from "node:assert/strict";
import test from "node:test";

import { loadTsModule } from "./helpers/load-ts-module.mjs";

const api = await loadTsModule(new URL("../src/tool/codexWebSearchApi.ts", import.meta.url));
const argvBuilder = await loadTsModule(new URL("../src/codex/buildCodexArgs.ts", import.meta.url));

function normalized(overrides = {}) {
  const base = api.normalizeCodexWebSearchInput({ query: "current Codex CLI release notes" });
  return {
    ...base,
    ...overrides,
    codex: {
      ...base.codex,
      ...(overrides.codex ?? {}),
    },
  };
}

test("buildCodexExecArgs emits the default live-search JSONL argv", () => {
  assert.deepEqual(argvBuilder.buildCodexExecArgs(normalized()), [
    "exec",
    "--json",
    "--search",
    "--skip-git-repo-check",
    "--sandbox",
    "read-only",
    "--",
    "current Codex CLI release notes",
  ]);
});

test("buildCodexExecArgs covers live/cached and skip-git combinations", () => {
  const cases = [
    {
      input: normalized(),
      expected: [
        "exec",
        "--json",
        "--search",
        "--skip-git-repo-check",
        "--sandbox",
        "read-only",
        "--",
        "current Codex CLI release notes",
      ],
    },
    {
      input: api.normalizeCodexWebSearchInput({ query: "cached answer", mode: "cached" }),
      expected: [
        "exec",
        "--json",
        "--skip-git-repo-check",
        "--sandbox",
        "read-only",
        "--",
        "cached answer",
      ],
    },
    {
      input: normalized({ codex: { skipGitRepoCheck: false } }),
      expected: [
        "exec",
        "--json",
        "--search",
        "--sandbox",
        "read-only",
        "--",
        "current Codex CLI release notes",
      ],
    },
    {
      input: normalized({
        query: "cached without repo skip",
        mode: "cached",
        liveSearch: false,
        codex: { skipGitRepoCheck: false },
      }),
      expected: [
        "exec",
        "--json",
        "--sandbox",
        "read-only",
        "--",
        "cached without repo skip",
      ],
    },
  ];

  for (const { input, expected } of cases) {
    assert.deepEqual(argvBuilder.buildCodexExecArgs(input), expected);
  }
});

test("buildCodexExecArgs keeps shell metacharacters as one prompt argv element", () => {
  const trickyQuery = "--search $(echo not-run) ; printf \"quoted\" && echo done\nsecond line";
  const args = argvBuilder.buildCodexExecArgs(normalized({ query: trickyQuery }));

  assert.equal(args.at(-2), "--");
  assert.equal(args.at(-1), trickyQuery);
  assert.equal(args.filter((arg) => arg === trickyQuery).length, 1);
  assert.equal(args.includes("$(echo not-run)"), false);
  assert.equal(args.includes(";"), false);
});

test("buildCodexExecArgs rejects unsafe sandbox overrides", () => {
  for (const sandbox of ["workspace-write", "danger-full-access", "read_only"]) {
    assert.throws(
      () => argvBuilder.buildCodexExecArgs(normalized({ codex: { sandbox } })),
      (error) => {
        assert.equal(error.name, "CodexArgvBuilderError");
        assert.match(error.message, /sandbox/);
        return true;
      },
    );
  }
});

test("buildCodexExecArgs validates only documented output and boolean flags", () => {
  assert.throws(
    () => argvBuilder.buildCodexExecArgs(normalized({ codex: { outputFormat: "text" } })),
    /outputFormat must be 'jsonl'/,
  );
  assert.throws(
    () => argvBuilder.buildCodexExecArgs(normalized({ codex: { skipGitRepoCheck: "true" } })),
    /skipGitRepoCheck must be a boolean/,
  );
});

test("buildCodexExecArgs rejects malformed normalized input without echoing the query", () => {
  const privateQuery = "private query with sensitive marker text";

  assert.throws(
    () => argvBuilder.buildCodexExecArgs(normalized({ query: privateQuery, liveSearch: false })),
    (error) => {
      assert.equal(error.name, "CodexArgvBuilderError");
      assert.match(error.message, /liveSearch must match/);
      assert.doesNotMatch(error.message, /private query/);
      assert.doesNotMatch(error.message, /sensitive marker/);
      return true;
    },
  );

  assert.throws(
    () => argvBuilder.buildCodexExecArgs(normalized({ query: "contains\0null" })),
    /query must not contain null bytes/,
  );
});

test("sandbox and output-format allowlists reflect the current safe contract", () => {
  assert.deepEqual(argvBuilder.SAFE_CODEX_SANDBOXES, ["read-only"]);
  assert.deepEqual(argvBuilder.SUPPORTED_CODEX_OUTPUT_FORMATS, ["jsonl"]);
  assert.equal(argvBuilder.isSafeCodexSandboxMode("read-only"), true);
  assert.equal(argvBuilder.isSafeCodexSandboxMode("workspace-write"), false);
  assert.equal(argvBuilder.isSupportedCodexOutputFormat("jsonl"), true);
  assert.equal(argvBuilder.isSupportedCodexOutputFormat("text"), false);
});
