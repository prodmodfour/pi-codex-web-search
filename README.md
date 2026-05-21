# Pi Codex Web Search Extension

`pi-codex-web-search` is a TypeScript Pi package for a `codex_web_search` tool. The package is intended to let Pi call the local Codex CLI for web-enabled answers while relying on the user's existing Codex/ChatGPT authentication.

> Status: build in progress. The current package registers `codex_web_search` plus a `/codex-web-search` help command, validates tool parameters and safe configuration, runs the bounded Codex subprocess pipeline, parses `codex exec --json` output, formats concise Pi tool results, and covers the path with a fake-Codex executable integration harness. Full manual real-Codex validation docs are still a future ticket.

## Current package shape

```text
package.json                         # npm metadata plus the pi.extensions manifest
extensions/codex-web-search.ts       # Pi extension entrypoint that registers codex_web_search
src/index.ts                         # shared package metadata and exported API/argv/registration contracts
src/tool/codexWebSearchApi.ts        # codex_web_search input/result types and validation
src/config/codexWebSearchConfig.ts   # documented env/project config loading and validation
src/codex/buildCodexArgs.ts          # safe codex exec argv construction
src/codex/CodexRunner.ts             # execFile-based Codex subprocess runner
src/codex/CodexJsonlParser.ts        # parser for codex exec --json JSONL events
src/output/formatToolResult.ts            # bounded Pi tool-result formatting
src/pi/registerCodexWebSearchHelpCommand.ts # optional /codex-web-search help command
src/pi/registerCodexWebSearchTool.ts      # Pi tool registration and execution wiring
test/package-shape.test.mjs               # smoke tests for the package skeleton
test/fake-codex-integration.test.mjs      # fake Codex executable integration coverage
test/fixtures/fake-codex.mjs              # deterministic fake codex exec fixture
docs/                                # design, security, usage, validation, and quality-gate notes
scripts/quality-gate.sh              # local validation gate used by the build loop
```

The Pi manifest currently points to the TypeScript entrypoint:

```json
{
  "pi": {
    "extensions": ["./extensions/codex-web-search.ts"]
  }
}
```

Pi loads TypeScript extensions through its extension runtime, so this scaffold ships TypeScript source rather than compiled JavaScript. The frozen Pi extension/package assumptions for this build are documented in [`docs/EXTENSION_SPEC.md`](docs/EXTENSION_SPEC.md).

## Development prerequisites

Install Node.js 20+ and npm. Pi and Codex are only needed for later manual validation; automated checks use mocks and a fake Codex executable fixture and do not require a real Codex login.

```bash
npm install
npm run typecheck
npm test
npm run pack:check
```

Run the repository quality gate before committing changes:

```bash
scripts/quality-gate.sh
# or
npm run quality
```

The gate runs shell syntax checks, secret and generated-file guardrails, npm validation scripts, and a package dry-run. See [`docs/QUALITY_GATE.md`](docs/QUALITY_GATE.md) for the full checklist.

## Current tool behavior

The extension registers a Pi tool named `codex_web_search` that:

* validates user input and documented configuration before invoking Codex
* accepts `query`, optional `mode`, `timeoutMs`, `maxOutputChars`, and `includeRawEvents`
* defaults `mode` to `live`, Codex binary to `codex`, read-only Codex sandbox, JSONL output, 120s timeout, 2 MiB subprocess buffer, and 12k formatted output chars
* executes `codex exec` with argv arrays, never shell-interpolated strings
* uses Codex `--search` only when normalized mode is `live`
* passes the prompt after an end-of-options `--` separator so prompt text stays positional even when it starts with dashes
* bounds subprocess time and stdout/stderr buffers with `execFile` options
* maps missing binary, timeout, non-zero exit, oversized output, cancellation, and parser failures to structured errors
* parses `codex exec --json` JSONL, using the last completed agent message as the answer and preserving stderr diagnostics separately
* formats parsed Codex output into concise Pi tool results with source URLs/snippets when available
* bounds returned Pi tool text with a truncation notice
* throws sanitized Pi tool failures for invalid input, missing Codex, timeout, non-zero exit, oversized output, cancellation, parser failures, or unknown errors

## Configuration

The package entrypoint reads only these documented environment variables. Explicit in-process/project config passed to `registerCodexWebSearchTool(pi, { config })` takes precedence over environment values; tool-call parameters still take precedence over configured defaults for `mode`, `timeoutMs`, and `maxOutputChars`.

| Setting | Environment variable | Default | Validation |
| --- | --- | --- | --- |
| Codex binary | `PI_CODEX_WEB_SEARCH_CODEX_BINARY` | `codex` | non-empty string without null bytes |
| Default mode | `PI_CODEX_WEB_SEARCH_DEFAULT_MODE` | `live` | `live` or `cached` |
| Default timeout | `PI_CODEX_WEB_SEARCH_TIMEOUT_MS` | `120000` | integer from `1000` to `300000` |
| Default max output | `PI_CODEX_WEB_SEARCH_MAX_OUTPUT_CHARS` | `12000` | integer from `500` to `50000` |
| Sandbox | `PI_CODEX_WEB_SEARCH_SANDBOX` | `read-only` | currently only `read-only` |

The configuration layer does not read Codex credentials, `~/.codex/auth.json`, `$HOME`, or arbitrary config files.

## Help command

When loaded in Pi, the extension also registers `/codex-web-search`. The command displays concise usage help for `codex_web_search`, including parameters, defaults, the read-only live-search invocation shape, and the reminder that the extension never reads Codex credential files. It is informational only and does not execute Codex.

## Safety notes

This project must never read, copy, log, or commit Codex credentials such as `~/.codex/auth.json`. Authentication remains the Codex CLI's responsibility.

The current argv builder returns arguments for `CodexRunner`, which calls the configured Codex executable with `execFile` and `shell: false`. Its default live-search shape is:

```text
["exec", "--json", "--search", "--skip-git-repo-check", "--sandbox", "read-only", "--", query]
```

`mode: "cached"` omits `--search`; `skipGitRepoCheck: false` omits `--skip-git-repo-check`. The only currently allowed sandbox value is `read-only`.

`CodexRunner` defaults to the PATH-resolved `codex` binary unless the validated configuration supplies `PI_CODEX_WEB_SEARCH_CODEX_BINARY` or an explicit project config override. It passes the normalized timeout and max-buffer limits to `execFile` and keeps process errors structured without copying argv or query text into error messages.

`CodexJsonlParser` parses only stdout JSONL records, tolerates unknown event types, captures web-search summaries when Codex emits them, and keeps stderr in diagnostics rather than mixing it into the answer text. Malformed JSONL and missing final-agent-message cases use structured parser errors.

`formatCodexWebSearchToolResult` converts normalized success/failure results into Pi text content plus structured details. The formatter includes source URLs/snippets when available, enforces `maxOutputChars`, adds a truncation notice, and omits raw stderr/query text from user-facing error output.

Automated tests use mocks or the deterministic fake executable under `test/fixtures/fake-codex.mjs`. Real Codex validation belongs in `docs/MANUAL_VALIDATION.md` and requires a local user who has installed Codex and run `codex login`.
