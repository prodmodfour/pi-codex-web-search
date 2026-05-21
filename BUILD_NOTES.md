# BUILD_NOTES.md

## Current state

All autonomous tickets are complete, including Ticket 099. The repository now has the TypeScript/npm Pi package, explicit `pi.extensions` manifest, `codex_web_search` tool registration, `/codex-web-search` static help command, safe configuration handling, safe `codex exec` argv construction, bounded non-shell subprocess execution, JSONL parsing, bounded Pi tool-result formatting, fake-Codex integration coverage, user/maintainer documentation, security threat model, troubleshooting guidance, release/package validation, CI, example local Pi project fixture, and opt-in real-Codex smoke/manual validation paths.

Ticket 099 completed the final autonomous review:

* confirmed the lowest remaining ticket was 099 and marked it `DONE`
* set the top-level `AUTOMATION_STATUS` in `BUILD_TICKETS.md` to `DONE`
* reviewed the project brief success criteria against the package manifest, source structure, runner/parser/formatter pipeline, tests, docs, and manual validation path
* confirmed all non-manual implementation tickets are already `DONE`
* checked that the package shape remains clear for Pi users through `README.md`, `docs/INSTALLATION.md`, `docs/EXTENSION_SPEC.md`, and `docs/EXAMPLE_LOCAL_PI_PROJECT.md`
* updated the README status note from build-in-progress language to autonomous-build-complete language while keeping manual real-Codex/Pi validation explicit
* checked tracked-file guardrails for forbidden generated/private paths; no tracked `node_modules`, `dist`, `coverage`, `.agent`, `.pi`, `.codex`, `auth.json`, `.env`, or package tarballs were found

No Codex live search, authenticated Codex run, real Codex CLI execution, Codex credential access, browser automation, or external network research was used in this cycle.

## Quality gates

Ran `scripts/quality-gate.sh` successfully after the Ticket 099 review updates.

The passing gate performed:

* shell syntax checks through `scripts/check-shell-syntax.sh`
* secret guardrail through `scripts/check-no-secrets.sh`
* generated/private-file guardrail before Node checks
* `npm ci`
* `npm run lint --if-present`, using TypeScript strict checks plus unused-code checks
* `npm run typecheck --if-present`, using the same TypeScript project check
* `npm test --if-present` with 63 passing tests
* `npm run build --if-present`
* `npm run pack:check`, which ran the package-content validator and confirmed the npm dry-run would ship the intended 23 runtime/docs files
* cleanup of `node_modules/` created by the gate
* generated/private-file guardrail after cleanup

The quality gate intentionally did not run `npm run smoke:codex`, install or authenticate real Codex, launch Pi, perform live web search, publish to npm, or validate account-specific Codex behavior.

## Known blockers and limitations

None for automated quality validation.

Manual real-Codex/Pi validation still requires a human machine with Pi installed, Codex CLI installed, `codex login` completed, a Pi model/provider configured, and network access. The automated suite does not prove that a real Pi installation can load the package, that a model will choose the tool, or that real Codex web search works on a user's account. The external manual path is documented in `docs/MANUAL_VALIDATION.md` and is not treated as an automated blocker.

The package is not documented as published to npm yet. Npm-style Pi commands are the intended source syntax once `pi-codex-web-search` is published under the expected name/version; local path and git source loading are documented for current validation.

Native Windows/path behavior has not been fully validated. The runner and smoke script use non-shell subprocess APIs with `shell: false`, so shell aliases and some npm `.cmd` shims may not behave like they do in an interactive shell; WSL/Linux/macOS remain the recommended validation path for now.

Codex remains an external executable. A malicious `codex` binary, unsafe `PATH`, or unsafe `PI_CODEX_WEB_SEARCH_CODEX_BINARY` override can execute as the local user. Users should point overrides only at trusted Codex executables.

The Codex sandbox is limited to `read-only`, but read-only is not a no-read guarantee. Codex may be able to read files permitted by its own sandbox policy and current working directory. Users should avoid launching Pi from highly sensitive directories when running live web search.

Web results remain untrusted. Prompt-injection risk cannot be eliminated by this extension; users and models should verify cited sources and avoid following instructions found in web pages.

The fake-Codex fixture is deterministic test coverage, not a Codex emulator. Real Codex JSONL schemas and authentication behavior still require the manual validation path.

## Next recommended ticket

None. Autonomous build is complete; remaining real-world validation is the documented human manual checklist.
