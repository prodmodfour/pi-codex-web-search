# BUILD_NOTES.md

## Current state

Tickets 000 through 014 are complete. The repository now has a TypeScript/npm Pi package skeleton, project-specific validation guardrails, a frozen Pi extension/package contract, the finalized `codex_web_search` tool API contract, a safe `codex exec` argv builder, a bounded Codex subprocess runner, a JSONL parser for `codex exec --json` stdout, a bounded formatter for Pi tool output, Pi tool registration wiring, a small optional Pi slash-command help surface, safe configuration handling, a fake-Codex integration test harness, a manual real-Codex validation guide, user-facing installation/package documentation, and a security threat model.

Ticket 014 added in this cycle:

* rewrote `docs/SECURITY.md` as a threat model with scope, assets, trust boundaries, data flow, threats, implemented controls, residual risks, recommended safe defaults, validation posture, and a maintainer checklist
* documented subprocess safety, Codex sandbox/read-only limits, prompt-injection treatment for web results, credential handling, logs/artifacts, package-install/supply-chain risks, and safe operating defaults
* documented honest residual risks, including that Codex is an external executable, `read-only` is not the same as no-read, web results remain untrusted, configured binary overrides must be trusted, and manual validation logs may contain private data
* updated README to link to the full security threat model from the Safety notes section
* strengthened `includeRawEvents` help/schema text to warn that raw Codex events may contain prompt/result data
* added a regression assertion that the `/codex-web-search` help surface includes the raw-event data warning

No Codex live search, authenticated Codex run, real Codex CLI execution, Codex credential access, browser automation, or network research was used in this cycle. The threat-model review did not require changing the subprocess execution shape, sandbox allowlist, credential handling, or automated-test strategy.

## Quality gates

Ran `scripts/quality-gate.sh` successfully after implementing Ticket 014.

The passing gate performed:

* shell syntax checks through `scripts/check-shell-syntax.sh`
* secret guardrail through `scripts/check-no-secrets.sh`
* generated/private-file guardrail before Node checks
* `npm ci`
* `npm run lint --if-present`
* `npm run typecheck --if-present`
* `npm test --if-present` with 56 passing tests, including the fake-Codex executable integration tests and the updated help-text safety assertion
* `npm run build --if-present`
* `npm run pack:check`
* cleanup of `node_modules/` created by the gate
* generated/private-file guardrail after cleanup

The npm package dry-run included only the intended package files from the package `files` allowlist, including the expanded `docs/SECURITY.md`. Test fixtures are not shipped in the npm package. `node_modules/` was removed by the gate before exit.

## Known blockers and limitations

None for automated quality validation.

Manual real-Codex validation still requires a human machine with Pi installed, Codex CLI installed, `codex login` completed, a Pi model/provider configured, and network access. This remains an external manual activity; the repository documents the procedure but does not run it during the automated gate.

The security threat model is not a formal third-party audit. It documents current controls and residual risks for local single-user use.

Codex is still an external executable. A malicious `codex` binary, unsafe `PATH`, or unsafe `PI_CODEX_WEB_SEARCH_CODEX_BINARY` override can execute as the local user. Users should point overrides only at trusted Codex executables.

The Codex sandbox is still limited to `read-only`, but read-only is not a no-read guarantee. Codex may be able to read files permitted by its own sandbox policy and current working directory. Users should avoid launching Pi from highly sensitive directories when running live web search.

Web results remain untrusted. Prompt-injection risk cannot be eliminated by this extension; users and models should verify cited sources and avoid following instructions found in web pages.

The package is not documented as published to npm yet. The npm-style Pi commands are the intended source syntax once `pi-codex-web-search` is published under the expected name/version; local path and git source loading are documented for current validation.

The fake-Codex fixture is intentionally a deterministic test executable, not a Codex emulator. It validates the expected safe argv shape and covers representative success/failure cases, but real Codex JSONL schemas and authentication behavior still require the manual validation path.

The local Pi contract in `src/pi/piExtensionContract.ts` is intentionally narrow and mirrors only the subset frozen in `docs/EXTENSION_SPEC.md`. It should be replaced or reconciled explicitly if a future ticket imports official Pi runtime types or TypeBox schemas directly.

Configuration is intentionally limited to documented environment variables and explicit in-process/project config passed to registration helpers. There is no file-based project config reader, and no configuration path reads Codex credentials, `$HOME`, or arbitrary files.

The configured sandbox setting currently accepts only `read-only`. This is deliberate: write-capable Codex sandboxes remain out of scope until a future ticket explicitly proves they are necessary and safe.

The `/codex-web-search` command uses Pi's UI notification surface when available and no-ops in non-interactive contexts without `ctx.ui.notify(...)`. It is static help only and intentionally does not trigger a tool call, read live configuration, execute Codex, or inspect Codex credentials.

`CODEX_WEB_SEARCH_TOOL_PARAMETERS` is a plain JSON-schema-compatible object rather than a runtime import from `typebox` or `@earendil-works/pi-ai`. Local Pi validation supports this shape, and avoiding the import keeps automated tests independent of a local Pi install.

`CodexJsonlParser` supports documented and representative JSONL event aliases but cannot guarantee every future Codex event schema. Unknown events are ignored, and missing final completed agent messages are reported clearly as `codex_missing_final_message`.

`formatCodexWebSearchToolResult` and `CodexWebSearchToolExecutionError` intentionally omit raw stderr, query text, argv, and local/private paths from thrown tool-error messages. Safe diagnostic metadata remains available in formatted details. Raw events remain opt-in and bounded, but may still contain prompt/result data when explicitly requested.

`CodexRunner` can execute a real Codex binary through the registered tool, but automated tests only use mocked executors, JSONL fixtures, fake runners, and the checked-in fake Codex executable.

## Next recommended ticket

Ticket 015 — Add troubleshooting docs.
