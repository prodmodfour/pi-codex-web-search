# BUILD_TICKETS.md

AUTOMATION_STATUS: IN_PROGRESS

Ticket statuses:

* TODO
* IN_PROGRESS
* DONE
* BLOCKED

The build loop must select the lowest-numbered TODO or IN_PROGRESS ticket.

---

## 000 — Bootstrap TypeScript Pi package skeleton

Status: DONE

Create the initial TypeScript package structure for the Pi Codex web-search extension.

Required:

* `package.json` with package name, scripts, dev dependencies, and a Pi package manifest or conventional extension directory support
* `tsconfig.json` suitable for Node 20+ TypeScript
* `extensions/`, `src/`, `test/`, and `docs/` structure
* `.gitignore` aligned with Node, Pi, Codex, and this autonomous build system
* a placeholder extension entrypoint that does not yet call Codex
* README updated with the actual package shape

Run `scripts/quality-gate.sh`.

Update `BUILD_TICKETS.md` and `BUILD_NOTES.md`.

Commit when complete.

---

## 001 — Add project-specific quality and guardrail scripts

Status: TODO

Strengthen local validation before core code is built.

Required:

* ensure `scripts/quality-gate.sh` runs package install/CI, lint, typecheck, tests, build, and package dry-run when relevant
* ensure secret and generated/private-file guardrails are active
* add npm scripts that map cleanly to the quality gate
* add or update docs explaining what the gate checks

Run `scripts/quality-gate.sh`.

Update tickets and notes.

Commit when complete.

---

## 002 — Research and freeze current Pi extension contract

Status: TODO

Research the current Pi extension and package expectations, then freeze the assumptions the code will target.

Required:

* review local installed Pi types/examples if available
* optionally use Codex live search for docs with a read-only sandbox
* document extension entrypoint shape, `registerTool` shape, package manifest shape, and install paths in `docs/EXTENSION_SPEC.md`
* add a small mock Pi API type or test fixture if official types are unavailable or unstable
* do not implement Codex execution yet

Run `scripts/quality-gate.sh`.

Update tickets and notes.

Commit when complete.

---

## 003 — Define the `codex_web_search` tool API

Status: TODO

Specify the tool parameters, defaults, return format, and failure modes.

Required:

* define TypeScript types for tool input and normalized output
* document parameters such as `query`, `mode`, `timeoutMs`, `maxOutputChars`, and optional `includeRawEvents`
* decide and document defaults: live search on/off, read-only sandbox, JSONL mode, timeout, maxBuffer
* add schema validation or clear validation functions
* add unit tests for input normalization and validation

Run `scripts/quality-gate.sh`.

Update tickets and notes.

Commit when complete.

---

## 004 — Implement safe Codex argv builder

Status: TODO

Build the function that turns validated tool input into a safe `codex exec` argv array.

Required:

* never concatenate user input into a shell command
* support `--json`
* support `--search` for live-search mode
* support `--skip-git-repo-check` where appropriate for an extension running outside a repo
* default to `--sandbox read-only`
* allow only documented safe sandbox values if a config override exists
* unit tests for all argv combinations and escaping edge cases

Run `scripts/quality-gate.sh`.

Update tickets and notes.

Commit when complete.

---

## 005 — Implement Codex subprocess runner

Status: TODO

Implement `CodexRunner` to execute the safe argv with timeouts and bounded output.

Required:

* use `execFile` or `spawn`, not shell strings
* configurable Codex binary path, default `codex`
* timeout handling
* max stdout/stderr buffer handling
* structured errors for missing binary, timeout, non-zero exit, and parse failure
* unit tests using mocked process execution

Run `scripts/quality-gate.sh`.

Update tickets and notes.

Commit when complete.

---

## 006 — Add JSONL parser for `codex exec --json`

Status: TODO

Parse Codex JSONL output into stable internal result objects.

Required:

* parse line-delimited JSON safely
* extract final agent message events
* capture web-search event summaries if present
* tolerate unknown event types
* preserve useful stderr diagnostics separately
* handle malformed JSONL with a clear error or fallback path
* unit tests with representative JSONL fixtures

Run `scripts/quality-gate.sh`.

Update tickets and notes.

Commit when complete.

---

## 007 — Implement tool-result formatting

Status: TODO

Create the formatter that turns Codex output into Pi tool content.

Required:

* concise text result by default
* bounded output length with truncation notice
* include source URLs or cited source snippets if available from parsed events
* include actionable error messages without leaking environment details
* tests for normal, empty, huge, and error outputs

Run `scripts/quality-gate.sh`.

Update tickets and notes.

Commit when complete.

---

## 008 — Register the Pi tool

Status: TODO

Wire the internal implementation into a Pi extension entrypoint.

Required:

* `extensions/codex-web-search.ts` default export registers `codex_web_search`
* tool name, label, description, prompt snippet, and prompt guidelines are useful
* parameters map to the validated API from Ticket 003
* execution path calls the runner and formatter
* tests use a mock Pi object and fake runner

Run `scripts/quality-gate.sh`.

Update tickets and notes.

Commit when complete.

---

## 009 — Add optional Pi command/help surface

Status: TODO

Add a small command or documented help mechanism if Pi's extension API supports it cleanly.

Required:

* discover whether `registerCommand` is appropriate
* implement `/codex-web-search` help only if the API is straightforward
* otherwise document usage in README and leave code minimal
* tests if a command is added

Run `scripts/quality-gate.sh`.

Update tickets and notes.

Commit when complete.

---

## 010 — Add configuration handling

Status: TODO

Make safe user configuration explicit.

Required:

* environment or project config for Codex binary path, default mode, timeout, max output, and sandbox
* validation for all config values
* no config path should read Codex credentials
* docs for each setting
* unit tests for defaults, overrides, invalid values, and precedence

Run `scripts/quality-gate.sh`.

Update tickets and notes.

Commit when complete.

---

## 011 — Add fake-Codex integration test harness

Status: TODO

Test the full extension path without a real Codex login.

Required:

* create a fake `codex` executable fixture that emits representative JSONL
* run the tool through the runner using the fake binary
* assert final Pi tool output
* include failure fixtures: timeout, non-zero exit, malformed JSONL, missing final message
* ensure the tests do not call real Codex by default

Run `scripts/quality-gate.sh`.

Update tickets and notes.

Commit when complete.

---

## 012 — Add manual real-Codex validation guide

Status: TODO

Document the real-world validation path that requires local user auth.

Required:

* `docs/MANUAL_VALIDATION.md`
* setup commands for `npm install -g @openai/codex` and `codex login`
* a minimal `codex exec --search` smoke test
* instructions to install/load the Pi package locally
* expected output examples
* troubleshooting for missing Codex, unauthenticated Codex, disabled web search, network failures, and timeouts
* explicit reminder not to share `auth.json`

Run `scripts/quality-gate.sh`.

Update tickets and notes.

Commit when complete.

---

## 013 — Add installation and package docs

Status: TODO

Make the package installable and understandable.

Required:

* README install commands for local path, git, and npm-style usage where applicable
* docs for Pi package manifest and extension auto-discovery
* examples of prompts that should trigger `codex_web_search`
* clear statement that usage consumes Codex/ChatGPT plan limits, not OpenAI API billing, when Codex is authenticated with ChatGPT
* caveats about unsupported/brittle areas

Run `scripts/quality-gate.sh`.

Update tickets and notes.

Commit when complete.

---

## 014 — Add security threat model

Status: TODO

Write the project's security model and align code/docs to it.

Required:

* `docs/SECURITY.md` expanded into a threat model
* subprocess safety
* prompt-injection treatment for web results
* credential handling
* logs/artifacts
* package-install risks
* recommended safe defaults
* code changes if docs reveal a missing guardrail

Run `scripts/quality-gate.sh`.

Update tickets and notes.

Commit when complete.

---

## 015 — Add troubleshooting docs

Status: TODO

Create troubleshooting guidance for users and maintainers.

Required:

* `docs/TROUBLESHOOTING.md`
* missing Pi
* missing Codex CLI
* unauthenticated Codex
* Codex web search disabled/cached/live mode confusion
* timeout and max output handling
* package loading failures
* Windows/path considerations if relevant

Run `scripts/quality-gate.sh`.

Update tickets and notes.

Commit when complete.

---

## 016 — Add release and packaging validation

Status: TODO

Make it easy to verify what will ship.

Required:

* npm package dry-run or equivalent
* package contents check script if helpful
* ensure no private/generated files are included
* add `.npmignore` or `files` field if needed
* docs for release process without publishing secrets

Run `scripts/quality-gate.sh`.

Update tickets and notes.

Commit when complete.

---

## 017 — Add GitHub Actions quality workflow

Status: TODO

Add CI for the repository.

Required:

* `.github/workflows/quality.yml`
* run shell checks and package checks
* CI must not require real Codex login
* docs mention CI limitations and manual validation path

Run `scripts/quality-gate.sh`.

Update tickets and notes.

Commit when complete.

---

## 018 — Add example local Pi project fixture

Status: TODO

Create a tiny fixture showing how a user would install/load the package in a local Pi project.

Required:

* example project directory or docs-only fixture
* sample `.pi` package loading if appropriate
* sample user prompt and expected tool invocation behaviour
* no real external calls in automated tests

Run `scripts/quality-gate.sh`.

Update tickets and notes.

Commit when complete.

---

## 019 — Add opt-in real-Codex smoke script

Status: TODO

Provide a manual script for authenticated users to verify real Codex search.

Required:

* script must be opt-in and never run during default quality gate
* script should fail fast if Codex is unavailable or unauthenticated
* script should use read-only sandbox and a harmless query
* script should not write logs containing secrets
* docs explain when to run it

Run `scripts/quality-gate.sh`.

Update tickets and notes.

Commit when complete.

---

## 020 — Add polish pass for developer ergonomics

Status: TODO

Improve maintainability without changing core behaviour.

Required:

* tighten names, comments, types, and error messages
* ensure docs and code terminology match
* ensure tests are readable and not brittle
* remove dead code and unused dependencies
* run quality gate

Update tickets and notes.

Commit when complete.

---

## 021 — Final real-world manual validation checkpoint

Status: TODO

Prepare the repo for a human to perform final real-Codex/Pi validation.

Required:

* confirm automated tests pass without real Codex
* ensure manual validation docs are complete
* add a checklist section recording items the human should run locally
* if the agent cannot run real Codex locally, say so clearly in `BUILD_NOTES.md`; do not mark the project blocked solely because manual validation remains external

Run `scripts/quality-gate.sh`.

Update tickets and notes.

Commit when complete.

---

## 099 — Final autonomous review and completion marker

Status: TODO

Perform a final repository review.

Check:

* project brief goals are met
* all non-manual tickets are complete
* docs match implementation
* quality gates pass
* no secrets/private data are committed
* generated/private files are not committed
* package shape is clear for Pi users
* limitations are honest
* manual validation path is documented

Run full quality gate.

If everything is complete, set the top-level automation status to:

AUTOMATION_STATUS: DONE

Commit final review.

---
