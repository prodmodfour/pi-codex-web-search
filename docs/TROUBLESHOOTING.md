# Troubleshooting

This file starts as a scaffold. Later tickets should expand it as implementation details solidify.

## Pi is missing

Install Pi and ensure `pi` is on PATH.

## Codex is missing

Install the Codex CLI and ensure `codex` is on PATH. If Codex is installed in a non-standard location, set `PI_CODEX_WEB_SEARCH_CODEX_BINARY` to the executable path before launching Pi.

## Invalid configuration

The extension validates configuration before registering the tool. Check these variables if Pi fails while loading the package:

* `PI_CODEX_WEB_SEARCH_CODEX_BINARY` — non-empty string without null bytes
* `PI_CODEX_WEB_SEARCH_DEFAULT_MODE` — `live` or `cached`
* `PI_CODEX_WEB_SEARCH_TIMEOUT_MS` — integer from `1000` to `300000`
* `PI_CODEX_WEB_SEARCH_MAX_OUTPUT_CHARS` — integer from `500` to `50000`
* `PI_CODEX_WEB_SEARCH_SANDBOX` — currently only `read-only`

Unset a variable to return to the built-in default. Do not point any setting at Codex credential files.

## Codex is unauthenticated

Run `codex login` locally. Do not copy `auth.json` into this repository.

## Automated tests try to call real Codex

That is a bug. Default tests should use mocks or a fake Codex executable.
