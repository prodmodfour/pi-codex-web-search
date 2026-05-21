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

Ticket 004 adds safe argv construction before any subprocess execution:

* `buildCodexExecArgs` returns only the Codex argument array; it does not return
  a shell command string or spawn a process
* the prompt is the final argv element after an end-of-options `--` separator
* `--search` is emitted only for normalized `mode: "live"`
* `--skip-git-repo-check` is emitted only from the normalized boolean option
* the current sandbox allowlist contains only `read-only`; write-capable Codex
  sandboxes are rejected until a future ticket deliberately expands the policy
* null bytes, unsupported output formats, and inconsistent normalized inputs are
  rejected without echoing the query in error messages

Ticket 005 adds bounded subprocess execution:

* `CodexRunner` uses `execFile` with argv arrays and never builds a shell command
* the executor options set `shell: false`
* the executable defaults to `codex`; constructor overrides are validated as
  non-empty strings without null bytes
* normalized `timeoutMs` is passed to `execFile`
* normalized `codex.maxBufferBytes` is passed as the stdout/stderr max buffer
* missing binary, timeout, non-zero exit, max-buffer, cancellation, parser, and
  unknown failures use structured `CodexRunnerError` codes
* runner error messages do not include the argv array, prompt/query text, or raw
  stderr; stderr is preserved separately as bounded diagnostics for later
  formatting

## Web results

Treat web-search results as untrusted. Codex may read web content, and web content can contain prompt injection. The extension should ask Codex for concise answers and sources, but users should still verify high-stakes outputs.

## Manual validation

Manual validation may call real Codex. Do not upload resulting logs if they contain private prompts, private code, or local paths.
