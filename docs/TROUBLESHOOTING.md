# Troubleshooting

This file starts as a scaffold. Later tickets should expand it as implementation details solidify.

## Pi is missing

Install Pi and ensure `pi` is on PATH.

## Codex is missing

Install the Codex CLI and ensure `codex` is on PATH.

## Codex is unauthenticated

Run `codex login` locally. Do not copy `auth.json` into this repository.

## Automated tests try to call real Codex

That is a bug. Default tests should use mocks or a fake Codex executable.
