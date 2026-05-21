# BUILD_NOTES.md

## Current state

Tickets 000, 001, 002, 003, 004, and 005 are complete. The repository has a TypeScript/npm Pi package skeleton, project-specific validation guardrails, a frozen Pi extension/package contract, the finalized `codex_web_search` tool API contract, a safe `codex exec` argv builder, and a bounded Codex subprocess runner.

Ticket 005 added in this cycle:

* created `src/codex/CodexRunner.ts` with an `execFile`-based runner that defaults to the PATH-resolved `codex` binary
* kept Codex invocation as binary plus argv array and set executor options with `shell: false`
* passed normalized `timeoutMs` and `codex.maxBufferBytes` into the process layer, with `SIGTERM` as the timeout kill signal
* added constructor seams for a validated `codexBinary` override, mocked `execFile`, and mocked argv builder
* added `CodexRunnerError` with structured codes for invalid input, missing binary, timeout, non-zero exit/signal, output too large, cancellation, parser failure, and unknown process failure
* added `runAndParse(...)` only as a parser-injection seam so future JSONL parser failures can be wrapped as `codex_parse_error`; no JSONL parser was implemented in this ticket
* kept runner error messages from copying argv, query text, or raw stderr; bounded stderr remains available in diagnostics
* exported the runner contracts from `src/index.ts`
* added `test/codex-runner.test.mjs` and `test/helpers/load-ts-project-module.mjs` so subprocess behavior is tested entirely with mocked process execution
* updated README, `docs/ARCHITECTURE.md`, `docs/EXTENSION_SPEC.md`, and `docs/SECURITY.md` to document the runner boundary and safety posture

The placeholder extension still intentionally does not call Codex or register `codex_web_search`; later tickets own the JSONL parser, tool-result formatter, and final Pi registration.

No Codex live search, authenticated Codex run, or Codex task execution was used.

## Quality gates

Ran `scripts/quality-gate.sh` successfully after implementing Ticket 005.

The passing gate performed:

* shell syntax checks through `scripts/check-shell-syntax.sh`
* secret guardrail through `scripts/check-no-secrets.sh`
* generated/private-file guardrail before Node checks
* `npm ci`
* `npm run lint --if-present`
* `npm run typecheck --if-present`
* `npm test --if-present` with 26 passing tests
* `npm run build --if-present`
* `npm run pack:check`
* cleanup of `node_modules/` created by the gate
* generated/private-file guardrail after cleanup

The npm package dry-run included the intended package files from `files`: README, docs, extension source, package metadata, Pi contract source, tool API source, Codex argv-builder source, and the new Codex runner source. `node_modules/` was removed by the gate before exit.

## Known blockers and limitations

None for automated quality validation.

The local Pi contract in `src/pi/piExtensionContract.ts` is intentionally narrow and mirrors only the subset frozen in `docs/EXTENSION_SPEC.md`. It should be replaced or reconciled explicitly if a future ticket imports official Pi runtime types or TypeBox schemas directly.

The API, argv builder, and runner still do not parse Codex JSONL, format Pi results, register the Pi tool, or read user configuration. The current sandbox allowlist is intentionally limited to `read-only`; future configuration work must explicitly validate and document any override.

`CodexRunner` can execute a real Codex binary when called directly by future code, but automated tests only use mocked executors. Manual real-Codex validation will require a machine with:

* Pi installed
* Codex CLI installed
* `codex login` completed with the user's ChatGPT/Codex account

## Next recommended ticket

Ticket 006 — Add JSONL parser for `codex exec --json`.
