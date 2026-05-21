# BUILD_NOTES.md

## Current state

Tickets 000, 001, 002, 003, and 004 are complete. The repository has a TypeScript/npm Pi package skeleton, project-specific validation guardrails, a frozen Pi extension/package contract, the finalized `codex_web_search` tool API contract, and a safe `codex exec` argv builder.

Ticket 004 added in this cycle:

* created `src/codex/buildCodexArgs.ts` with `buildCodexExecArgs`, sandbox/output allowlists, and `CodexArgvBuilderError`
* exported the argv-builder contract from `src/index.ts`
* implemented the current live-search argv shape as `["exec", "--json", "--search", "--skip-git-repo-check", "--sandbox", "read-only", "--", query]`
* ensured `--search` is emitted only for normalized `mode: "live"` and `--skip-git-repo-check` is emitted only when the normalized boolean is true
* kept the query as one final argv element after an end-of-options `--` separator so shell metacharacters and leading dashes are not interpreted as shell syntax or Codex flags by the builder
* restricted the current sandbox allowlist to `read-only`; unsafe values such as write-capable Codex sandboxes are rejected until a future ticket deliberately expands policy
* added runtime guardrails for malformed normalized input, unsupported output formats, inconsistent `mode`/`liveSearch`, non-boolean skip flags, empty query, and null bytes without echoing query text in builder errors
* added `test/build-codex-args.test.mjs` covering live/cached and skip-git combinations, shell-metacharacter prompt handling, allowlists, and malformed-input failures
* updated README, `docs/EXTENSION_SPEC.md`, `docs/ARCHITECTURE.md`, and `docs/SECURITY.md` to document the argv-builder boundary and current sandbox policy

The placeholder extension still intentionally does not call Codex or register `codex_web_search`; later tickets own the subprocess runner, JSONL parser, formatter, and final Pi registration.

No Codex live search, authenticated Codex run, or Codex task execution was used. The local `codex exec --help` output was consulted once after implementation to confirm the documented `exec`, `--json`, `--skip-git-repo-check`, and sandbox flag shapes; no prompts were sent to Codex.

## Quality gates

Ran `scripts/quality-gate.sh` successfully after implementing Ticket 004.

The passing gate performed:

* shell syntax checks through `scripts/check-shell-syntax.sh`
* secret guardrail through `scripts/check-no-secrets.sh`
* generated/private-file guardrail before Node checks
* `npm ci`
* `npm run lint --if-present`
* `npm run typecheck --if-present`
* `npm test --if-present` with 17 passing tests
* `npm run build --if-present`
* `npm run pack:check`
* cleanup of `node_modules/` created by the gate
* generated/private-file guardrail after cleanup

The npm package dry-run included the intended package files from `files`: README, docs, extension source, package metadata, Pi contract source, tool API source, and the new Codex argv-builder source. `node_modules/` was removed by the gate before exit.

## Known blockers and limitations

None for automated quality validation.

The local Pi contract in `src/pi/piExtensionContract.ts` is intentionally narrow and mirrors only the subset frozen in `docs/EXTENSION_SPEC.md`. It should be replaced or reconciled explicitly if a future ticket imports official Pi runtime types or TypeBox schemas directly.

The API and argv builder still do not spawn Codex, parse JSONL, format Pi results, register the Pi tool, or read user configuration. The current sandbox allowlist is intentionally limited to `read-only`; future configuration work must explicitly validate and document any override.

Manual real-Codex validation will require a machine with:

* Pi installed
* Codex CLI installed
* `codex login` completed with the user's ChatGPT/Codex account

## Next recommended ticket

Ticket 005 — Implement Codex subprocess runner.
