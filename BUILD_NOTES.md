# BUILD_NOTES.md

## Current state

Tickets 000, 001, 002, and 003 are complete. The repository has a TypeScript/npm Pi package skeleton, project-specific validation guardrails, a frozen Pi extension/package contract, and the finalized `codex_web_search` tool API contract.

Ticket 003 added in this cycle:

* created `src/tool/codexWebSearchApi.ts` with tool input types, normalized execution input, normalized success/failure result types, reserved failure codes, defaults, limits, and validation helpers
* exported the new API contract and validation functions from `src/index.ts`
* set the tool-call defaults to live mode, read-only sandbox, JSONL output, `--skip-git-repo-check` intent, 120s timeout, 2 MiB subprocess buffer, 12k formatted output chars, and `includeRawEvents: false`
* added validation for required trimmed `query`, `mode`, `timeoutMs`, `maxOutputChars`, `includeRawEvents`, unknown properties, and safe error messages that do not echo query values
* added `test/codex-web-search-api.test.mjs` plus a small TypeScript test loader helper so Node's built-in test runner can exercise the TypeScript validation module without calling real Codex
* updated README, `docs/EXTENSION_SPEC.md`, `docs/ARCHITECTURE.md`, and `docs/SECURITY.md` with the finalized API parameters, defaults, return shape, and failure modes

The placeholder extension still intentionally does not call Codex or register `codex_web_search`; later tickets own argv construction, the subprocess runner, JSONL parser, formatter, and final Pi registration.

No Codex live search, real Codex CLI invocation, or Codex authentication was used.

## Quality gates

Ran `scripts/quality-gate.sh` successfully after fixing the TypeScript test loader.

The passing gate performed:

* shell syntax checks through `scripts/check-shell-syntax.sh`
* secret guardrail through `scripts/check-no-secrets.sh`
* generated/private-file guardrail before Node checks
* `npm ci`
* `npm run lint --if-present`
* `npm run typecheck --if-present`
* `npm test --if-present`
* `npm run build --if-present`
* `npm run pack:check`
* cleanup of `node_modules/` created by the gate
* generated/private-file guardrail after cleanup

The npm package dry-run included the intended package files from `files`: README, docs, extension source, package metadata, Pi contract source, and the new tool API source. `node_modules/` was removed by the gate before exit.

## Known blockers and limitations

None for automated quality validation.

The local Pi contract in `src/pi/piExtensionContract.ts` is intentionally narrow and mirrors only the subset frozen in `docs/EXTENSION_SPEC.md`. It should be replaced or reconciled explicitly if a future ticket imports official Pi runtime types or TypeBox schemas directly.

The new API module performs validation only. It does not build Codex argv, spawn Codex, parse JSONL, format Pi results, register the Pi tool, or read any user configuration yet.

Manual real-Codex validation will require a machine with:

* Pi installed
* Codex CLI installed
* `codex login` completed with the user's ChatGPT/Codex account

## Next recommended ticket

Ticket 004 — Implement safe Codex argv builder.
