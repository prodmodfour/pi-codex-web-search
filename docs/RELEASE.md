# Release and Packaging Validation

This repository ships a Pi package. Release validation is about proving what Pi users will receive without committing generated artifacts, private logs, or credentials.

The repository tooling does not publish to npm and does not require real Codex authentication. Real Codex/Pi validation remains the manual path documented in [`MANUAL_VALIDATION.md`](MANUAL_VALIDATION.md).

## Package contents policy

`package.json` uses an npm `files` allowlist:

```json
["extensions", "src", "docs", "README.md"]
```

npm always includes `package.json`; the allowlist intentionally keeps the published package to:

* the Pi extension entrypoint under `extensions/`;
* TypeScript source under `src/`;
* user/maintainer documentation under `docs/`;
* `README.md` and package metadata.

The package must not include tests, fake-Codex fixtures, local workflow notes, repository scripts (including the opt-in real-Codex smoke script), dependency directories, build output, coverage output, real environment files, Codex runtime/auth files, or npm tarballs. Keep using the `files` allowlist unless a future release intentionally changes the package strategy; a `.npmignore` is not needed while the allowlist remains this narrow.

## Local release checklist

Run these commands from a clean checkout before tagging or publishing:

```bash
git status --short
npm ci
scripts/quality-gate.sh
npm run pack:check
```

`npm run pack:check` runs `npm pack --dry-run --json` and then verifies that:

* the package name/version match `package.json`;
* the `pi.extensions` entrypoint is present in the dry-run contents;
* required runtime/docs files are present;
* every packed path is under `package.json`, `README.md`, `extensions/`, `src/`, or `docs/`;
* forbidden private/generated paths such as `.env`, `.codex`, `auth.json`, `node_modules`, `dist`, `build`, `coverage`, `.agent`, `.pi`, `*.tgz`, `test/`, and `scripts/` are absent.

Review the printed file list before publishing. The dry-run does not create a `.tgz` file.

## Manual inspection without publishing

For a raw npm preview, run:

```bash
npm pack --dry-run
```

If you create a real tarball for inspection with `npm pack`, remove it before committing or rerun the generated/private-file guardrail:

```bash
rm -f pi-codex-web-search-*.tgz
npm run guard:generated
```

Never commit package tarballs, `node_modules/`, `dist/`, `coverage/`, `.env*`, `.codex/`, `auth.json`, `.agent/logs/`, or private validation transcripts.

## Publishing notes

Only a human maintainer should publish. Before running `npm publish`:

1. confirm the version in `package.json` is the intended release version;
2. review the source diff and `npm run pack:check` output;
3. authenticate to npm outside the repository;
4. do not write npm tokens, Codex credentials, or private registry credentials into tracked files;
5. prefer `npm publish --dry-run` first if you need npm's publish-time preview;
6. publish only when the dry-run contents and docs are correct.

After publishing, validate loading through Pi with the exact version:

```bash
pi -e npm:pi-codex-web-search@<version>
```

Then run `/codex-web-search` to confirm the help command loads. If you have Codex installed and authenticated, follow [`MANUAL_VALIDATION.md`](MANUAL_VALIDATION.md) for the opt-in real-search smoke path. Do not share `~/.codex/auth.json` or unsanitized terminal output.
