# BUILD_NOTES.md

## Current state

Tickets 000 through 007 are complete. The repository now has a TypeScript/npm Pi package skeleton, project-specific validation guardrails, a frozen Pi extension/package contract, the finalized `codex_web_search` tool API contract, a safe `codex exec` argv builder, a bounded Codex subprocess runner, a JSONL parser for `codex exec --json` stdout, and a bounded formatter that turns normalized Codex results into Pi-style tool output.

Ticket 007 added in this cycle:

* created `src/output/formatToolResult.ts`
* added `formatCodexWebSearchToolResult(...)` to produce one Pi text content item plus structured details from the normalized success/failure union
* added `boundCodexWebSearchToolText(...)` for shared/testable truncation behavior
* added formatter-specific caps for source display and raw-event details through `CODEX_WEB_SEARCH_FORMAT_LIMITS`
* formatted successful answers concisely by default, with a clear empty-answer fallback
* included a `Sources:` section with source URLs, titles, and snippets when parsed events provide them
* enforced `maxOutputChars` with the Ticket 003 bounds and an explicit truncation notice
* mapped structured failure codes to actionable, sanitized messages without copying raw stderr, query text, argv, or local/private paths into model-facing output
* preserved only safe diagnostics in formatted details: byte counts, exit code, signal, truncation flag, and an `stderrOmitted` marker
* bounded raw JSONL events in structured details when they are explicitly present in the normalized result
* exported formatter functions, constants, and types from `src/index.ts`
* added `test/format-tool-result.test.mjs` for normal, empty, huge/truncated, and error-output cases
* updated README, `docs/ARCHITECTURE.md`, `docs/EXTENSION_SPEC.md`, and `docs/SECURITY.md` for the formatter boundary and safety posture

The placeholder extension still intentionally does not call Codex or register `codex_web_search`; Ticket 008 owns final Pi tool registration and wiring.

No Codex live search, authenticated Codex run, or Codex task execution was used in this cycle.

## Quality gates

Ran `scripts/quality-gate.sh` successfully after implementing Ticket 007.

The passing gate performed:

* shell syntax checks through `scripts/check-shell-syntax.sh`
* secret guardrail through `scripts/check-no-secrets.sh`
* generated/private-file guardrail before Node checks
* `npm ci`
* `npm run lint --if-present`
* `npm run typecheck --if-present`
* `npm test --if-present` with 37 passing tests
* `npm run build --if-present`
* `npm run pack:check`
* cleanup of `node_modules/` created by the gate
* generated/private-file guardrail after cleanup

The npm package dry-run included the intended package files from `files`, including the new `src/output/formatToolResult.ts`. `node_modules/` was removed by the gate before exit.

Before the full gate, an ad-hoc `npm test` attempt failed because dependencies were not installed locally; after `npm ci`, the test suite passed. `node_modules/` was removed before running the final quality gate.

## Known blockers and limitations

None for automated quality validation.

The local Pi contract in `src/pi/piExtensionContract.ts` is intentionally narrow and mirrors only the subset frozen in `docs/EXTENSION_SPEC.md`. It should be replaced or reconciled explicitly if a future ticket imports official Pi runtime types or TypeBox schemas directly.

The API, argv builder, runner, parser, and formatter still do not register the Pi tool or read user configuration. The current sandbox allowlist is intentionally limited to `read-only`; future configuration work must explicitly validate and document any override.

`CodexJsonlParser` supports documented and representative JSONL event aliases but cannot guarantee every future Codex event schema. Unknown events are ignored, and missing final completed agent messages are reported clearly as `codex_missing_final_message`.

`formatCodexWebSearchToolResult` intentionally omits raw stderr from formatted text/details to avoid leaking local environment details. It keeps safe byte-count and status metadata, so users may need to run Codex manually for deeper diagnostics until future docs/configuration tickets add a manual validation path.

`CodexRunner` can execute a real Codex binary when called directly by future code, but automated tests only use mocked executors and JSONL fixtures. Manual real-Codex validation will require a machine with:

* Pi installed
* Codex CLI installed
* `codex login` completed with the user's ChatGPT/Codex account

## Next recommended ticket

Ticket 008 — Register the Pi tool.
