# Pi Codex Web Search Extension

`pi-codex-web-search` is a TypeScript Pi package scaffold for a future `codex_web_search` tool. The package is intended to let Pi call the local Codex CLI for web-enabled answers while relying on the user's existing Codex/ChatGPT authentication.

> Status: build in progress. The current package only exposes a safe, no-op placeholder extension entrypoint. It does **not** call Codex or register the final tool yet.

## Current package shape

```text
package.json                         # npm metadata plus the pi.extensions manifest
extensions/codex-web-search.ts       # placeholder Pi extension entrypoint
src/index.ts                         # shared package metadata constants
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

Pi loads TypeScript extensions through its extension runtime, so this scaffold ships TypeScript source rather than compiled JavaScript.

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
* executes `codex exec` with argv arrays, never shell-interpolated strings
* defaults to `codex exec --sandbox read-only`
* uses Codex `--search` only when live web search is requested
* bounds time, stdout, stderr, and returned Pi tool content
* parses or formats Codex output into concise Pi tool results

## Safety notes

This project must never read, copy, log, or commit Codex credentials such as `~/.codex/auth.json`. Authentication remains the Codex CLI's responsibility.

Automated tests must use mocks or fake executables. Real Codex validation belongs in `docs/MANUAL_VALIDATION.md` and requires a local user who has installed Codex and run `codex login`.
