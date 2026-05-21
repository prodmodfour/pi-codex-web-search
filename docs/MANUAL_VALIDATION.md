# Manual Real-Codex Validation

This guide is for a human validator with local Pi and Codex access. It is intentionally **not** part of the automated quality gate because it requires a real Codex CLI installation, user authentication, network access, and may consume Codex/ChatGPT plan limits.

## Safety reminders

* Do not open, copy, paste, upload, or share `~/.codex/auth.json`.
* Do not commit terminal logs that include private prompts, private source paths, Codex stderr, or account-specific details.
* Run these commands only on a machine where you are comfortable allowing the local Codex CLI to perform read-only web-search work.
* The extension invokes Codex with `--sandbox read-only`; do not change that for this validation.

## Prerequisites

* Node.js 20+ and npm.
* Pi installed and available as `pi`.
* A model/provider configured in Pi so Pi can decide to call tools.
* This repository checked out locally.
* Codex CLI installed and authenticated as the local user.

Verify the local tools first:

```bash
node --version
npm --version
pi --version
```

## Final validation checklist

A human validator should run and record these items locally. Keep any notes private when they include account details, private prompts, local paths, or Codex diagnostics.

- [ ] From the repository root, run `scripts/quality-gate.sh` and confirm it passes without requiring Pi, real Codex authentication, or live web search.
- [ ] Confirm the local runtime tools: `node --version`, `npm --version`, `pi --version`, and `codex --version`.
- [ ] Install/authenticate Codex if needed with `npm install -g @openai/codex` and `codex login`; do not inspect or share `~/.codex/auth.json`.
- [ ] Run the opt-in authenticated smoke test: `npm run smoke:codex`.
- [ ] Load the package in Pi with `pi -e .` from the checkout, or `pi install -l /path/to/pi-codex-web-search` from a throwaway Pi project.
- [ ] In Pi, run `/codex-web-search` and confirm the static help appears without executing Codex.
- [ ] Ask Pi to call `codex_web_search` in `live` mode and confirm the result is concise and includes public source URLs when Codex provides them.
- [ ] Optionally ask for `mode: "cached"` and confirm the extension omits Codex `--search` for that call.
- [ ] Copy the sanitized pass/fail summary into the validation record template at the end of this guide; do not commit raw terminal logs.

## 1. Install and authenticate Codex

Install the Codex CLI if it is not already available:

```bash
npm install -g @openai/codex
codex --version
```

Authenticate with your own Codex/ChatGPT account:

```bash
codex login
```

Follow the CLI prompts. Do not inspect or share Codex credential files; authentication storage is owned by Codex, not this extension.

## 2. Run the opt-in Codex web-search smoke test

Before loading Pi, confirm that Codex itself can perform a harmless live web search. From the repository root, run the manual smoke script:

```bash
npm run smoke:codex
```

Equivalent direct invocation:

```bash
node scripts/smoke-real-codex-search.mjs
```

The script is **not part of the automated quality gate** and must be run only by a human who has installed and authenticated Codex. It checks `codex --version`, then runs this reviewed read-only shape with an argv array and `shell: false`:

```text
codex exec --search --skip-git-repo-check --sandbox read-only -- <harmless query>
```

The harmless query asks for the current UTC date in one sentence with one public source URL. The script uses `PI_CODEX_WEB_SEARCH_CODEX_BINARY` if you need a trusted non-default Codex executable path and `PI_CODEX_WEB_SEARCH_TIMEOUT_MS` if you need a longer timeout. It does not inspect `~/.codex/auth.json`, does not write log files, and omits raw stderr/stdout from failed Codex runs to avoid leaking account, prompt, or path details.

Expected success shape:

```text
Codex real web-search smoke test passed.
Bounded stdout preview:
The current UTC date is <date>. Source: https://...
```

The exact wording and source will vary. A successful result should show that `codex exec` ran, `--search` was accepted, and Codex returned a concise answer with a public source URL.

If the smoke script fails, fix Codex before testing the Pi extension; the extension delegates authentication and live web-search capability to the local Codex CLI. For private local troubleshooting, you may run the direct command yourself, but do not commit the terminal output:

```bash
codex exec --search --skip-git-repo-check --sandbox read-only -- "Search the web for the current UTC date. Return one sentence and one public source URL."
```

## 3. Prepare the package checkout

From the repository root:

```bash
npm install
npm run typecheck
npm test
npm run pack:check
```

These checks do not call real Codex. They confirm that the local checkout is healthy before manual validation.

If Codex is not on `PATH` from the shell that starts Pi, set the documented binary override before launching Pi:

```bash
export PI_CODEX_WEB_SEARCH_CODEX_BINARY=/absolute/path/to/codex
```

Optional longer timeout for slower networks:

```bash
export PI_CODEX_WEB_SEARCH_TIMEOUT_MS=180000
```

## 4. Load the package in Pi locally

Use one of these local loading paths. Replace `/path/to/pi-codex-web-search` with the repository path on your machine; do not commit machine-specific paths.

### Temporary one-session load

From the repository root:

```bash
pi -e .
```

Or from any directory:

```bash
pi -e /path/to/pi-codex-web-search
```

This uses the package `pi.extensions` manifest and does not install the package into Pi settings.

### Project-local install

From a throwaway Pi project directory:

```bash
pi install -l /path/to/pi-codex-web-search
pi
```

This writes a project-local `.pi/settings.json` entry that points at the local checkout. The package is loaded from the original path rather than copied. A docs-only example of the throwaway project shape and expected package entry is available in [`EXAMPLE_LOCAL_PI_PROJECT.md`](EXAMPLE_LOCAL_PI_PROJECT.md).

## 5. Confirm the help surface loads

In interactive Pi, run:

```text
/codex-web-search
```

Expected notification excerpt:

```text
codex_web_search help

Use codex_web_search when you need current, source-backed web information through the local Codex CLI.
...
Default live invocation: codex exec --json --search --skip-git-repo-check --sandbox read-only -- <query>
Prerequisites: install the Codex CLI and run codex login. This extension never reads Codex credential files.
```

This command must not execute Codex. It only confirms that the extension loaded and registered its static help command.

## 6. Run a Pi tool-call smoke test

Ask Pi to use the tool explicitly:

```text
Use the codex_web_search tool in live mode to search the web for the latest Node.js LTS release line. Return two concise bullets and include source URLs.
```

Expected behavior:

* Pi shows or records a `codex_web_search` tool call.
* The tool call uses `mode: "live"` unless you configured a different default and explicitly override it.
* The extension invokes Codex in the reviewed shape: `codex exec --json --search --skip-git-repo-check --sandbox read-only -- <query>`.
* The final tool result contains a concise answer and, when Codex provides citations, a `Sources:` section.

Expected result shape:

```text
<concise answer from Codex>

Sources:
1. <source title> — https://...
   <optional snippet>
```

The exact answer and URLs will vary. Treat the web result as untrusted until you verify the cited sources yourself.

## 7. Optional cached-mode comparison

To confirm that live search is controlled by the tool parameter, ask:

```text
Use the codex_web_search tool with mode cached to answer: What does this extension do? Keep it brief.
```

Expected behavior: the tool still runs through Codex, but the extension omits Codex `--search` for that call. Cached mode is useful only when you intentionally do not want a live web search.

## Troubleshooting manual validation

### Codex CLI is missing

Symptoms:

* `codex --version` fails.
* Pi tool output says `Codex web search failed (codex_not_found).`
* The formatted action says to install Codex and ensure `codex` is on `PATH`.

Checks and fixes:

```bash
command -v codex
npm install -g @openai/codex
codex --version
```

If the binary exists in a non-standard location, start Pi with:

```bash
export PI_CODEX_WEB_SEARCH_CODEX_BINARY=/absolute/path/to/codex
pi -e /path/to/pi-codex-web-search
```

### Codex is unauthenticated

Symptoms:

* The opt-in smoke script or direct `codex exec --search ...` test asks you to log in or exits with an authentication error.
* Pi tool output says `Codex web search failed (codex_nonzero_exit).`

Fix:

```bash
codex login
```

Then rerun `npm run smoke:codex` from the checkout, or the direct Codex smoke test, before retrying in Pi. Do not copy, inspect, paste, or share `~/.codex/auth.json` while troubleshooting.

### Web search is disabled or cached/live mode is confused

Symptoms:

* The opt-in smoke script or direct Codex smoke test reports that web search is unavailable.
* Pi answers without fresh sources when you expected live search.
* You see no indication that `--search` was used.

Checks and fixes:

* Confirm the direct command includes `--search` and succeeds outside Pi.
* In Pi, ask for `mode: "live"` explicitly.
* Check that `PI_CODEX_WEB_SEARCH_DEFAULT_MODE` is unset or set to `live` before launching Pi.
* Ensure the installed Codex CLI version supports `codex exec --search`.
* If your Codex account or environment does not allow web search, this extension cannot bypass that restriction.

### Network failures

Symptoms:

* Direct Codex search fails with connectivity, DNS, proxy, or TLS errors.
* Pi reports `codex_nonzero_exit` even though Codex is installed and authenticated.

Checks and fixes:

* Retry `npm run smoke:codex` from the checkout, or the direct `codex exec --search ...` command from the same terminal.
* Check local network, VPN, proxy, and firewall settings.
* If your shell needs proxy variables, export them before launching Pi so the Codex subprocess inherits them.
* Retry with a narrower query after network connectivity is restored.

### Timeouts

Symptoms:

* Pi tool output says `Codex web search failed (codex_timeout).`
* Direct Codex search eventually succeeds, but takes longer than the extension timeout.

Fixes:

* Ask a narrower question.
* Increase the per-call timeout within the documented limit, for example `timeoutMs: 180000`.
* Or set a session default before launching Pi:

```bash
export PI_CODEX_WEB_SEARCH_TIMEOUT_MS=180000
pi -e /path/to/pi-codex-web-search
```

The extension validates timeouts from `1000` to `300000` milliseconds.

## Validation record template

Use this checklist for local notes. Keep the notes private if they include account, prompt, or path details.

```text
Date:
OS / shell:
Node version:
npm version:
Pi version:
Codex version:
Package commit:
Automated quality gate (`scripts/quality-gate.sh`): PASS / FAIL
Opt-in Codex smoke script/direct search test: PASS / FAIL
Pi package loaded with pi -e or pi install -l: PASS / FAIL
/codex-web-search help displayed: PASS / FAIL
codex_web_search live-mode tool call completed: PASS / FAIL
Sources shown in tool result: YES / NO
Optional cached-mode check: PASS / FAIL / SKIPPED
Troubleshooting notes, sanitized:
```
