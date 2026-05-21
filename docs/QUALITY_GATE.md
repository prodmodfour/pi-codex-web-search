# Quality Gate

Run the local gate before every ticket commit:

```bash
scripts/quality-gate.sh
# or
npm run quality
```

The gate is intentionally safe for automated runs: it does not require Pi, a real Codex CLI, Codex authentication, or network access beyond normal npm dependency installation. Integration coverage uses the checked-in fake Codex executable fixture under `test/fixtures/` rather than the real `codex` binary. The opt-in authenticated smoke script (`npm run smoke:codex`) is intentionally not called by the gate.

## GitHub Actions CI

`.github/workflows/quality.yml` runs the same local gate on GitHub-hosted Ubuntu for `push`, `pull_request`, and manual `workflow_dispatch` runs. The workflow checks out the repository, sets up Node.js 20.x with npm caching, and runs:

```bash
bash scripts/quality-gate.sh
```

Because the local gate owns the check list, CI runs the shell syntax checks, secret and generated/private-file guardrails, npm validation scripts, strict TypeScript checks, tests, build checks, and `npm run pack:check` package dry-run validation without duplicating the logic in workflow YAML.

CI intentionally does not install Pi, install or authenticate the real Codex CLI, run `codex login`, run `npm run smoke:codex`, perform live web search, publish to npm, or exercise account-specific behaviour. Real Codex/Pi validation remains an opt-in human activity documented in [`MANUAL_VALIDATION.md`](MANUAL_VALIDATION.md).

## Checks

`quality-gate.sh` currently runs these checks in order:

1. **Shell syntax** — `bash -n` for every `scripts/**/*.sh` file via `scripts/check-shell-syntax.sh`.
2. **Secret guardrail** — `scripts/check-no-secrets.sh` scans repository files for common token/private-key patterns while excluding dependency, build, coverage, Git, and agent runtime directories.
3. **Generated/private-file guardrail** — `scripts/check-no-generated-private-files.sh` fails when local or tracked private/generated paths are present, including real env files, Codex auth artifacts, `node_modules`, build output, coverage output, and npm package tarballs.
4. **Node package checks** when `package.json` exists:
   - `npm ci` when `package-lock.json` exists, otherwise `npm install`
   - `npm run lint --if-present` (currently `tsc --noEmit` with strict and unused-code checks)
   - `npm run typecheck --if-present` (same TypeScript project check)
   - `npm test --if-present`
   - `npm run build --if-present`
   - `npm run pack:check` when that script exists; this runs `npm pack --dry-run --json` and verifies the packed file list against the expected Pi package allowlist
5. **Post-check generated/private-file guardrail** — reruns the generated/private-file guardrail after cleanup.

When the gate installs dependencies and `node_modules/` was not present at startup, it removes that generated directory before exiting. This keeps repeat runs deterministic and prevents accidental commits of installed dependencies.

## npm script map

Convenience scripts cover the gate components plus the explicitly opt-in real-Codex smoke check:

```bash
npm run quality
npm run check:shell
npm run guard:secrets
npm run guard:generated
npm run lint
npm run typecheck
npm test
npm run build
npm run pack:check
npm run smoke:codex
```

`pack:check` is implemented by `scripts/check-package-contents.mjs`. It does not create a tarball; it validates the npm dry-run output and prints the files that would ship. `smoke:codex` is manual-only: it runs the local authenticated Codex CLI with a harmless read-only web-search query and may consume Codex/ChatGPT plan limits, so do not add it to the default gate or CI. Release-specific packaging notes are in [`RELEASE.md`](RELEASE.md).

## Limitations

The guardrails are conservative automated checks, not a full security audit. Review diffs before committing, and never add real Codex credentials, private prompts, private logs, generated package output, or dependency directories to the repository.
