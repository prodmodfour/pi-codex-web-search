# BUILD_NOTES.md

## Current state

Tickets 000 through 021 are complete. The repository now has a TypeScript/npm Pi package skeleton, project-specific validation guardrails, a frozen Pi extension/package contract, the finalized `codex_web_search` tool API contract, a safe `codex exec` argv builder, a bounded Codex subprocess runner, a JSONL parser for `codex exec --json` stdout, a bounded formatter for Pi tool output, Pi tool registration wiring, a small optional Pi slash-command help surface, safe configuration handling, a fake-Codex integration test harness, a manual real-Codex validation guide, user-facing installation/package documentation, a security threat model, expanded troubleshooting guidance, release/package-content validation, a GitHub Actions quality workflow, a docs-only local Pi project fixture, an opt-in real-Codex smoke script for authenticated human validation, a developer-ergonomics polish pass, and a final human-validation checkpoint.

Ticket 021 added in this cycle:

* reviewed the manual real-Codex/Pi validation path for completeness against the ticket requirements
* added a `Final validation checklist` to `docs/MANUAL_VALIDATION.md` that tells a human validator exactly what to run locally: the no-real-Codex quality gate, runtime version checks, Codex install/login, the opt-in smoke script, Pi package loading, `/codex-web-search` help, a live-mode tool call, and the optional cached-mode comparison
* expanded the validation record template with npm version, automated quality-gate status, and optional cached-mode status so human pass/fail notes are easier to capture without committing raw logs

No Codex live search, authenticated Codex run, real Codex CLI execution, Codex credential access, browser automation, or network research was used in this cycle. The autonomous agent cannot safely complete real-Codex/Pi validation from this environment because it requires a human's local Pi/Codex setup, authentication state, network access, and may consume Codex/ChatGPT plan limits. This external manual validation requirement is documented and is not treated as a blocker for automated ticket completion.

## Quality gates

Ran `scripts/quality-gate.sh` successfully after implementing Ticket 021.

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

The quality gate intentionally did not run `npm run smoke:codex`, did not install or authenticate real Codex, did not launch Pi, and did not perform live web search. The validated package dry-run still includes only the intended `package.json`, `README.md`, `docs/`, `extensions/`, and `src/` contents. Repository scripts, including the opt-in smoke script, remain outside the npm package contents by policy.

## Known blockers and limitations

None for automated quality validation.

Manual real-Codex/Pi validation still requires a human machine with Pi installed, Codex CLI installed, `codex login` completed, a Pi model/provider configured, and network access. The automated suite does not prove that a real Pi installation can load the package, that a model will choose the tool, or that real Codex web search works on a user's account.

The opt-in smoke script remains manual-only and repository-checkout-only. It is intentionally not part of the default quality gate, not run by CI, and not included in the npm package contents. It verifies that a human's local Codex CLI can start and perform one harmless read-only web-search request, but it does not inspect credential files and cannot distinguish every account, network, plan-limit, or search-availability cause beyond the bounded Codex process result.

GitHub Actions CI runs the local quality gate on hosted Ubuntu with Node.js 20.x, but it intentionally does not install Pi, install or authenticate Codex, run `codex login`, run `npm run smoke:codex`, perform live web search, publish to npm, or validate account-specific Codex behaviour.

The package is not documented as published to npm yet. The npm-style Pi commands are the intended source syntax once `pi-codex-web-search` is published under the expected name/version; local path and git source loading are documented for current validation.

Native Windows/path behavior has not been fully validated. The runner and smoke script use non-shell subprocess APIs with `shell: false`, so shell aliases and some npm `.cmd` shims may not behave like they do in an interactive shell; WSL/Linux/macOS remain the recommended validation path for now.

Codex is still an external executable. A malicious `codex` binary, unsafe `PATH`, or unsafe `PI_CODEX_WEB_SEARCH_CODEX_BINARY` override can execute as the local user. Users should point overrides only at trusted Codex executables.

The Codex sandbox is still limited to `read-only`, but read-only is not a no-read guarantee. Codex may be able to read files permitted by its own sandbox policy and current working directory. Users should avoid launching Pi from highly sensitive directories when running live web search.

Web results remain untrusted. Prompt-injection risk cannot be eliminated by this extension; users and models should verify cited sources and avoid following instructions found in web pages.

The fake-Codex fixture is intentionally a deterministic test executable, not a Codex emulator. It validates the expected safe argv shape and covers representative success/failure cases, but real Codex JSONL schemas and authentication behavior still require the manual validation path.

The local Pi contract in `src/pi/piExtensionContract.ts` is intentionally narrow and mirrors only the subset frozen in `docs/EXTENSION_SPEC.md`. It should be replaced or reconciled explicitly if a future ticket imports official Pi runtime types or TypeBox schemas directly.

Configuration is intentionally limited to documented environment variables and explicit in-process/project config passed to registration helpers. There is no file-based project config reader, and no configuration path reads Codex credentials, `$HOME`, or arbitrary files.

The configured sandbox setting currently accepts only `read-only`. This is deliberate: write-capable Codex sandboxes remain out of scope until a future ticket explicitly proves they are necessary and safe.

## Next recommended ticket

Ticket 099 — Final autonomous review and completion marker.
