# Contributing

Thanks for helping improve `pi-codex-web-search`.

## Setup

```bash
npm install
npm test
npm run pack:check
```

Run the full local gate before opening a pull request:

```bash
npm run quality
```

## Development guidelines

- Keep the Pi extension entrypoint at `extensions/codex-web-search.ts` unless the package manifest and tests are updated together.
- Prefer deterministic tests with the fake Codex fixture under `test/fixtures/`; real Codex validation is opt-in only and documented in `docs/MANUAL_VALIDATION.md`.
- Do not commit generated output, local runtime state, credentials, `.env` files, Codex auth files, package tarballs, or logs.
- Keep user-facing errors and test fixtures free of raw queries, credentials, and private paths.
- Update docs when behavior, configuration, package contents, or security assumptions change.

## Pull requests

Please include:

- a concise description of the change and why it is needed;
- tests or documentation updates for behavior changes;
- the commands you ran, especially `npm test`, `npm run pack:check`, or `npm run quality`;
- any manual Codex/Pi validation results, if relevant.

## Reporting issues

When filing a bug, include the OS, Node.js version, Pi version, Codex CLI version, package version or commit, relevant configuration, and sanitized error output. Do not paste Codex credentials, account tokens, `~/.codex/auth.json`, or private prompts.

## Security

For security-sensitive reports or safe-use expectations, start with `docs/SECURITY.md`. This project must never read, copy, log, or commit Codex credential files.
