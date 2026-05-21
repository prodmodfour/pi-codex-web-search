# BUILD_NOTES.md

## Current state

Tickets 000 through 008 are complete. The repository now has a TypeScript/npm Pi package skeleton, project-specific validation guardrails, a frozen Pi extension/package contract, the finalized `codex_web_search` tool API contract, a safe `codex exec` argv builder, a bounded Codex subprocess runner, a JSONL parser for `codex exec --json` stdout, a bounded formatter for Pi tool output, and Pi tool registration wiring.

Ticket 008 added in this cycle:

* created `src/pi/registerCodexWebSearchTool.ts`
* replaced the no-op extension entrypoint with `extensions/codex-web-search.ts` calling `registerCodexWebSearchTool(pi)`
* registered the `codex_web_search` tool with useful label, description, prompt snippet, and prompt guidelines that name the tool explicitly
* added `CODEX_WEB_SEARCH_TOOL_PARAMETERS`, a JSON-schema-compatible parameter schema matching the Ticket 003 API with defaults, bounds, and `additionalProperties: false`
* added `createCodexWebSearchToolDefinition(...)` and `executeCodexWebSearchTool(...)` for testable registration/execution wiring
* kept a narrow fake-runner seam through `CodexWebSearchToolRunner`; production defaults to `new CodexRunner()`
* normalized Pi-provided parameters before execution, passed the Pi `AbortSignal` through to the runner, parsed successful JSONL via `parseCodexJsonlToolResult(...)`, and formatted success output via `formatCodexWebSearchToolResult(...)`
* mapped validation, runner, parser, and unknown failures into normalized failures, formatted them, then threw `CodexWebSearchToolExecutionError` so Pi marks the tool call failed with a bounded sanitized message
* exported registration constants, helpers, and types from `src/index.ts`
* added `test/register-codex-web-search-tool.test.mjs` covering extension registration, schema/metadata, fake-runner success, invalid input, sanitized runner failure, and malformed JSONL failure
* updated README, `docs/ARCHITECTURE.md`, `docs/EXTENSION_SPEC.md`, and `docs/SECURITY.md` for the now-registered tool boundary and safety posture

No Codex live search, authenticated Codex run, or Codex task execution was used in this cycle.

## Quality gates

Ran `scripts/quality-gate.sh` successfully after implementing Ticket 008.

The passing gate performed:

* shell syntax checks through `scripts/check-shell-syntax.sh`
* secret guardrail through `scripts/check-no-secrets.sh`
* generated/private-file guardrail before Node checks
* `npm ci`
* `npm run lint --if-present`
* `npm run typecheck --if-present`
* `npm test --if-present` with 42 passing tests
* `npm run build --if-present`
* `npm run pack:check`
* cleanup of `node_modules/` created by the gate
* generated/private-file guardrail after cleanup

The npm package dry-run included the intended package files from `files`, including the new `src/pi/registerCodexWebSearchTool.ts`. `node_modules/` was removed by the gate before exit.

Before the final full gate, an initial quality-gate attempt failed because an ad-hoc local `npm ci` had left `node_modules/` present, triggering the generated/private-file guardrail. I removed `node_modules/` and reran the full quality gate successfully.

## Known blockers and limitations

None for automated quality validation.

The local Pi contract in `src/pi/piExtensionContract.ts` is intentionally narrow and mirrors only the subset frozen in `docs/EXTENSION_SPEC.md`. It should be replaced or reconciled explicitly if a future ticket imports official Pi runtime types or TypeBox schemas directly.

The extension now registers and can execute `codex_web_search`, but it does not yet provide optional slash-command help or user configuration. The current sandbox allowlist is intentionally limited to `read-only`; future configuration work must explicitly validate and document any override.

`CODEX_WEB_SEARCH_TOOL_PARAMETERS` is a plain JSON-schema-compatible object rather than a runtime import from `typebox` or `@earendil-works/pi-ai`. Local Pi validation supports this shape, and avoiding the import keeps automated tests independent of a local Pi install.

`CodexJsonlParser` supports documented and representative JSONL event aliases but cannot guarantee every future Codex event schema. Unknown events are ignored, and missing final completed agent messages are reported clearly as `codex_missing_final_message`.

`formatCodexWebSearchToolResult` and `CodexWebSearchToolExecutionError` intentionally omit raw stderr, query text, argv, and local/private paths from thrown tool-error messages. Safe diagnostic metadata remains available in formatted details.

`CodexRunner` can execute a real Codex binary through the registered tool, but automated tests only use mocked executors, JSONL fixtures, and fake runners. Manual real-Codex validation will require a machine with:

* Pi installed
* Codex CLI installed
* `codex login` completed with the user's ChatGPT/Codex account

## Next recommended ticket

Ticket 009 — Add optional Pi command/help surface.
