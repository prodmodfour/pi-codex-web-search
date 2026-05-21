# Pi Codex Web Search — Autonomous Build System

This repository scaffold is a customised autonomous-build-system for building a Pi extension that gives Pi a `codex_web_search` tool.

The extension goal is to let Pi call the local Codex CLI for web search, so web lookups can use your ChatGPT/Codex account rather than OpenAI API web-search billing.

## What this build system does

It uses the ticket-driven loop from `prodmodfour/autonomous-build-template`:

1. read the project control files
2. select the lowest-numbered `TODO` or `IN_PROGRESS` ticket
3. implement only that ticket
4. run `scripts/quality-gate.sh`
5. update tickets and notes
6. commit the result
7. leave the working tree clean

The customised ticket runway starts with a blank extension package and walks the agent through research, TypeScript package setup, Codex runner safety, JSONL parsing, Pi tool registration, fake-Codex integration tests, docs, packaging, and final review.

## Prerequisites

Install locally:

```bash
npm install -g --ignore-scripts @earendil-works/pi-coding-agent
npm install -g @openai/codex
codex login
```

Then confirm both commands are available:

```bash
pi --help
codex exec --skip-git-repo-check --sandbox read-only "Reply with OK."
```

`codex login` should authenticate with your ChatGPT/Codex account. Do **not** put `~/.codex/auth.json` in this repo, in tickets, or in logs.

## Quick start

```bash
# from this extracted directory
git init
git add .
git commit -m "chore: initialise autonomous build system"

scripts/quality-gate.sh
scripts/build-loop.sh --max-cycles 1 --allow-ahead
```

Run a larger runway when the first cycle looks sane:

```bash
scripts/build-loop.sh --max-cycles 30 --allow-ahead
```

Add `--push` only after you have a remote configured and are happy with the generated commits.

## Intended final package

The autonomous build should produce a Pi package roughly like this:

```text
package.json                 pi package manifest
extensions/codex-web-search.ts
src/codex/CodexRunner.ts
src/codex/CodexJsonlParser.ts
src/pi/registerCodexWebSearchTool.ts
test/...
docs/INSTALL.md
docs/SECURITY.md
docs/USAGE.md
```

The extension should register a Pi tool named `codex_web_search`. The tool should call `codex exec` via `execFile`, never via shell string interpolation, and should default to a read-only Codex sandbox.

## Safety notes

This project intentionally avoids:

* scraping ChatGPT Web
* bypassing Codex usage limits
* reading or storing Codex auth tokens
* committing secrets, `.env` files, `auth.json`, logs, `node_modules`, build output, or coverage output
* arbitrary command execution beyond the constrained Codex CLI invocation needed for the tool
