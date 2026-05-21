# Quality Gate

Run the local gate before every ticket commit:

```bash
scripts/quality-gate.sh
# or
npm run quality
```

The gate is intentionally safe for automated runs: it does not require Pi, a real Codex CLI, Codex authentication, or network access beyond normal npm dependency installation.

## Checks

`quality-gate.sh` currently runs these checks in order:

1. **Shell syntax** — `bash -n` for every `scripts/**/*.sh` file via `scripts/check-shell-syntax.sh`.
2. **Secret guardrail** — `scripts/check-no-secrets.sh` scans repository files for common token/private-key patterns while excluding dependency, build, coverage, Git, and agent runtime directories.
3. **Generated/private-file guardrail** — `scripts/check-no-generated-private-files.sh` fails when local or tracked private/generated paths are present, including real env files, Codex auth artifacts, `node_modules`, build output, coverage output, and npm package tarballs.
4. **Node package checks** when `package.json` exists:
   - `npm ci` when `package-lock.json` exists, otherwise `npm install`
   - `npm run lint --if-present`
   - `npm run typecheck --if-present`
   - `npm test --if-present`
   - `npm run build --if-present`
   - `npm run pack:check` when that script exists
5. **Post-check generated/private-file guardrail** — reruns the generated/private-file guardrail after cleanup.

When the gate installs dependencies and `node_modules/` was not present at startup, it removes that generated directory before exiting. This keeps repeat runs deterministic and prevents accidental commits of installed dependencies.

## npm script map

Convenience scripts mirror the gate components:

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
```

## Limitations

The guardrails are conservative automated checks, not a full security audit. Review diffs before committing, and never add real Codex credentials, private prompts, private logs, generated package output, or dependency directories to the repository.
