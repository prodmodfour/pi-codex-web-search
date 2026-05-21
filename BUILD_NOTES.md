# BUILD_NOTES.md

## Current state

Tickets 000 and 001 are complete. The repository has a TypeScript/npm Pi package skeleton for `pi-codex-web-search` plus project-specific local validation guardrails.

Ticket 001 added in this cycle:

* `scripts/check-shell-syntax.sh` for reusable `bash -n` validation of repository shell scripts
* strengthened `scripts/quality-gate.sh` orchestration for shell checks, secret guardrails, generated/private-file guardrails, npm install/CI, lint, typecheck, tests, build, package dry-run, cleanup, and a post-check artifact guardrail
* strengthened `scripts/check-no-generated-private-files.sh` checks for real env files, Codex auth artifacts, generated dependency/build/coverage directories, npm tarballs, and tracked generated/private paths
* npm convenience scripts: `quality`, `check:shell`, `guard:secrets`, and `guard:generated`
* `docs/QUALITY_GATE.md` documenting the gate checks, npm script map, cleanup behavior, and limitations
* README updates pointing developers at the quality-gate documentation
* package-shape test coverage for the quality-related npm scripts

The placeholder extension still intentionally does not call Codex or register `codex_web_search`; later tickets own the Pi extension contract, tool API, runner, parser, formatter, and final registration.

## Quality gates

Ran `scripts/quality-gate.sh` successfully.

The gate performed:

* shell syntax checks through `scripts/check-shell-syntax.sh`
* secret guardrail through `scripts/check-no-secrets.sh`
* generated/private-file guardrail before Node checks
* `npm ci`
* `npm run lint --if-present`
* `npm run typecheck --if-present`
* `npm test --if-present`
* `npm run build --if-present`
* `npm run pack:check`
* cleanup of `node_modules/` created by the gate
* generated/private-file guardrail after cleanup

The npm package dry-run included the intended package files from `files`: README, docs, extension source, package metadata, and `src` metadata. `node_modules/` was removed by the gate before exit.

No real Codex invocation or authentication was used.

## Known blockers

None for automated quality validation.

Manual real-Codex validation will require a machine with:

* Pi installed
* Codex CLI installed
* `codex login` completed with the user's ChatGPT/Codex account

## Next recommended ticket

Ticket 002 — Research and freeze current Pi extension contract.
