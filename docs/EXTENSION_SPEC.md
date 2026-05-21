# Extension Spec

## Scope

This document freezes the Pi extension/package contract that this package targets.
It also freezes the Ticket 003 `codex_web_search` tool API, the Ticket 004 safe
`codex exec` argv-builder contract, the Ticket 005 bounded subprocess-runner
contract, and the Ticket 006 JSONL-parser contract. Later tickets own result
formatting and final Pi registration.

## Research basis

Reviewed against the locally installed Pi package, version `0.75.4`:

* `docs/extensions.md`
* `docs/packages.md`
* `examples/extensions/hello.ts`
* `examples/extensions/dynamic-tools.ts`
* `examples/extensions/tool-override.ts`
* `examples/extensions/with-deps/package.json`
* exported declaration files for `ExtensionAPI` and `ToolDefinition`

No Codex live-web research was used for this ticket; local Pi docs, examples,
and declarations were sufficient.

## Frozen extension entrypoint contract

Pi extensions are TypeScript or JavaScript modules loaded by Pi's extension
runtime. TypeScript is supported directly by Pi through its runtime loader, so
this package may ship TypeScript source.

The extension entrypoint must default-export a factory function:

```ts
export default function extension(pi: PiExtensionApi): void | Promise<void> {
  // register tools, commands, events, etc.
}
```

Target assumptions:

* the default export receives Pi's `ExtensionAPI` object;
* the factory may be synchronous or asynchronous;
* Pi awaits an async factory before normal startup continues;
* registration should normally happen during factory execution unless dynamic
  registration is intentionally needed later;
* this package's entrypoint remains `./extensions/codex-web-search.ts`.

## Frozen `registerTool` contract

The final extension will register one tool named `codex_web_search` through
`pi.registerTool(...)`.

The target tool-definition shape is the subset used by Pi `0.75.4`:

```ts
pi.registerTool({
  name: "codex_web_search",
  label: "Codex Web Search",
  description: "Search the web through the local Codex CLI.",
  promptSnippet: "Search the web through the local Codex CLI when current information is needed.",
  promptGuidelines: [
    "Use codex_web_search only when the user needs current or source-backed web information.",
  ],
  parameters, // TypeBox schema
  async execute(toolCallId, params, signal, onUpdate, ctx) {
    return {
      content: [{ type: "text", text: "..." }],
      details: {},
    };
  },
});
```

Frozen execution signature:

```ts
execute(
  toolCallId: string,
  params: ValidatedParams,
  signal: AbortSignal | undefined,
  onUpdate: ((partialResult: ToolResult) => void) | undefined,
  ctx: ExtensionContext,
): Promise<ToolResult>
```

Important details:

* `parameters` is a TypeBox schema. Pi validates tool-call arguments before
  `execute` receives them.
* Use `StringEnum` from `@earendil-works/pi-ai` for string enums when a schema
  needs enum-like string parameters, because Pi docs call out provider
  compatibility issues with `Type.Union([...Type.Literal])`.
* `promptSnippet` adds the tool to Pi's `Available tools` prompt section.
* `promptGuidelines` are appended as flat guideline bullets; every bullet must
  name `codex_web_search` explicitly.
* Tool results should return `content` with text suitable for the model and a
  `details` object for structured data/rendering. This project will include
  `details` even when it is empty.
* Throw from `execute` to signal a failed tool call. Returning an error-looking
  object does not mark the tool call as failed.
* `signal` must be honored by long-running work. Later runner tickets will pass
  it through to subprocess handling where practical.
* `onUpdate` may stream bounded progress later, but this package does not depend
  on streaming updates for correctness.

## Package manifest contract

This package uses the explicit Pi package manifest in `package.json`:

```json
{
  "keywords": ["pi-package", "pi-extension"],
  "pi": {
    "extensions": ["./extensions/codex-web-search.ts"]
  }
}
```

Frozen assumptions:

* `pi.extensions` paths are relative to the package root.
* Arrays may point at files, directories, or glob patterns supported by Pi's
  package loader.
* If no `pi` manifest is present, Pi can auto-discover conventional directories
  such as `extensions/`, but this package keeps the explicit manifest for
  reviewability.
* Runtime dependencies required by extension code must be in `dependencies`.
* Pi-bundled packages such as `@earendil-works/pi-coding-agent`,
  `@earendil-works/pi-ai`, `@earendil-works/pi-tui`, and `typebox` should be
  listed as `peerDependencies` with a `"*"` range if this package imports them
  at runtime in a future ticket.

## Install and load paths

Pi can load this package through these paths:

* temporary local test: `pi -e ./path/to/pi-codex-web-search`;
* temporary direct entrypoint test: `pi -e ./extensions/codex-web-search.ts`;
* global package install: `pi install npm:pi-codex-web-search` or a git source;
* project package install: `pi install -l ./path/to/pi-codex-web-search`.

Documented Pi install locations:

* global npm packages: `~/.pi/agent/npm/`;
* project npm packages: `.pi/npm/`;
* global git packages: `~/.pi/agent/git/<host>/<path>`;
* project git packages: `.pi/git/<host>/<path>`;
* local path package entries point at the original path rather than being
  copied.

Pi also auto-discovers top-level extensions outside packages from:

* `~/.pi/agent/extensions/*.ts` and `~/.pi/agent/extensions/*/index.ts`;
* `.pi/extensions/*.ts` and `.pi/extensions/*/index.ts`.

Those auto-discovery locations are useful for local development, but the package
contract for this repository is the `pi.extensions` manifest above.

## Local mock contract for automated tests

The official Pi types were available in the local installation, but this package
currently avoids importing Pi at runtime during automated tests so tests remain
independent of a local Pi install and real Codex authentication. The repository
therefore includes a small local contract in `src/pi/piExtensionContract.ts` and
a test fixture in `test/fixtures/mock-pi-api.mjs`.

These local types/fixtures are intentionally a narrow subset of Pi's real API:

* `registerTool(...)`
* `registerCommand(...)` for future optional help-surface tests
* text tool results and structured `details`
* the current `execute(toolCallId, params, signal, onUpdate, ctx)` order

They are not a replacement for Pi's official runtime. If a future ticket adds a
runtime import from Pi or TypeBox, the package metadata and tests must be updated
explicitly.

## Target tool name

Name: `codex_web_search`

Purpose: search the web through the local Codex CLI from inside Pi, primarily to
let a user with ChatGPT/Codex login reuse Codex's web-search capability rather
than calling the OpenAI API web-search endpoint.

## Finalized `codex_web_search` tool API

Ticket 003 defines the TypeScript contract and validation functions in
`src/tool/codexWebSearchApi.ts`. The final Pi registration should expose these
parameters and reject unknown properties.

```ts
interface CodexWebSearchToolInput {
  query: string;
  mode?: "live" | "cached";
  timeoutMs?: number;
  maxOutputChars?: number;
  includeRawEvents?: boolean;
}
```

### Parameters

| Parameter | Required | Default | Validation | Meaning |
| --- | --- | --- | --- | --- |
| `query` | yes | none | string, trimmed, 1-4000 chars | Search question or task passed to Codex as data, never shell-interpolated. |
| `mode` | no | `"live"` | `"live"` or `"cached"` | `"live"` requests Codex `--search`; `"cached"` explicitly omits `--search`. |
| `timeoutMs` | no | `120000` | integer from `1000` to `300000` | Subprocess timeout budget for a later runner. |
| `maxOutputChars` | no | `12000` | integer from `500` to `50000` | Maximum formatted Pi tool-output length for a later formatter. |
| `includeRawEvents` | no | `false` | boolean | Allows later parser/formatter code to include bounded raw JSONL events in structured details. |

Live search is on by default because this is a web-search tool. Callers can set
`mode: "cached"` when they explicitly do not want Codex's live `--search` flag.
The implementation must still emit `--search` only when normalized mode is
`"live"`.

### Execution defaults frozen by the API

These defaults are included in `NormalizedCodexWebSearchInput` for later argv
builder and runner tickets:

```text
sandbox: read-only
outputFormat: jsonl
skipGitRepoCheck: true
codex binary: codex (runner default, not a tool parameter yet)
timeoutMs: 120000
maxBufferBytes: 2097152
maxOutputChars: 12000
includeRawEvents: false
```

The sandbox is intentionally not exposed as a tool-call parameter in Ticket 003.
Future configuration work may add validated configuration overrides, but the
default remains read-only.

### Normalized result shape

The internal normalized result type is a success/failure union:

```ts
type CodexWebSearchNormalizedResult =
  | {
      ok: true;
      query: string;
      mode: "live" | "cached";
      liveSearch: boolean;
      answer: string;
      sources: CodexWebSearchSource[];
      rawEvents?: CodexWebSearchRawEvent[];
      diagnostics?: CodexWebSearchDiagnostics;
    }
  | {
      ok: false;
      error: {
        code: CodexWebSearchFailureCode;
        message: string;
        retryable: boolean;
      };
      query?: string;
      mode?: "live" | "cached";
      diagnostics?: CodexWebSearchDiagnostics;
    };
```

Pi tool execution should still throw for failed tool calls, per the frozen Pi
contract above. This normalized union gives later runner/parser/formatter code a
stable internal shape before it becomes Pi `content` and `details`.

### Failure modes

The API reserves these failure codes for runner, parser, and formatter modules:

* `invalid_input`
* `codex_not_found`
* `codex_timeout`
* `codex_nonzero_exit`
* `codex_output_too_large`
* `codex_parse_error`
* `codex_missing_final_message`
* `codex_cancelled`
* `unknown_error`

Validation errors use structured issue codes and messages that do not echo the
query value.

## Safe Codex argv-builder contract

Ticket 004 implements `src/codex/buildCodexArgs.ts`. It exports
`buildCodexExecArgs(input)`, which accepts a `NormalizedCodexWebSearchInput` and
returns the arguments for the Codex executable. The returned array excludes the
binary name so `CodexRunner` can use a non-shell API such as:

```ts
execFile("codex", buildCodexExecArgs(input), options);
```

The default live-search argv shape is:

```text
["exec", "--json", "--search", "--skip-git-repo-check", "--sandbox", "read-only", "--", "<prompt>"]
```

The equivalent command-line display is:

```bash
codex exec --json --search --skip-git-repo-check --sandbox read-only -- "<prompt>"
```

Builder rules:

* always emit `exec` and `--json` for the currently supported JSONL path;
* emit `--search` only when normalized `mode` is `"live"`;
* emit `--skip-git-repo-check` when normalized `codex.skipGitRepoCheck` is true;
* always emit `--sandbox read-only` under the current safe sandbox allowlist;
* place the prompt after an end-of-options `--` separator so prompt text remains
  a positional argument even if it starts with dashes;
* reject unsupported output formats, unsafe sandbox overrides, inconsistent
  `mode`/`liveSearch` pairs, non-boolean `skipGitRepoCheck`, empty queries, and
  null bytes before a subprocess runner sees the argv.

The important frozen safety constraint is that user input must become one argv
array element, never a shell-interpolated command string.

## Codex subprocess-runner contract

Ticket 005 implements `src/codex/CodexRunner.ts`.

Runner defaults and seams:

* binary path defaults to `codex`;
* constructor-level `codexBinary` override is validated as a non-empty string
  without null bytes;
* the default executor is `node:child_process` `execFile`;
* tests can inject an `execFile`-compatible mock executor;
* tests can inject an argv builder, but production defaults to
  `buildCodexExecArgs`.

Process options passed by the runner:

* `encoding: "utf8"`;
* `timeoutMs` from normalized tool input;
* `maxBufferBytes` from normalized Codex execution options;
* `killSignal: "SIGTERM"`;
* `shell: false`;
* optional `AbortSignal` for cancellation.

Success result shape:

```ts
interface CodexRunnerRawResult {
  stdout: string;
  stderr: string;
  diagnostics: CodexWebSearchDiagnostics;
}
```

Structured failures are thrown as `CodexRunnerError` with these codes:

* `invalid_input` when normalized input cannot produce safe argv/options;
* `codex_not_found` for `ENOENT`;
* `codex_timeout` when `execFile` kills the process after the timeout;
* `codex_nonzero_exit` for non-zero status or signal failures;
* `codex_output_too_large` for `ERR_CHILD_PROCESS_STDIO_MAXBUFFER`;
* `codex_cancelled` for abort-signal cancellation;
* `codex_parse_error` from `runAndParse(...)` when an injected parser throws;
* `unknown_error` for remaining process failures.

Runner error messages must remain actionable but must not copy the argv array,
prompt/query text, or raw stderr. Bounded stderr is kept in diagnostics for later
formatter work.

`CodexRunner` intentionally does not parse JSONL events. `runAndParse(...)`
exists only to provide a parser injection seam when callers want runner-level
parse-failure wrapping.

## Codex JSONL-parser contract

Ticket 006 implements `src/codex/CodexJsonlParser.ts` for `codex exec --json`
stdout.

Primary exports:

* `parseCodexJsonlOutput(raw, options)` returns a parser-specific object with:
  * `answer`: the last completed agent/assistant message text;
  * `finalAgentMessage` and `agentMessages` metadata;
  * `webSearches`: lightweight summaries of web-search events when present;
  * `sources`: deduplicated HTTP(S) source/citation URLs when Codex provides
    annotations, sources, results, or action URLs;
  * optional `rawEvents` only when `includeRawEvents` is requested;
  * optional `diagnostics`, including stderr kept separately from answer text.
* `parseCodexJsonlToolResult(raw, input)` wraps the parsed output in the Ticket
  003 `CodexWebSearchNormalizedSuccess` shape for later formatter/registration
  code.
* `CodexJsonlParserError` uses stable codes:
  * `codex_parse_error` for malformed JSONL or JSONL records that are not
    objects;
  * `codex_missing_final_message` when no completed agent/assistant message is
    present.

Parser compatibility assumptions:

* current documented events such as `item.completed` with
  `item.type: "agent_message"` are supported;
* older/alternate completed-message aliases such as
  `item.item_type: "assistant_message"` and JSON-RPC-style
  `method: "item/completed"` with `params.item.type: "agentMessage"` are
  supported;
* web-search item aliases such as `web_search`, `webSearch`, and
  `web_search_call` are summarized when they include useful fields;
* unknown event types are ignored rather than treated as failures.

Parser errors intentionally do not echo raw JSONL line contents, query text, or
stderr in the error message. Stderr remains available in structured diagnostics
for future formatting.

## Safety requirements

* no shell command construction from query input;
* no reading, copying, or logging Codex credentials;
* no default write sandbox and no write-capable sandbox allowlist in Ticket 004;
* subprocess time and stdout/stderr buffers are bounded by Ticket 005;
* formatted Pi tool output remains a future Ticket 007 responsibility;
* automated tests must not invoke real Codex by default.
