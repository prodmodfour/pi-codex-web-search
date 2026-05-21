# Pi Codex Web Search Extension

`pi-codex-web-search` is a TypeScript Pi package for a `codex_web_search` tool. The package is intended to let Pi call the local Codex CLI for web-enabled answers while relying on the user's existing Codex/ChatGPT authentication.

When Codex is authenticated with a ChatGPT/Codex account, live searches made through this extension may consume that account's Codex/ChatGPT plan limits. They do not use OpenAI API web-search billing by default, and this package cannot bypass Codex, ChatGPT, account, or network limits.

> Status: build in progress. The current package registers `codex_web_search` plus a `/codex-web-search` help command, validates tool parameters and safe configuration, runs the bounded Codex subprocess pipeline, parses `codex exec --json` output, formats concise Pi tool results, covers the path with a fake-Codex executable integration harness, and documents installation plus manual real-Codex validation.

## Current package shape

```text
package.json                         # npm metadata plus the pi.extensions manifest
extensions/codex-web-search.ts       # Pi extension entrypoint that registers codex_web_search
src/index.ts                         # shared package metadata and exported API/argv/registration contracts
src/tool/codexWebSearchApi.ts        # codex_web_search input/result types and validation
src/config/codexWebSearchConfig.ts   # documented env/project config loading and validation
src/codex/buildCodexArgs.ts          # safe codex exec argv construction
src/codex/CodexRunner.ts             # execFile-based Codex subprocess runner
src/codex/CodexJsonlParser.ts        # parser for codex exec --json JSONL events
src/output/formatToolResult.ts            # bounded Pi tool-result formatting
src/pi/registerCodexWebSearchHelpCommand.ts # optional /codex-web-search help command
src/pi/registerCodexWebSearchTool.ts      # Pi tool registration and execution wiring
test/package-shape.test.mjs               # smoke tests for the package skeleton
test/fake-codex-integration.test.mjs      # fake Codex executable integration coverage
test/fixtures/fake-codex.mjs              # deterministic fake codex exec fixture
docs/                                # install, example fixture, design, security, usage, validation, and quality-gate notes
scripts/quality-gate.sh              # local validation gate used by the build loop
scripts/check-package-contents.mjs   # npm dry-run package contents validator
```

The Pi manifest currently points to the TypeScript entrypoint:

```json
{
  "pi": {
    "extensions": ["./extensions/codex-web-search.ts"]
  }
}
```

Pi loads TypeScript extensions through its extension runtime, so this scaffold ships TypeScript source rather than compiled JavaScript. The frozen Pi extension/package assumptions for this build are documented in [`docs/EXTENSION_SPEC.md`](docs/EXTENSION_SPEC.md).

## Install and load in Pi

Review the source before installing any Pi package: extensions execute with local user permissions. Install and authenticate Codex only if you want real live search:

```bash
npm install -g @openai/codex
codex login
```

Local checkout, one-session load:

```bash
git clone <repo-url> pi-codex-web-search
cd pi-codex-web-search
npm install
npm test
pi -e .
```

Local checkout, project install:

```bash
pi install -l /absolute/path/to/pi-codex-web-search
pi
```

Git source, project install:

```bash
pi install -l git:github.com/<owner>/pi-codex-web-search@<tag-or-commit>
pi
```

npm-style source after the package is published:

```bash
pi install -l npm:pi-codex-web-search@0.0.0
pi
```

Use `pi install ...` without `-l` for a global user install, or `pi -e ...` for a temporary one-session load. The repository package version is currently `0.0.0`; replace it with the published version you intend to run. Detailed local, git, npm, manifest, and auto-discovery notes are in [`docs/INSTALLATION.md`](docs/INSTALLATION.md). A docs-only throwaway project fixture is in [`docs/EXAMPLE_LOCAL_PI_PROJECT.md`](docs/EXAMPLE_LOCAL_PI_PROJECT.md).

After loading, run `/codex-web-search` in Pi to confirm the help command is registered.

## Development prerequisites

Install Node.js 20+ and npm. Pi and Codex are only needed for later manual validation; automated checks use mocks and a fake Codex executable fixture and do not require a real Codex login.

```bash
npm install
npm run typecheck
npm test
npm run pack:check
```

Run the repository quality gate before committing changes:

```bash
scripts/quality-gate.sh
# or
npm run quality
```

The gate runs shell syntax checks, secret and generated-file guardrails, npm validation scripts, and a package dry-run with package-contents validation. See [`docs/QUALITY_GATE.md`](docs/QUALITY_GATE.md) for the full checklist and [`docs/RELEASE.md`](docs/RELEASE.md) for release packaging steps.

GitHub Actions runs the same quality gate on pushes, pull requests, and manual workflow dispatches through `.github/workflows/quality.yml`. CI is intentionally limited to fake-Codex/mocked automated coverage and does not install Pi, authenticate Codex, perform live web search, or publish the package; use [`docs/MANUAL_VALIDATION.md`](docs/MANUAL_VALIDATION.md) for real local Codex/Pi validation.

## Current tool behavior

The extension registers a Pi tool named `codex_web_search` that:

* validates user input and documented configuration before invoking Codex
* accepts `query`, optional `mode`, `timeoutMs`, `maxOutputChars`, and `includeRawEvents`
* defaults `mode` to `live`, Codex binary to `codex`, read-only Codex sandbox, JSONL output, 120s timeout, 2 MiB subprocess buffer, and 12k formatted output chars
* executes `codex exec` with argv arrays, never shell-interpolated strings
* uses Codex `--search` only when normalized mode is `live`
* passes the prompt after an end-of-options `--` separator so prompt text stays positional even when it starts with dashes
* bounds subprocess time and stdout/stderr buffers with `execFile` options
* maps missing binary, timeout, non-zero exit, oversized output, cancellation, and parser failures to structured errors
* parses `codex exec --json` JSONL, using the last completed agent message as the answer and preserving stderr diagnostics separately
* formats parsed Codex output into concise Pi tool results with source URLs/snippets when available
* bounds returned Pi tool text with a truncation notice
* throws sanitized Pi tool failures for invalid input, missing Codex, timeout, non-zero exit, oversized output, cancellation, parser failures, or unknown errors

## Prompt examples

Prompts that should trigger `codex_web_search` are the ones that need current, source-backed web information. Examples:

```text
Use the codex_web_search tool in live mode to find the latest Node.js LTS release line. Return two concise bullets with source URLs.
```

```text
Use codex_web_search to check the current Pi package installation docs and summarize the commands for local, git, and npm sources.
```

```text
Use codex_web_search with mode cached to answer from Codex's existing context only: what does this extension do? Keep it brief.
```

Prefer `mode: "live"` when freshness matters. Use `mode: "cached"` only when you intentionally want to omit Codex `--search`.

## Configuration

The package entrypoint reads only these documented environment variables. Explicit in-process/project config passed to `registerCodexWebSearchTool(pi, { config })` takes precedence over environment values; tool-call parameters still take precedence over configured defaults for `mode`, `timeoutMs`, and `maxOutputChars`.

| Setting | Environment variable | Default | Validation |
| --- | --- | --- | --- |
| Codex binary | `PI_CODEX_WEB_SEARCH_CODEX_BINARY` | `codex` | non-empty string without null bytes |
| Default mode | `PI_CODEX_WEB_SEARCH_DEFAULT_MODE` | `live` | `live` or `cached` |
| Default timeout | `PI_CODEX_WEB_SEARCH_TIMEOUT_MS` | `120000` | integer from `1000` to `300000` |
| Default max output | `PI_CODEX_WEB_SEARCH_MAX_OUTPUT_CHARS` | `12000` | integer from `500` to `50000` |
| Sandbox | `PI_CODEX_WEB_SEARCH_SANDBOX` | `read-only` | currently only `read-only` |

The configuration layer does not read Codex credentials, `~/.codex/auth.json`, `$HOME`, or arbitrary config files.

## Help command

When loaded in Pi, the extension also registers `/codex-web-search`. The command displays concise usage help for `codex_web_search`, including parameters, defaults, the read-only live-search invocation shape, and the reminder that the extension never reads Codex credential files. It is informational only and does not execute Codex.

## Caveats

* Real web search depends on the installed Codex CLI, local `codex login` state, network access, and account-level search availability.
* Codex CLI arguments and JSONL event shapes can change; automated tests use representative fake-Codex fixtures, while real behavior needs manual validation.
* The package currently targets local single-user Pi usage, not remote or multi-user execution.
* The only supported Codex sandbox is `read-only`; write-capable Codex execution is intentionally unsupported.
* The extension does not scrape ChatGPT Web, automate browsers, bypass usage limits, or provide a generic command-execution tool.

## Safety notes

See [`docs/SECURITY.md`](docs/SECURITY.md) for the full threat model, residual risks, and recommended safe defaults.

This project must never read, copy, log, or commit Codex credentials such as `~/.codex/auth.json`. Authentication remains the Codex CLI's responsibility.

The current argv builder returns arguments for `CodexRunner`, which calls the configured Codex executable with `execFile` and `shell: false`. Its default live-search shape is:

```text
["exec", "--json", "--search", "--skip-git-repo-check", "--sandbox", "read-only", "--", query]
```

`mode: "cached"` omits `--search`; `skipGitRepoCheck: false` omits `--skip-git-repo-check`. The only currently allowed sandbox value is `read-only`.

`CodexRunner` defaults to the PATH-resolved `codex` binary unless the validated configuration supplies `PI_CODEX_WEB_SEARCH_CODEX_BINARY` or an explicit project config override. It passes the normalized timeout and max-buffer limits to `execFile` and keeps process errors structured without copying argv or query text into error messages.

`CodexJsonlParser` parses only stdout JSONL records, tolerates unknown event types, captures web-search summaries when Codex emits them, and keeps stderr in diagnostics rather than mixing it into the answer text. Malformed JSONL and missing final-agent-message cases use structured parser errors.

`formatCodexWebSearchToolResult` converts normalized success/failure results into Pi text content plus structured details. The formatter includes source URLs/snippets when available, enforces `maxOutputChars`, adds a truncation notice, and omits raw stderr/query text from user-facing error output.

Automated tests use mocks or the deterministic fake executable under `test/fixtures/fake-codex.mjs`. Runtime troubleshooting is documented in [`docs/TROUBLESHOOTING.md`](docs/TROUBLESHOOTING.md). Real Codex validation is documented in [`docs/MANUAL_VALIDATION.md`](docs/MANUAL_VALIDATION.md) and requires a local user who has installed Codex and run `codex login`.
