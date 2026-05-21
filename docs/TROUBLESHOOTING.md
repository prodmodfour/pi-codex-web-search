# Troubleshooting

Use this guide when `pi-codex-web-search` does not load, does not call Codex, or returns an unexpected `codex_web_search` failure. The automated test suite does **not** require Pi, a real Codex CLI, Codex authentication, or network access; real live-search troubleshooting belongs in local/manual validation.

Safety reminders:

* Do not open, copy, paste, upload, or share `~/.codex/auth.json`.
* Do not commit terminal logs containing private prompts, account diagnostics, local paths, raw Codex stderr, or raw JSONL events.
* Keep `PI_CODEX_WEB_SEARCH_CODEX_BINARY` pointed at a trusted Codex executable only.
* Web results are untrusted; verify cited sources before acting on high-impact answers.

## Quick triage

From the repository root, check the local package first:

```bash
npm install
npm test
npm run pack:check
```

Those commands should pass without a real Codex login. Then check the runtime tools from the same terminal that will launch Pi:

```bash
node --version
pi --version
codex --version
```

If Pi loads but the extension does not seem active, run this inside Pi:

```text
/codex-web-search
```

Expected result: a static help notification for `codex_web_search`. This help command must not execute Codex.

## Error-code map

The tool formats failed calls with a stable code such as `Codex web search failed (codex_timeout).` Use the code to narrow the cause.

| Code | Usual cause | First fix |
| --- | --- | --- |
| `invalid_input` | Missing/empty `query`, unknown parameter, invalid mode/timeout/output limit, or invalid config default. | Retry with documented parameters; unset invalid `PI_CODEX_WEB_SEARCH_*` values. |
| `codex_not_found` | Pi's environment cannot find the configured Codex executable. | Install Codex or set `PI_CODEX_WEB_SEARCH_CODEX_BINARY` before launching Pi. |
| `codex_timeout` | Codex did not finish within `timeoutMs`. | Ask a narrower query or raise `timeoutMs` within `1000..300000`. |
| `codex_nonzero_exit` | Codex exited with an error, commonly authentication, account/search availability, or network failure. | Run a direct `codex exec --search ...` smoke test in the same shell and fix Codex first. |
| `codex_output_too_large` | Codex stdout/stderr exceeded the runner process buffer. | Ask for a narrower answer or fewer sources. |
| `codex_parse_error` | `codex exec --json` output was malformed or schema-incompatible. | Retry once; update Codex/extension; report a sanitized fixture if persistent. |
| `codex_missing_final_message` | Codex JSONL completed without a final assistant/agent message. | Retry once; verify the installed Codex supports `codex exec --json`. |
| `codex_cancelled` | Pi or the caller cancelled the tool call. | Retry if the cancellation was not intentional. |
| `unknown_error` | Unexpected subprocess failure before a structured result. | Retry once, then check the local Codex CLI and sanitized diagnostics. |

The formatted tool output intentionally omits raw stderr, query text, argv, and local/private paths. If you collect extra diagnostics manually, sanitize them before sharing.

## Pi is missing or cannot load packages

Symptoms:

* `pi --version` fails.
* `pi -e .` fails before showing the normal Pi session.
* `/codex-web-search` is not recognized after launching Pi with the package.

Checks and fixes:

```bash
command -v pi
pi --version
```

* Install or repair Pi using the normal Pi installation path for your environment.
* Launch Pi from a terminal where `pi` is on `PATH`.
* Use an absolute package path when testing outside the repository root:

  ```bash
  pi -e /absolute/path/to/pi-codex-web-search
  ```

* For a project-local install, run the install command from the Pi project directory and restart Pi:

  ```bash
  pi install -l /absolute/path/to/pi-codex-web-search
  pi
  ```

* If only repository tests are failing, Pi should not be required; automated tests use mocks and the checked-in fake Codex fixture. A test that requires a real Pi install by default is a regression.

## Package loading failures

Symptoms:

* Pi starts but does not register `/codex-web-search` or `codex_web_search`.
* Pi reports an extension load error.
* Pi fails while reading package metadata.

Checks and fixes:

1. Confirm you are loading the package root, not only `src/` or `docs/`:

   ```bash
   test -f package.json
   node -e "console.log(require('./package.json').pi)"
   ```

   The manifest should list `./extensions/codex-web-search.ts`.

2. Run the local quality checks:

   ```bash
   npm install
   npm run typecheck
   npm test
   npm run pack:check
   ```

3. Check for invalid extension configuration. The package validates config while registering the tool, so a bad environment variable can prevent the extension from loading.

   Supported variables:

   | Environment variable | Accepted values |
   | --- | --- |
   | `PI_CODEX_WEB_SEARCH_CODEX_BINARY` | Non-empty string without null bytes. |
   | `PI_CODEX_WEB_SEARCH_DEFAULT_MODE` | `live` or `cached`. |
   | `PI_CODEX_WEB_SEARCH_TIMEOUT_MS` | Integer from `1000` to `300000`. |
   | `PI_CODEX_WEB_SEARCH_MAX_OUTPUT_CHARS` | Integer from `500` to `50000`. |
   | `PI_CODEX_WEB_SEARCH_SANDBOX` | `read-only` only. |

   Unset a variable to return to the built-in default.

4. If local path loading fails after moving the checkout, reinstall with the new path. Pi local path package entries point at the original checkout.

5. If git or npm loading fails, verify that the source is pinned to the intended commit/tag/version and that the shipped package includes `extensions/`, `src/`, `docs/`, and `README.md`.

## Codex CLI is missing

Symptoms:

* `codex --version` fails in the terminal that launches Pi.
* The tool returns `Codex web search failed (codex_not_found).`

Checks and fixes:

```bash
command -v codex
codex --version
```

Install Codex if needed:

```bash
npm install -g @openai/codex
codex --version
```

If Codex is installed in a non-standard location, set an explicit trusted path before launching Pi:

```bash
export PI_CODEX_WEB_SEARCH_CODEX_BINARY=/absolute/path/to/codex
pi -e /absolute/path/to/pi-codex-web-search
```

Do not set `PI_CODEX_WEB_SEARCH_CODEX_BINARY` to a credential file, shell snippet, or untrusted wrapper.

## Codex is unauthenticated

Symptoms:

* Direct `codex exec ...` asks you to log in or exits with an authentication error.
* The Pi tool returns `codex_nonzero_exit` even though `codex --version` works.

Fix:

```bash
codex login
```

Then run a direct smoke test before retrying inside Pi:

```bash
codex exec --search --skip-git-repo-check --sandbox read-only "Search the web for the current UTC date. Return one sentence and one public source URL."
```

Do not inspect or share `~/.codex/auth.json`; authentication storage belongs to the Codex CLI.

## Live search, cached mode, and disabled web search

Symptoms:

* You expected fresh sources, but the answer looks stale or has no source URLs.
* Direct Codex reports that web search is unavailable.
* You are unsure whether the extension passed Codex `--search`.

How the extension decides:

* `mode: "live"` emits Codex `--search`.
* `mode: "cached"` omits Codex `--search` while still invoking the Codex CLI.
* If a tool call omits `mode`, the default is `live` unless `PI_CODEX_WEB_SEARCH_DEFAULT_MODE=cached` was set before Pi started.

Checks and fixes:

```bash
# Check the direct live-search path outside Pi.
codex exec --search --skip-git-repo-check --sandbox read-only "Search the web for the current UTC date. Return one sentence and one public source URL."

# Check whether a session default is forcing cached mode.
printf '%s\n' "$PI_CODEX_WEB_SEARCH_DEFAULT_MODE"
```

In Pi, ask explicitly:

```text
Use codex_web_search with mode live to search the web for the latest Node.js LTS release line. Include source URLs.
```

If your Codex CLI, account, region, network, or organization policy does not allow web search, this extension cannot bypass that restriction.

## Timeouts and max output handling

There are two separate limits:

* `timeoutMs` limits how long the Codex subprocess may run. Default: `120000`; accepted range: `1000..300000`.
* `maxOutputChars` limits the formatted Pi tool text. Default: `12000`; accepted range: `500..50000`.

The runner also has an internal 2 MiB stdout/stderr process buffer. That buffer is not a public tool parameter.

Timeout symptoms and fixes:

* Tool output says `codex_timeout`.
* Direct Codex eventually succeeds but takes longer than the extension timeout.

Use a narrower query or increase the per-call timeout:

```text
Use codex_web_search with mode live and timeoutMs 180000 to search for <narrow question>. Include source URLs.
```

Or set a session default before launching Pi:

```bash
export PI_CODEX_WEB_SEARCH_TIMEOUT_MS=180000
pi -e /absolute/path/to/pi-codex-web-search
```

Output-limit symptoms and fixes:

* Tool output ends with `[Output truncated to N characters.]` — the formatted Pi result hit `maxOutputChars`.
* Tool output says `codex_output_too_large` — Codex produced too much process output before parsing/formatting.

Ask for fewer bullets, fewer sources, or a narrower answer. Increase `maxOutputChars` only when the model truly needs a longer returned answer:

```text
Use codex_web_search with maxOutputChars 20000 to summarize <question> in 6 bullets with source URLs.
```

## Network, proxy, and account-limit failures

Symptoms:

* Direct `codex exec --search ...` fails with DNS, proxy, TLS, rate-limit, usage-limit, or account availability errors.
* Pi returns `codex_nonzero_exit` and the formatted diagnostics show stderr was omitted.

Checks and fixes:

* Retry the direct Codex smoke test from the same terminal that launches Pi.
* Confirm network, VPN, proxy, firewall, and TLS-interception settings.
* Export required proxy variables before launching Pi so the Codex subprocess inherits them.
* Check your Codex/ChatGPT plan limits and organization/account search availability.
* Retry later if the failure is service-side or rate-limit related.

This package cannot bypass Codex, ChatGPT, network, account, or usage limits.

## Windows and path considerations

Native Windows support has not been fully validated for this package. The extension intentionally uses Node `execFile` with `shell: false`; this is safer for shell injection, but it means shell aliases and some npm `.cmd` shims may not behave the same way they do in an interactive terminal.

Recommendations:

* Prefer Linux, macOS, or WSL for current validation.
* Launch Pi from the same shell where `pi --version` and `codex --version` work.
* If a path contains spaces, set it as one environment-variable value; do not add shell quotes inside the value.
* On PowerShell, set environment variables before launching Pi. Use a real trusted executable path if your Codex installation provides one; do not include extra shell quotes inside the value:

  ```powershell
  $env:PI_CODEX_WEB_SEARCH_CODEX_BINARY = "C:\Tools\Codex\codex.exe"
  $env:PI_CODEX_WEB_SEARCH_TIMEOUT_MS = "180000"
  pi -e C:\path\to\pi-codex-web-search
  ```

* If native Windows can run `codex --version` in the shell but the extension still returns `codex_not_found` or `unknown_error`, try WSL or a trusted real executable path instead of a shell alias/npm `.cmd` shim, and report sanitized details.

Do not switch the extension to shell command execution to work around path issues; preserving argv-array execution is a project safety requirement.

## Maintainer diagnostics

For repository maintainers:

* Run `scripts/quality-gate.sh` before committing. It should not require real Codex authentication.
* If a default test tries to call real `codex`, treat that as a bug; tests should use injected executors or `test/fixtures/fake-codex.mjs`.
* Use `includeRawEvents: true` only for bounded debugging in a trusted local session. Raw events may contain prompt/result data and should not be committed.
* When reporting parser failures, provide a minimized sanitized JSONL fixture rather than full real Codex logs.
* Re-check [`docs/SECURITY.md`](SECURITY.md) before changing subprocess execution, sandbox policy, diagnostics, package contents, or credential handling.

## Manual validation

Once local troubleshooting passes, follow [`MANUAL_VALIDATION.md`](MANUAL_VALIDATION.md) for the full real-Codex/Pi validation path. That guide is intentionally manual because it requires local Codex authentication, network access, and may consume Codex/ChatGPT plan limits.
