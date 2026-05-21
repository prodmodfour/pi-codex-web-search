# BUILD_NOTES.md

## Current state

Tickets 000 through 019 are complete. The repository now has a TypeScript/npm Pi package skeleton, project-specific validation guardrails, a frozen Pi extension/package contract, the finalized `codex_web_search` tool API contract, a safe `codex exec` argv builder, a bounded Codex subprocess runner, a JSONL parser for `codex exec --json` stdout, a bounded formatter for Pi tool output, Pi tool registration wiring, a small optional Pi slash-command help surface, safe configuration handling, a fake-Codex integration test harness, a manual real-Codex validation guide, user-facing installation/package documentation, a security threat model, expanded troubleshooting guidance, release/package-content validation, a GitHub Actions quality workflow, a docs-only local Pi project fixture, and an opt-in real-Codex smoke script for authenticated human validation.

Ticket 019 added in this cycle:

* added `scripts/smoke-real-codex-search.mjs`, a manual Node.js smoke script that checks `codex --version` and then runs a harmless `codex exec --search --skip-git-repo-check --sandbox read-only -- <query>` request using `spawn` with `shell: false`
* exposed the script through `npm run smoke:codex` while keeping it out of `scripts/quality-gate.sh`, GitHub Actions, and the default automated test path
* made the script fail fast for missing/unstartable Codex, non-zero exits, timeouts, oversized output, empty successful stdout, and invalid smoke timeout/binary environment values without reading Codex credential files
* kept the script from writing log files; it prints only a bounded stdout preview on success and intentionally omits raw stderr/stdout from failed real-Codex runs
* documented when and how to run the script in README, `docs/MANUAL_VALIDATION.md`, `docs/TROUBLESHOOTING.md`, `docs/QUALITY_GATE.md`, `docs/SECURITY.md`, and `docs/RELEASE.md`
* added static automated coverage in `test/package-shape.test.mjs` to verify the smoke script exists, is wired to `npm run smoke:codex`, uses the reviewed read-only/search shape, and is not referenced by the quality-gate script

No Codex live search, authenticated Codex run, real Codex CLI execution, Codex credential access, browser automation, or network research was used in this cycle. The new smoke script was syntax-checked locally with `node --check`, but it was not executed against a real Codex binary.

## Quality gates

Ran `scripts/quality-gate.sh` successfully after implementing Ticket 019.

The passing gate performed:

* shell syntax checks through `scripts/check-shell-syntax.sh`
* secret guardrail through `scripts/check-no-secrets.sh`
* generated/private-file guardrail before Node checks
* `npm ci`
* `npm run lint --if-present`
* `npm run typecheck --if-present`
* `npm test --if-present` with 63 passing tests, including the new static coverage for the opt-in smoke script
* `npm run build --if-present`
* `npm run pack:check`, which ran the package-content validator and confirmed the npm dry-run would ship the intended 23 runtime/docs files
* cleanup of `node_modules/` created by the gate
* generated/private-file guardrail after cleanup

The quality gate intentionally did not run `npm run smoke:codex`, did not install or authenticate real Codex, and did not perform live web search. The validated package dry-run still includes only the intended `package.json`, `README.md`, `docs/`, `extensions/`, and `src/` contents. Repository scripts, including the new smoke script, remain outside the npm package contents by policy.

## Known blockers and limitations

None for automated quality validation.

The opt-in smoke script is manual-only and repository-checkout-only. It is intentionally not part of the default quality gate, not run by CI, and not included in the npm package contents. It verifies that a human's local Codex CLI can start and perform one harmless read-only web-search request, but it does not prove that a real Pi installation can load the package, that a model will choose the tool, or that every future Codex JSONL schema will parse correctly.

The smoke script does not inspect `~/.codex/auth.json` or any other credential file. It can only infer unauthenticated, disabled-search, account-limit, or network problems from `codex exec` failing. Raw stderr/stdout from failed real-Codex runs is intentionally omitted, so deeper troubleshooting may require a human to run direct Codex commands privately and sanitize any notes before sharing.

The local Pi project fixture is documentation only. It does not prove that a real Pi installation can load the package, that a model will choose the tool, or that real Codex web search works on a user's machine. Manual real-Codex/Pi validation still requires a human machine with Pi installed, Codex CLI installed, `codex login` completed, a Pi model/provider configured, and network access.

GitHub Actions CI runs the local quality gate on hosted Ubuntu with Node.js 20.x, but it intentionally does not install Pi, install or authenticate Codex, run `codex login`, run `npm run smoke:codex`, perform live web search, publish to npm, or validate account-specific Codex behaviour.

The package is not documented as published to npm yet. The npm-style Pi commands are the intended source syntax once `pi-codex-web-search` is published under the expected name/version; local path and git source loading are documented for current validation. Package dry-run validation does not publish, sign, or upload the package.

The package-content validator intentionally mirrors the current narrow `files` allowlist and required docs/runtime files. If future tickets intentionally add packaged runtime files or rename documentation, `scripts/check-package-contents.mjs` must be updated with the package strategy change.

The troubleshooting guide documents native Windows/path concerns, but native Windows has not been fully validated. Because the runner and the smoke script use non-shell subprocess APIs with `shell: false`, shell aliases and some npm `.cmd` shims may not behave like they do in an interactive shell; WSL/Linux/macOS remain the recommended validation path for now.

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

Ticket 020 — Add polish pass for developer ergonomics.
