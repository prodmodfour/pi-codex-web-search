# Extension Spec

## Scope

This document freezes the Pi extension/package contract that this package targets.
It does **not** implement Codex execution or finalize the `codex_web_search` tool
input schema; later tickets own those pieces.

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

## Draft parameters for later tickets

Ticket 003 will finalize and test the tool API. The current draft remains:

```ts
interface CodexWebSearchInput {
  query: string;
  mode?: "live" | "cached";
  timeoutMs?: number;
  maxOutputChars?: number;
  includeRawEvents?: boolean;
}
```

Conservative defaults still expected for later tickets:

```text
sandbox: read-only
codex binary: codex
timeoutMs: 120000
maxOutputChars: 12000
includeRawEvents: false
```

## Future Codex command shape

Later tickets will implement safe argv construction and subprocess execution.
The expected live-search argv shape remains:

```bash
codex exec --json --search --skip-git-repo-check --sandbox read-only "<prompt>"
```

The important frozen safety constraint is that user input must become an argv
array element, never a shell-interpolated command string.

## Safety requirements

* no Codex execution in this ticket;
* no shell command construction from query input;
* no reading, copying, or logging Codex credentials;
* no default write sandbox;
* bounded output in future runner/formatter tickets;
* automated tests must not invoke real Codex by default.
