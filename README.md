# Pi Codex Web Search Extension

`pi-codex-web-search` is a TypeScript Pi package scaffold for a future `codex_web_search` tool. The package is intended to let Pi call the local Codex CLI for web-enabled answers while relying on the user's existing Codex/ChatGPT authentication.

> Status: build in progress. The current package exposes a safe, no-op placeholder extension entrypoint, the typed/validated `codex_web_search` API contract, a safe `codex exec` argv builder, a bounded Codex subprocess runner, and a JSONL parser for `codex exec --json` output. The placeholder Pi extension still does **not** call Codex or register the final Pi tool yet.

## Current package shape

```text
package.json                         # npm metadata plus the pi.extensions manifest
extensions/codex-web-search.ts       # placeholder Pi extension entrypoint
src/index.ts                         # shared package metadata and exported API/argv contracts
src/tool/codexWebSearchApi.ts        # codex_web_search input/result types and validation
src/codex/buildCodexArgs.ts          # safe codex exec argv construction
src/codex/CodexRunner.ts             # execFile-based Codex subprocess runner
src/codex/CodexJsonlParser.ts        # parser for codex exec --json JSONL events
test/package-shape.test.mjs          # smoke tests for the package skeleton
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

Install Node.js 20+ and npm. Pi and Codex are only needed for later manual validation; automated checks for this scaffold do not require a real Codex login.

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

## Intended final behavior

Later tickets will replace the placeholder with a Pi tool named `codex_web_search` that:

* validates user input before invoking Codex
* accepts `query`, optional `mode`, `timeoutMs`, `maxOutputChars`, and `includeRawEvents`
* defaults `mode` to `live`, read-only Codex sandbox, JSONL output, 120s timeout, 2 MiB subprocess buffer, and 12k formatted output chars
* executes `codex exec` with argv arrays, never shell-interpolated strings
* uses Codex `--search` only when normalized mode is `live`
* passes the prompt after an end-of-options `--` separator so prompt text stays positional even when it starts with dashes
* bounds subprocess time and stdout/stderr buffers with `execFile` options
* maps missing binary, timeout, non-zero exit, oversized output, cancellation, and parser failures to structured errors
* parses `codex exec --json` JSONL, using the last completed agent message as the answer and preserving stderr diagnostics separately
* bounds returned Pi tool content
* formats parsed Codex output into concise Pi tool results

## Safety notes

This project must never read, copy, log, or commit Codex credentials such as `~/.codex/auth.json`. Authentication remains the Codex CLI's responsibility.

The current argv builder returns arguments for `CodexRunner`, which calls the configured Codex executable with `execFile` and `shell: false`. Its default live-search shape is:

```text
["exec", "--json", "--search", "--skip-git-repo-check", "--sandbox", "read-only", "--", query]
```

`mode: "cached"` omits `--search`; `skipGitRepoCheck: false` omits `--skip-git-repo-check`. The only currently allowed sandbox value is `read-only`.

`CodexRunner` defaults to the PATH-resolved `codex` binary, but accepts a validated `codexBinary` override for future configuration work. It passes the normalized timeout and max-buffer limits to `execFile` and keeps process errors structured without copying argv or query text into error messages.

`CodexJsonlParser` parses only stdout JSONL records, tolerates unknown event types, captures web-search summaries when Codex emits them, and keeps stderr in diagnostics rather than mixing it into the answer text. Malformed JSONL and missing final-agent-message cases use structured parser errors.

Automated tests must use mocks or fake executables. Real Codex validation belongs in `docs/MANUAL_VALIDATION.md` and requires a local user who has installed Codex and run `codex login`.
