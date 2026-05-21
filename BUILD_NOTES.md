# BUILD_NOTES.md

## Current state

Tickets 000 through 018 are complete. The repository now has a TypeScript/npm Pi package skeleton, project-specific validation guardrails, a frozen Pi extension/package contract, the finalized `codex_web_search` tool API contract, a safe `codex exec` argv builder, a bounded Codex subprocess runner, a JSONL parser for `codex exec --json` stdout, a bounded formatter for Pi tool output, Pi tool registration wiring, a small optional Pi slash-command help surface, safe configuration handling, a fake-Codex integration test harness, a manual real-Codex validation guide, user-facing installation/package documentation, a security threat model, expanded troubleshooting guidance, release/package-content validation, a GitHub Actions quality workflow, and a docs-only local Pi project fixture.

Ticket 018 added in this cycle:

* added `docs/EXAMPLE_LOCAL_PI_PROJECT.md`, a docs-only throwaway local Pi project fixture showing a sample workspace tree, project-local `pi install -l` command, expected `.pi/settings.json` package entry, `/codex-web-search` help check, sample user prompt, and expected `codex_web_search` invocation behavior
* documented that the fixture is not a real checked-in `.pi/` project and that automated tests must not run Pi, Codex, live web search, or network calls from the example
* linked the fixture from README, `docs/INSTALLATION.md`, `docs/USAGE.md`, and `docs/MANUAL_VALIDATION.md`
* updated package-content validation so the new fixture doc is required in npm dry-run contents
* added automated documentation-shape coverage that reads the fixture and verifies the expected package-loading, prompt, invocation, and no-real-external-calls wording without executing Pi or Codex

No Codex live search, authenticated Codex run, real Codex CLI execution, Codex credential access, browser automation, or network research was used in this cycle. The ticket was focused on a documentation-only example fixture and automated checks that only read repository files.

## Quality gates

Ran `scripts/quality-gate.sh` successfully after implementing Ticket 018.

The passing gate performed:

* shell syntax checks through `scripts/check-shell-syntax.sh`
* secret guardrail through `scripts/check-no-secrets.sh`
* generated/private-file guardrail before Node checks
* `npm ci`
* `npm run lint --if-present`
* `npm run typecheck --if-present`
* `npm test --if-present` with 62 passing tests, including the new docs-only local Pi project fixture coverage
* `npm run build --if-present`
* `npm run pack:check`, which ran the package-content validator and confirmed the npm dry-run would ship the intended 23 runtime/docs files including `docs/EXAMPLE_LOCAL_PI_PROJECT.md`
* cleanup of `node_modules/` created by the gate
* generated/private-file guardrail after cleanup

The validated package dry-run now includes only the intended `package.json`, `README.md`, `docs/`, `extensions/`, and `src/` contents. The new local Pi project fixture is Markdown under `docs/`; no real `.pi/` directory, package cache, session files, logs, test fixtures, shell scripts, autonomous build notes, dependency directories, generated output, package tarballs, or private/auth files are included in the npm dry-run contents.

## Known blockers and limitations

None for automated quality validation.

The local Pi project fixture is documentation only. It does not prove that a real Pi installation can load the package, that a model will choose the tool, or that real Codex web search works on a user's machine. Manual real-Codex/Pi validation still requires a human machine with Pi installed, Codex CLI installed, `codex login` completed, a Pi model/provider configured, and network access.

GitHub Actions CI runs the local quality gate on hosted Ubuntu with Node.js 20.x, but it intentionally does not install Pi, install or authenticate Codex, run `codex login`, perform live web search, publish to npm, or validate account-specific Codex behaviour.

The package is not documented as published to npm yet. The npm-style Pi commands are the intended source syntax once `pi-codex-web-search` is published under the expected name/version; local path and git source loading are documented for current validation. Package dry-run validation does not publish, sign, or upload the package.

The package-content validator intentionally mirrors the current narrow `files` allowlist and required docs/runtime files. If future tickets intentionally add packaged runtime files or rename documentation, `scripts/check-package-contents.mjs` must be updated with the package strategy change.

The troubleshooting guide documents native Windows/path concerns, but native Windows has not been fully validated. Because the runner uses `execFile` with `shell: false`, shell aliases and some npm `.cmd` shims may not behave like they do in an interactive shell; WSL/Linux/macOS remain the recommended validation path for now.

Codex is still an external executable. A malicious `codex` binary, unsafe `PATH`, or unsafe `PI_CODEX_WEB_SEARCH_CODEX_BINARY` override can execute as the local user. Users should point overrides only at trusted Codex executables.

The Codex sandbox is still limited to `read-only`, but read-only is not a no-read guarantee. Codex may be able to read files permitted by its own sandbox policy and current working directory. Users should avoid launching Pi from highly sensitive directories when running live web search.

Web results remain untrusted. Prompt-injection risk cannot be eliminated by this extension; users and models should verify cited sources and avoid following instructions found in web pages.

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

Ticket 019 — Add opt-in real-Codex smoke script.
