# BUILD_NOTES.md

## Current state

Tickets 000 through 010 are complete. The repository now has a TypeScript/npm Pi package skeleton, project-specific validation guardrails, a frozen Pi extension/package contract, the finalized `codex_web_search` tool API contract, a safe `codex exec` argv builder, a bounded Codex subprocess runner, a JSONL parser for `codex exec --json` stdout, a bounded formatter for Pi tool output, Pi tool registration wiring, a small optional Pi slash-command help surface, and safe configuration handling.

Ticket 010 added in this cycle:

* added `src/config/codexWebSearchConfig.ts` for documented environment/project configuration loading and validation
* supported safe settings for Codex binary path, default mode, default timeout, default formatted output length, and sandbox
* documented environment variables:
  * `PI_CODEX_WEB_SEARCH_CODEX_BINARY`
  * `PI_CODEX_WEB_SEARCH_DEFAULT_MODE`
  * `PI_CODEX_WEB_SEARCH_TIMEOUT_MS`
  * `PI_CODEX_WEB_SEARCH_MAX_OUTPUT_CHARS`
  * `PI_CODEX_WEB_SEARCH_SANDBOX`
* implemented precedence as explicit project/in-process config over environment values over built-in defaults, with tool-call `mode`, `timeoutMs`, and `maxOutputChars` overriding configured defaults for that call
* kept the sandbox allowlist at `read-only` only; write-capable Codex sandboxes remain rejected
* wired validated configuration into Pi tool registration, schema defaults, input normalization, and the production `CodexRunner` binary path
* updated the help text to clarify that built-in defaults can be changed by documented environment variables without making the command read configuration
* exported config types/helpers from `src/index.ts`
* added unit coverage for config defaults, environment overrides, explicit project overrides, invalid values, no credential-path reads, configured tool defaults, tool-call precedence, and invalid config registration failures
* updated README, architecture, extension spec, usage, security, and troubleshooting docs with the new settings and safety posture

No Codex live search, authenticated Codex run, Codex task execution, Codex credential access, or browser automation was used in this cycle.

## Quality gates

Ran `scripts/quality-gate.sh` successfully after implementing Ticket 010.

The passing gate performed:

* shell syntax checks through `scripts/check-shell-syntax.sh`
* secret guardrail through `scripts/check-no-secrets.sh`
* generated/private-file guardrail before Node checks
* `npm ci`
* `npm run lint --if-present`
* `npm run typecheck --if-present`
* `npm test --if-present` with 51 passing tests
* `npm run build --if-present`
* `npm run pack:check`
* cleanup of `node_modules/` created by the gate
* generated/private-file guardrail after cleanup

The npm package dry-run included the intended package files from `files`, including the new `src/config/codexWebSearchConfig.ts`. `node_modules/` was removed by the gate before exit.

## Known blockers and limitations

None for automated quality validation.

The local Pi contract in `src/pi/piExtensionContract.ts` is intentionally narrow and mirrors only the subset frozen in `docs/EXTENSION_SPEC.md`. It should be replaced or reconciled explicitly if a future ticket imports official Pi runtime types or TypeBox schemas directly.

Configuration is intentionally limited to documented environment variables and explicit in-process/project config passed to registration helpers. There is no file-based project config reader, and no configuration path reads Codex credentials, `$HOME`, or arbitrary files.

The configured sandbox setting currently accepts only `read-only`. This is deliberate: write-capable Codex sandboxes remain out of scope until a future ticket explicitly proves they are necessary and safe.

The `/codex-web-search` command uses Pi's UI notification surface when available and no-ops in non-interactive contexts without `ctx.ui.notify(...)`. It is static help only and intentionally does not trigger a tool call, read live configuration, execute Codex, or inspect Codex credentials.

`CODEX_WEB_SEARCH_TOOL_PARAMETERS` is a plain JSON-schema-compatible object rather than a runtime import from `typebox` or `@earendil-works/pi-ai`. Local Pi validation supports this shape, and avoiding the import keeps automated tests independent of a local Pi install.

`CodexJsonlParser` supports documented and representative JSONL event aliases but cannot guarantee every future Codex event schema. Unknown events are ignored, and missing final completed agent messages are reported clearly as `codex_missing_final_message`.

`formatCodexWebSearchToolResult` and `CodexWebSearchToolExecutionError` intentionally omit raw stderr, query text, argv, and local/private paths from thrown tool-error messages. Safe diagnostic metadata remains available in formatted details.

`CodexRunner` can execute a real Codex binary through the registered tool, but automated tests only use mocked executors, JSONL fixtures, and fake runners. Manual real-Codex validation will require a machine with:

* Pi installed
* Codex CLI installed
* `codex login` completed with the user's ChatGPT/Codex account

## Next recommended ticket

Ticket 011 — Add fake-Codex integration test harness.
