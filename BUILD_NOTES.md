# BUILD_NOTES.md

## Current state

Tickets 000 through 009 are complete. The repository now has a TypeScript/npm Pi package skeleton, project-specific validation guardrails, a frozen Pi extension/package contract, the finalized `codex_web_search` tool API contract, a safe `codex exec` argv builder, a bounded Codex subprocess runner, a JSONL parser for `codex exec --json` stdout, a bounded formatter for Pi tool output, Pi tool registration wiring, and a small optional Pi slash-command help surface.

Ticket 009 added in this cycle:

* reviewed the local Pi `docs/extensions.md`, command examples, and exported declaration files for the current `registerCommand` contract
* added `src/pi/registerCodexWebSearchHelpCommand.ts`
* registered `/codex-web-search` from `extensions/codex-web-search.ts` alongside the existing `codex_web_search` tool
* added static bounded help text covering the tool purpose, parameters, defaults, read-only live-search invocation shape, Codex login prerequisite, and credential-handling reminder
* kept the command informational only: it ignores arguments, does not execute Codex, does not read configuration, and does not inspect Codex credentials
* added a minimal `ctx.ui.notify(...)` shape to the local Pi contract for command tests
* exported help-command constants/helpers from `src/index.ts`
* updated tests to cover command registration, help notification output, and no-op behavior when no interactive UI is available
* updated README, `docs/ARCHITECTURE.md`, `docs/EXTENSION_SPEC.md`, `docs/SECURITY.md`, and `docs/USAGE.md` for the new help surface

No Codex live search, authenticated Codex run, or Codex task execution was used in this cycle.

## Quality gates

Ran `scripts/quality-gate.sh` successfully after implementing Ticket 009.

The passing gate performed:

* shell syntax checks through `scripts/check-shell-syntax.sh`
* secret guardrail through `scripts/check-no-secrets.sh`
* generated/private-file guardrail before Node checks
* `npm ci`
* `npm run lint --if-present`
* `npm run typecheck --if-present`
* `npm test --if-present` with 44 passing tests
* `npm run build --if-present`
* `npm run pack:check`
* cleanup of `node_modules/` created by the gate
* generated/private-file guardrail after cleanup

The npm package dry-run included the intended package files from `files`, including the new `src/pi/registerCodexWebSearchHelpCommand.ts`. `node_modules/` was removed by the gate before exit.

## Known blockers and limitations

None for automated quality validation.

The local Pi contract in `src/pi/piExtensionContract.ts` is intentionally narrow and mirrors only the subset frozen in `docs/EXTENSION_SPEC.md`. It should be replaced or reconciled explicitly if a future ticket imports official Pi runtime types or TypeBox schemas directly.

The `/codex-web-search` command uses Pi's UI notification surface when available and no-ops in non-interactive contexts without `ctx.ui.notify(...)`. It is static help only and intentionally does not trigger a tool call or execute Codex.

The extension now registers and can execute `codex_web_search`, but it does not yet provide user configuration. The current sandbox allowlist is intentionally limited to `read-only`; future configuration work must explicitly validate and document any override.

`CODEX_WEB_SEARCH_TOOL_PARAMETERS` is a plain JSON-schema-compatible object rather than a runtime import from `typebox` or `@earendil-works/pi-ai`. Local Pi validation supports this shape, and avoiding the import keeps automated tests independent of a local Pi install.

`CodexJsonlParser` supports documented and representative JSONL event aliases but cannot guarantee every future Codex event schema. Unknown events are ignored, and missing final completed agent messages are reported clearly as `codex_missing_final_message`.

`formatCodexWebSearchToolResult` and `CodexWebSearchToolExecutionError` intentionally omit raw stderr, query text, argv, and local/private paths from thrown tool-error messages. Safe diagnostic metadata remains available in formatted details.

`CodexRunner` can execute a real Codex binary through the registered tool, but automated tests only use mocked executors, JSONL fixtures, and fake runners. Manual real-Codex validation will require a machine with:

* Pi installed
* Codex CLI installed
* `codex login` completed with the user's ChatGPT/Codex account

## Next recommended ticket

Ticket 010 — Add configuration handling.
