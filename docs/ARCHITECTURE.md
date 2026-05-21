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

`src/codex/buildCodexArgs.ts` is the boundary between validated tool input and
the subprocess runner. It returns arguments for the Codex executable, not a shell
command string and not the binary path. The current live-search shape is:

```text
["exec", "--json", "--search", "--skip-git-repo-check", "--sandbox", "read-only", "--", query]
```

The prompt is always the final argv element after `--`. `mode: "cached"` omits
`--search`, and the current sandbox allowlist contains only `read-only`.

## Implemented subprocess-runner boundary

`src/codex/CodexRunner.ts` owns Codex process execution. It:

* defaults to the PATH-resolved `codex` binary, with a constructor override for a
  future validated configuration layer;
* calls Codex through `execFile` with an argv array and `shell: false`;
* passes the normalized `timeoutMs` and `codex.maxBufferBytes` values to the
  process layer;
* forwards an optional `AbortSignal` for future Pi cancellation handling;
* returns raw stdout/stderr plus byte-count diagnostics on success;
* maps missing binary, timeout, non-zero exit, max-buffer, cancellation, and
  unknown process failures to `CodexRunnerError` with stable failure codes;
* exposes `runAndParse(...)` so parser functions can be injected while parse
  failures are wrapped as `codex_parse_error`.

The runner intentionally does not parse JSONL events or format Pi tool output;
those remain separate modules.

## Implemented JSONL-parser boundary

`src/codex/CodexJsonlParser.ts` owns parsing for `codex exec --json` stdout. It:

* parses non-empty stdout lines as JSON objects and reports malformed/non-object
  lines as `CodexJsonlParserError` with `codex_parse_error`;
* ignores unknown event types;
* extracts completed agent/assistant message items and treats the last completed
  agent message as the answer;
* captures lightweight web-search summaries from documented `web_search`/
  `webSearch` item shapes when present;
* extracts HTTP(S) citation/source URLs from annotations, sources, results, and
  web-search actions when Codex provides them;
* preserves stderr and byte counts in diagnostics rather than mixing stderr into
  answer text;
* can include raw parsed events only when explicitly requested by the normalized
  tool input.

The parser intentionally does not format Pi `content`; the formatter remains a
separate module.

## Implemented tool-result formatter boundary

`src/output/formatToolResult.ts` owns the final conversion from normalized
Codex web-search results into Pi tool results. It:

* returns one text content item plus structured details;
* keeps successful answers concise and adds a `Sources:` section when parsed
  source URLs or snippets are available;
* enforces `maxOutputChars` using the same bounds as the public tool API and
  appends a truncation notice when content is shortened;
* handles empty successful answers with a clear placeholder message;
* maps structured failure codes to actionable, code-specific messages;
* omits raw stderr, query text, argv, and local paths from model-facing error
  text while retaining safe diagnostic metadata such as byte counts, exit code,
  signal, and whether stderr was omitted;
* bounds structured `rawEvents` details when callers explicitly requested them.

The formatter intentionally does not execute Codex or register the Pi tool;
Ticket 008 owns registration and wiring.

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
