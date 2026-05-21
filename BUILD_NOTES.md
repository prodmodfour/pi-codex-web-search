# BUILD_NOTES.md

## Current state

Tickets 000 through 012 are complete. The repository now has a TypeScript/npm Pi package skeleton, project-specific validation guardrails, a frozen Pi extension/package contract, the finalized `codex_web_search` tool API contract, a safe `codex exec` argv builder, a bounded Codex subprocess runner, a JSONL parser for `codex exec --json` stdout, a bounded formatter for Pi tool output, Pi tool registration wiring, a small optional Pi slash-command help surface, safe configuration handling, a fake-Codex integration test harness, and a manual real-Codex validation guide.

Ticket 012 added in this cycle:

* expanded `docs/MANUAL_VALIDATION.md` from a scaffold into a step-by-step human validation guide for machines with Pi, Codex CLI, user authentication, and network access
* documented Codex setup commands, including `npm install -g @openai/codex` and `codex login`
* documented a direct `codex exec --search --skip-git-repo-check --sandbox read-only ...` smoke test before loading Pi
* documented temporary `pi -e` loading and project-local `pi install -l` loading for the local package
* added expected output shapes for the direct Codex smoke test, `/codex-web-search` help command, and live `codex_web_search` Pi tool call
* added manual troubleshooting notes for missing Codex, unauthenticated Codex, disabled web search or cached/live confusion, network failures, and timeouts
* added repeated reminders not to inspect, share, upload, or commit `~/.codex/auth.json` or private validation logs
* updated README status text to point at the manual validation guide instead of calling it a future ticket

No Codex live search, authenticated Codex run, real Codex CLI execution, Codex credential access, browser automation, or network research was used in this cycle. The new guide documents how a human can run those checks manually, but automated validation remains fake-Codex/mocked by default.

## Quality gates

Ran `scripts/quality-gate.sh` successfully after implementing Ticket 012.

The passing gate performed:

* shell syntax checks through `scripts/check-shell-syntax.sh`
* secret guardrail through `scripts/check-no-secrets.sh`
* generated/private-file guardrail before Node checks
* `npm ci`
* `npm run lint --if-present`
* `npm run typecheck --if-present`
* `npm test --if-present` with 56 passing tests, including the fake-Codex executable integration tests
* `npm run build --if-present`
* `npm run pack:check`
* cleanup of `node_modules/` created by the gate
* generated/private-file guardrail after cleanup

The npm package dry-run included only the intended package files from the package `files` allowlist. Test fixtures are not shipped in the npm package. `node_modules/` was removed by the gate before exit.

## Known blockers and limitations

None for automated quality validation.

Manual real-Codex validation still requires a human machine with Pi installed, Codex CLI installed, `codex login` completed, a Pi model/provider configured, and network access. This remains an external manual activity; the repository now documents the procedure but does not run it during the automated gate.

The fake-Codex fixture is intentionally a deterministic test executable, not a Codex emulator. It validates the expected safe argv shape and covers representative success/failure cases, but real Codex JSONL schemas and authentication behavior still require the manual validation path.

The local Pi contract in `src/pi/piExtensionContract.ts` is intentionally narrow and mirrors only the subset frozen in `docs/EXTENSION_SPEC.md`. It should be replaced or reconciled explicitly if a future ticket imports official Pi runtime types or TypeBox schemas directly.

Configuration is intentionally limited to documented environment variables and explicit in-process/project config passed to registration helpers. There is no file-based project config reader, and no configuration path reads Codex credentials, `$HOME`, or arbitrary files.

The configured sandbox setting currently accepts only `read-only`. This is deliberate: write-capable Codex sandboxes remain out of scope until a future ticket explicitly proves they are necessary and safe.

The `/codex-web-search` command uses Pi's UI notification surface when available and no-ops in non-interactive contexts without `ctx.ui.notify(...)`. It is static help only and intentionally does not trigger a tool call, read live configuration, execute Codex, or inspect Codex credentials.

`CODEX_WEB_SEARCH_TOOL_PARAMETERS` is a plain JSON-schema-compatible object rather than a runtime import from `typebox` or `@earendil-works/pi-ai`. Local Pi validation supports this shape, and avoiding the import keeps automated tests independent of a local Pi install.

`CodexJsonlParser` supports documented and representative JSONL event aliases but cannot guarantee every future Codex event schema. Unknown events are ignored, and missing final completed agent messages are reported clearly as `codex_missing_final_message`.

`formatCodexWebSearchToolResult` and `CodexWebSearchToolExecutionError` intentionally omit raw stderr, query text, argv, and local/private paths from thrown tool-error messages. Safe diagnostic metadata remains available in formatted details.

`CodexRunner` can execute a real Codex binary through the registered tool, but automated tests only use mocked executors, JSONL fixtures, fake runners, and the checked-in fake Codex executable.

## Next recommended ticket

Ticket 013 — Add installation and package docs.
