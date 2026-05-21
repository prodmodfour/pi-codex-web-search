#!/usr/bin/env node
/**
 * Fake Codex CLI fixture for integration tests.
 *
 * It accepts the reviewed `codex exec --json ... -- <prompt>` argv shape and
 * emits deterministic JSONL or process failures without requiring a real Codex
 * installation or login.
 */
const args = process.argv.slice(2);

const promptSeparatorIndex = args.indexOf("--");
const query = promptSeparatorIndex >= 0 ? args[promptSeparatorIndex + 1] ?? "" : "";

if (!hasExpectedExecArgs(args, promptSeparatorIndex)) {
  process.stderr.write("fake Codex fixture received unexpected argv\n");
  process.exitCode = 64;
} else if (query.includes("fake-codex:timeout")) {
  // Keep the process alive long enough for CodexRunner's execFile timeout to
  // kill it. If the timeout handling regresses, the node:test timeout will stop
  // the test rather than hanging indefinitely.
  setTimeout(() => {
    writeSuccessfulJsonl();
  }, 60_000);
} else if (query.includes("fake-codex:nonzero")) {
  process.stderr.write("fake Codex fixture nonzero diagnostic\n");
  process.exitCode = 42;
} else if (query.includes("fake-codex:malformed")) {
  process.stdout.write("not-json\n");
} else if (query.includes("fake-codex:missing-final")) {
  writeWebSearchEvent();
} else {
  writeSuccessfulJsonl();
}

function hasExpectedExecArgs(argv, separatorIndex) {
  if (argv[0] !== "exec") {
    return false;
  }

  if (!argv.includes("--json")) {
    return false;
  }

  if (!argv.includes("--skip-git-repo-check")) {
    return false;
  }

  const sandboxIndex = argv.indexOf("--sandbox");
  if (sandboxIndex < 0 || argv[sandboxIndex + 1] !== "read-only") {
    return false;
  }

  return separatorIndex === argv.length - 2 && typeof argv[separatorIndex + 1] === "string";
}

function writeSuccessfulJsonl() {
  const mode = args.includes("--search") ? "live" : "cached";
  writeWebSearchEvent();
  writeJsonl({
    type: "item.completed",
    item: {
      id: "msg-fixture",
      type: "agent_message",
      text: `Fake Codex fixture answer produced through the ${mode} subprocess path.`,
      annotations: [
        {
          title: "Fake Codex fixture source",
          url: "https://example.com/fake-codex/final-answer",
          snippet: "Representative source attached to the final fake agent message.",
        },
      ],
    },
  });
}

function writeWebSearchEvent() {
  writeJsonl({
    type: "item.completed",
    item: {
      id: "search-fixture",
      type: "web_search",
      status: "completed",
      query: "fake fixture public query",
      action: {
        type: "search",
        query: "fake fixture public query",
      },
      results: [
        {
          title: "Fake Codex fixture search result",
          url: "https://example.com/fake-codex/search-result",
          snippet: "Representative source emitted before the final fake agent message.",
        },
      ],
    },
  });
}

function writeJsonl(event) {
  process.stdout.write(`${JSON.stringify(event)}\n`);
}
