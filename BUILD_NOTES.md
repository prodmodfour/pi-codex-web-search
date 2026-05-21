# BUILD_NOTES.md

## Current state

Tickets 000 through 016 are complete. The repository now has a TypeScript/npm Pi package skeleton, project-specific validation guardrails, a frozen Pi extension/package contract, the finalized `codex_web_search` tool API contract, a safe `codex exec` argv builder, a bounded Codex subprocess runner, a JSONL parser for `codex exec --json` stdout, a bounded formatter for Pi tool output, Pi tool registration wiring, a small optional Pi slash-command help surface, safe configuration handling, a fake-Codex integration test harness, a manual real-Codex validation guide, user-facing installation/package documentation, a security threat model, expanded troubleshooting guidance, and release/package-content validation.

Ticket 016 added in this cycle:

* added `scripts/check-package-contents.mjs`, a Node-based npm package dry-run validator that runs `npm pack --dry-run --json` without creating a tarball
* changed `npm run pack:check` to execute the validator instead of only printing raw npm dry-run output
* validated the package `files` allowlist, package name/version, required runtime/docs files, and `pi.extensions` entrypoint presence
* added forbidden-path checks for private/generated/non-runtime content such as `.env`, `.codex`, `auth.json`, `node_modules`, `dist`, `build`, `coverage`, `.agent`, `.pi`, `*.tgz`, `test/`, `scripts/`, autonomous build notes, and agent/project prompt files
* added tests that keep the package files allowlist narrow, confirm the package-content checker script is wired, and require release documentation to exist
* added `docs/RELEASE.md` with the release checklist, package contents policy, manual inspection notes, npm publishing reminders, and no-secrets guidance
* updated README, installation, quality-gate, and security docs to point at the package-content validator and release process

No Codex live search, authenticated Codex run, real Codex CLI execution, Codex credential access, browser automation, or network research was used in this cycle. The ticket was focused on npm package validation and release documentation.

## Quality gates

Ran `scripts/quality-gate.sh` successfully after implementing Ticket 016.

The passing gate performed:

* shell syntax checks through `scripts/check-shell-syntax.sh`
* secret guardrail through `scripts/check-no-secrets.sh`
* generated/private-file guardrail before Node checks
* `npm ci`
* `npm run lint --if-present`
* `npm run typecheck --if-present`
* `npm test --if-present` with 59 passing tests, including the fake-Codex executable integration tests and the new package-shape checks
* `npm run build --if-present`
* `npm run pack:check`, which ran the new package-content validator and confirmed the npm dry-run would ship 22 intended files
* cleanup of `node_modules/` created by the gate
* generated/private-file guardrail after cleanup

A direct `npm run pack:check` was also run successfully before the full quality gate. The validated package dry-run includes the intended `package.json`, `README.md`, `docs/`, `extensions/`, and `src/` contents, including `docs/RELEASE.md`. Test fixtures, scripts, autonomous build notes, dependency directories, generated output, package tarballs, and private/auth files are not included in the npm dry-run contents.

## Known blockers and limitations

None for automated quality validation.

Manual real-Codex validation still requires a human machine with Pi installed, Codex CLI installed, `codex login` completed, a Pi model/provider configured, and network access. This remains an external manual activity; the repository documents the procedure but does not run it during the automated gate.

The package is not documented as published to npm yet. The npm-style Pi commands are the intended source syntax once `pi-codex-web-search` is published under the expected name/version; local path and git source loading are documented for current validation. Ticket 016 added package dry-run validation, but it does not publish, sign, or upload the package.

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

Ticket 017 — Add GitHub Actions quality workflow.
