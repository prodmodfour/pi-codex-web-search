# BUILD_NOTES.md

## Current state

Tickets 000, 001, and 002 are complete. The repository has a TypeScript/npm Pi package skeleton, project-specific validation guardrails, and a frozen Pi extension/package contract for the future `codex_web_search` tool.

Ticket 002 added in this cycle:

* researched the locally installed Pi package (`0.75.4`) through its extension/package docs, examples, and exported TypeScript declarations
* rewrote `docs/EXTENSION_SPEC.md` with frozen assumptions for extension entrypoints, `registerTool`, package manifest shape, install/load paths, and the narrow local mock contract
* added `src/pi/piExtensionContract.ts`, a minimal local TypeScript subset of the Pi API for future internal wiring/tests without requiring a real Pi runtime during automated checks
* exported the local contract types from `src/index.ts`
* added `test/fixtures/mock-pi-api.mjs` and `test/pi-contract-fixture.test.mjs` so future extension-registration tests can capture registered tools/commands without invoking real Pi or Codex
* updated README to point at the frozen extension specification
* updated `docs/ARCHITECTURE.md` to show the current local contract module alongside future modules

The placeholder extension still intentionally does not call Codex or register `codex_web_search`; later tickets own the tool API, argv builder, runner, parser, formatter, and final registration.

No Codex live search, real Codex CLI invocation, or Codex authentication was used.

## Quality gates

Ran `npm test --if-present` successfully during development.

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

## Known blockers and limitations

None for automated quality validation.

The local Pi contract in `src/pi/piExtensionContract.ts` is intentionally narrow and mirrors only the subset frozen in `docs/EXTENSION_SPEC.md`. It should be replaced or reconciled explicitly if a future ticket imports official Pi runtime types or TypeBox schemas directly.

Manual real-Codex validation will require a machine with:

* Pi installed
* Codex CLI installed
* `codex login` completed with the user's ChatGPT/Codex account

## Next recommended ticket

Ticket 003 — Define the `codex_web_search` tool API.
