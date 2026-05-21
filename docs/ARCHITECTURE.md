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
src/config/codexWebSearchConfig.ts    # safe environment/project config loading
src/codex/buildCodexArgs.ts                 # safe codex exec argv construction
src/pi/registerCodexWebSearchHelpCommand.ts # optional /codex-web-search help command
src/pi/registerCodexWebSearchTool.ts        # Pi tool registration and execution wiring
src/codex/CodexRunner.ts
src/codex/CodexJsonlParser.ts
src/output/formatToolResult.ts
```

## Implemented configuration boundary

`src/config/codexWebSearchConfig.ts` owns safe user configuration. It:

* reads only documented `PI_CODEX_WEB_SEARCH_*` environment variables or an explicit in-process project config object;
* validates Codex binary path, default mode, default timeout, default max-output length, and sandbox before registration or execution uses them;
* applies precedence as project config over environment config over built-in defaults;
* lets tool-call parameters override configured defaults for `mode`, `timeoutMs`, and `maxOutputChars`;
* currently allows only the `read-only` sandbox value, so configuration cannot enable write-capable Codex execution;
* never reads Codex credentials, home-directory files, `$HOME`, or arbitrary config files.

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

* defaults to the PATH-resolved `codex` binary, with the registration layer passing a validated configuration override when one is provided;
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
`src/pi/registerCodexWebSearchTool.ts` owns that boundary.

## Implemented Pi-registration boundary

`src/pi/registerCodexWebSearchTool.ts` owns the Pi tool definition. It:

* registers `codex_web_search` with label, description, prompt snippet, and prompt guidelines that name the tool explicitly;
* resolves and validates configuration before building the tool definition;
* exposes a JSON-schema-compatible parameter schema matching the Ticket 003 API and rejecting unknown properties, with schema defaults updated from validated configuration;
* normalizes Pi-provided parameters again before execution so the internal pipeline does not rely solely on provider/tool-call validation;
* uses a test-injectable runner seam, defaulting to the execFile-based `CodexRunner` with the validated Codex binary path;
* passes Pi's `AbortSignal` through to the runner;
* parses successful JSONL stdout with `parseCodexJsonlToolResult(...)`;
* formats successful results with `formatCodexWebSearchToolResult(...)`;
* formats failures and then throws `CodexWebSearchToolExecutionError` so Pi marks the tool call as failed while the thrown message remains sanitized and bounded.

The extension entrypoint in `extensions/codex-web-search.ts` calls this registration helper and the separate optional help-command registration helper.

## Implemented help-command boundary

`src/pi/registerCodexWebSearchHelpCommand.ts` owns the `/codex-web-search` slash-command help surface. It:

* registers a command named `codex-web-search` through Pi's `registerCommand` API;
* displays concise `codex_web_search` usage help through `ctx.ui.notify(...)` when a UI is available;
* no-ops in non-interactive contexts where no UI notification surface is available;
* does not execute Codex, inspect configuration, read credentials, or process command arguments.

## Test strategy

Automated tests must use mocks or fake executables. Real Codex auth is a manual validation step.

Expected automated coverage:

* input validation and normalization
* configuration defaults, overrides, invalid values, and precedence
* argv construction
* subprocess timeout/error handling
* JSONL parsing
* output formatting
* Pi extension registration with a mock Pi object and fake runner
* fake-Codex integration path
