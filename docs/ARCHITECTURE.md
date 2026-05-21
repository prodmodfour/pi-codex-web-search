# Architecture

The final extension should be deliberately small.

```text
Pi extension entrypoint
  -> tool registration
    -> input/config validation
      -> safe Codex argv builder
        -> Codex subprocess runner
          -> JSONL parser
            -> Pi tool result formatter
```

## Main modules

```text
extensions/codex-web-search.ts
src/pi/piExtensionContract.ts          # current local contract/test subset
src/tool/codexWebSearchApi.ts          # tool input/result types and validation
src/codex/buildCodexArgs.ts            # safe codex exec argv construction
src/pi/registerCodexWebSearchTool.ts   # future registration module
src/codex/CodexRunner.ts
src/codex/CodexJsonlParser.ts
src/output/formatToolResult.ts
```

## Implemented argv-building boundary

`src/codex/buildCodexArgs.ts` is the boundary between validated tool input and a
future subprocess runner. It returns arguments for the Codex executable, not a
shell command string and not the binary path. The current live-search shape is:

```text
["exec", "--json", "--search", "--skip-git-repo-check", "--sandbox", "read-only", "--", query]
```

The prompt is always the final argv element after `--`. `mode: "cached"` omits
`--search`, and the current sandbox allowlist contains only `read-only`.

## Test strategy

Automated tests must use mocks or fake executables. Real Codex auth is a manual validation step.

Expected automated coverage:

* input validation and normalization
* argv construction
* subprocess timeout/error handling
* JSONL parsing
* output formatting
* Pi extension registration with a mock Pi object
* fake-Codex integration path
