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
src/pi/registerCodexWebSearchTool.ts
src/codex/buildCodexArgs.ts
src/codex/CodexRunner.ts
src/codex/CodexJsonlParser.ts
src/output/formatToolResult.ts
```

## Test strategy

Automated tests must use mocks or fake executables. Real Codex auth is a manual validation step.

Expected automated coverage:

* input validation
* argv construction
* subprocess timeout/error handling
* JSONL parsing
* output formatting
* Pi extension registration with a mock Pi object
* fake-Codex integration path
