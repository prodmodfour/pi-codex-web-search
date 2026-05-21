# AGENTS.md

You are working in an autonomous, ticket-driven build system for a Pi extension package.

General build rules come from the autonomous-build-template. Project-specific instructions live in `PROJECT_BRIEF.md`.

## Required reading

Before making changes, read:

* `AGENTS.md`
* `PROJECT_BRIEF.md`
* `BUILD_TICKETS.md`
* `BUILD_NOTES.md`
* relevant docs under `docs/`

## Core workflow

When invoked by the build loop:

1. Select the lowest-numbered `TODO` or `IN_PROGRESS` ticket from `BUILD_TICKETS.md`.
2. Implement only that ticket.
3. Do not start future tickets.
4. Do not broaden scope.
5. Add or update tests/validation where appropriate.
6. Add or update docs where appropriate.
7. Run `scripts/quality-gate.sh`.
8. Update `BUILD_TICKETS.md`.
9. Update `BUILD_NOTES.md`.
10. Commit the completed ticket with a conventional commit message.
11. Leave the working tree clean.

## Project-specific rules

This project builds a Pi extension that calls the Codex CLI for web search.

Do:

* treat the Codex CLI as an external executable
* use non-shell subprocess APIs such as `execFile` or `spawn` with argv arrays
* default to `codex exec --sandbox read-only`
* use `--search` only when live web search is requested
* use fake executables/mocks for automated tests
* document manual testing that requires real Codex authentication
* keep output bounded and useful for Pi

Do not:

* read, copy, parse, print, or commit `~/.codex/auth.json`
* create or log access tokens, refresh tokens, API keys, or session files
* scrape ChatGPT Web
* create browser automation for ChatGPT Web
* bypass Codex or ChatGPT usage limits
* add an arbitrary command execution tool
* run Codex with write access unless a future ticket explicitly proves it is necessary

## Research guidance

If current external docs are needed and Codex CLI is installed/authenticated, research may be done with a constrained command like:

```bash
codex exec --search --skip-git-repo-check --sandbox read-only "Research X. Return concise notes and source URLs."
```

Keep research notes in docs only when useful. Do not paste secrets or private machine paths into prompts.

## If blocked

If you cannot complete the ticket safely:

* explain the blocker in `BUILD_NOTES.md`
* mark the ticket `BLOCKED` if appropriate
* do not mark it `DONE`
* do not commit broken partial work
* leave the working tree clean if possible

## Scope control

Do not:

* start future tickets
* silently change project goals
* rewrite unrelated code
* add unnecessary dependencies
* add speculative features
* remove safety checks
* bypass quality gates
* commit generated/private files unless explicitly required

## Safety rules

Never commit:

* real secrets
* credentials
* access tokens
* private keys
* real `.env` files
* private data
* internal hostnames
* internal URLs
* employer/client data
* Terraform state
* generated cloud plans
* Codex `auth.json`
* `.agent/logs`
* `node_modules`
* `dist` unless the project brief and package strategy are intentionally changed
* `coverage`

## Documentation rules

Update docs when behaviour, setup, architecture, operations, security posture, limitations, or public-facing usage changes.

Prefer clear, honest limitations over pretending the package is production-ready.

## Testing and validation

Use the project’s quality gates.

If a project-specific gate does not exist yet, improve `scripts/quality-gate.sh` or document why the gate is not applicable.

Tests must not require a real Codex login by default. Real Codex tests belong in manual validation docs or opt-in scripts.

## Commit style

Use conventional commits:

```text
chore:
feat:
fix:
test:
docs:
refactor:
ci:
build:
```

Examples:

```text
chore: bootstrap extension package
feat: add codex runner
feat: register codex web search tool
test: cover jsonl parser
docs: add manual validation guide
ci: add quality workflow
```

## Completion

A project is complete only when:

* the final ticket is done
* quality gates pass
* docs match implementation
* safety constraints are respected
* the top-level `AUTOMATION_STATUS` in `BUILD_TICKETS.md` is set to `DONE`
