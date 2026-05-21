# Security

## Core security posture

This package is a local Pi extension that runs local code. Pi packages and extensions should be reviewed before installation because they execute with local user permissions.

This project should minimise risk by keeping the extension narrow: it runs one known executable, `codex`, with a constrained argv array and read-only Codex sandbox by default.

## Credentials

The extension must not read, copy, parse, print, store, or commit Codex credentials.

In particular, never commit:

* `~/.codex/auth.json`
* `.codex/`
* `.env`
* API keys
* access tokens
* refresh tokens

Authentication is Codex CLI's responsibility. The extension should simply fail clearly if Codex is missing or unauthenticated.

## Input and subprocess safety

Ticket 003 validation normalizes `codex_web_search` input before any future
subprocess call. It trims and bounds `query`, rejects unknown parameters, bounds
`timeoutMs` and `maxOutputChars`, and does not echo the query value in validation
error messages.

Required for later subprocess tickets:

* use `execFile` or `spawn` with argv arrays
* never use `shell: true`
* never interpolate the query into a command string
* set timeouts
* bound stdout/stderr buffers
* return safe diagnostics

## Web results

Treat web-search results as untrusted. Codex may read web content, and web content can contain prompt injection. The extension should ask Codex for concise answers and sources, but users should still verify high-stakes outputs.

## Manual validation

Manual validation may call real Codex. Do not upload resulting logs if they contain private prompts, private code, or local paths.
