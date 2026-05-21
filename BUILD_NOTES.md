# BUILD_NOTES.md

## Current state

Tickets 000 through 013 are complete. The repository now has a TypeScript/npm Pi package skeleton, project-specific validation guardrails, a frozen Pi extension/package contract, the finalized `codex_web_search` tool API contract, a safe `codex exec` argv builder, a bounded Codex subprocess runner, a JSONL parser for `codex exec --json` stdout, a bounded formatter for Pi tool output, Pi tool registration wiring, a small optional Pi slash-command help surface, safe configuration handling, a fake-Codex integration test harness, a manual real-Codex validation guide, and user-facing installation/package documentation.

Ticket 013 added in this cycle:

* added `docs/INSTALLATION.md` with local path, git source, and npm-style Pi package loading commands
* documented one-session (`pi -e`), project-local (`pi install -l`), and global (`pi install`) loading patterns
* documented the package `pi.extensions` manifest, TypeScript extension loading, conventional extension auto-discovery, package `files` allowlist, and package-loading caveats
* updated README with install commands for local checkout, git source, and npm-style source usage once published
* added prompt examples that should trigger `codex_web_search`, including live and cached mode examples
* added a clear statement that authenticated Codex/ChatGPT usage may consume Codex/ChatGPT plan limits and does not use OpenAI API web-search billing by default
* documented unsupported or brittle areas, including Codex CLI/schema drift, real-search dependency on local auth/network/account capability, local single-user scope, read-only sandbox support, and the absence of ChatGPT Web scraping/browser automation/usage-limit bypasses
* updated `docs/USAGE.md` and `docs/EXTENSION_SPEC.md` to point at the installation docs and freeze the exact documented load paths

No Codex live search, authenticated Codex run, real Codex CLI execution, Codex credential access, browser automation, or network research was used in this cycle. The package documentation explains how a human can perform those checks manually, but automated validation remains fake-Codex/mocked by default.

## Quality gates

Ran `scripts/quality-gate.sh` successfully after implementing Ticket 013.

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

The npm package dry-run included only the intended package files from the package `files` allowlist, now including `docs/INSTALLATION.md`. Test fixtures are not shipped in the npm package. `node_modules/` was removed by the gate before exit.

## Known blockers and limitations

None for automated quality validation.

Manual real-Codex validation still requires a human machine with Pi installed, Codex CLI installed, `codex login` completed, a Pi model/provider configured, and network access. This remains an external manual activity; the repository documents the procedure but does not run it during the automated gate.

The package is not documented as published to npm yet. The npm-style Pi commands are the intended source syntax once `pi-codex-web-search` is published under the expected name/version; local path and git source loading are documented for current validation.

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

Ticket 014 — Add security threat model.
