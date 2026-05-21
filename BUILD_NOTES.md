# BUILD_NOTES.md

## Current state

Ticket 000 is complete. The repository now has a TypeScript/npm Pi package skeleton for `pi-codex-web-search`.

Added in this cycle:

* `package.json` with Node 20+ metadata, npm scripts, dev dependencies, and `pi.extensions` pointing at `./extensions/codex-web-search.ts`
* `package-lock.json`
* `tsconfig.json` for strict NodeNext TypeScript type-checking without emitted build artifacts
* `extensions/codex-web-search.ts` as a safe no-op placeholder extension entrypoint
* `src/index.ts` with initial package metadata constants
* `test/package-shape.test.mjs` smoke tests for package manifest shape
* expanded `.gitignore` for Node, Pi runtime artifacts, Codex auth paths, and autonomous-agent logs
* README updated to describe the current package shape and placeholder status

The placeholder extension intentionally does not call Codex or register `codex_web_search`; later tickets own the API, runner, parser, formatter, and final tool registration.

## Quality gates

Ran `scripts/quality-gate.sh` successfully.

The gate performed:

* shell syntax checks
* secret guardrail
* generated/private-file guardrail
* `npm ci` (after the initial `npm install` generated `package-lock.json`)
* `npm run lint --if-present`
* `npm run typecheck --if-present`
* `npm test --if-present`
* `npm run build --if-present`
* `npm run pack:check`

After the gate, `node_modules/` was removed locally so the repository remains clean and the generated/private-file guardrail will not fail at the start of the next cycle.

## Latest cycle notes

The npm package dry-run included only the intended package files from `files`: README, docs, extension source, package metadata, and `src` metadata.

No real Codex invocation or authentication was used.

## Known blockers

None for automated build setup.

Manual real-Codex validation will require a machine with:

* Pi installed
* Codex CLI installed
* `codex login` completed with the user's ChatGPT/Codex account

## Next recommended ticket

Ticket 001 — Add project-specific quality and guardrail scripts.
