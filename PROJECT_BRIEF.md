# PROJECT_BRIEF.md

TEMPLATE_CUSTOMISED: true

## Project name

Pi Codex Web Search Extension

## Project type

TypeScript Pi package plus autonomous, ticket-driven build scaffold.

## Project goal

Build a small, testable Pi extension package that adds a `codex_web_search` tool to Pi. The tool must use the local Codex CLI to perform web search, relying on the user's existing ChatGPT/Codex login where available instead of OpenAI API web-search billing.

The final package should be installable as a Pi package from npm or git and usable inside Pi as a normal tool.

## Audience

* the repository owner using Pi locally
* future maintainers who want to adapt the extension
* security-conscious users who want to review how Codex is invoked

## Success criteria

The project is successful when:

* a Pi package manifest exists and exposes the extension through the `pi.extensions` manifest key or Pi's conventional extension directory discovery
* the extension registers a tool named `codex_web_search`
* the tool accepts a search query and optional safe execution parameters
* the tool invokes `codex exec` using `execFile` or an equivalent non-shell API
* live search can be requested with Codex's `--search` flag
* the default sandbox is read-only unless the user explicitly configures otherwise
* output from Codex is parsed or formatted into a concise result suitable for Pi
* tests cover command argument construction, timeout/error handling, JSONL parsing, extension registration, and a fake-Codex integration path
* docs explain installation, local authentication, usage, configuration, limitations, and security posture
* quality gates pass without requiring real Codex authentication
* no secrets, tokens, real `.env` files, Codex auth files, private logs, `node_modules`, build output, or coverage artifacts are committed

## Non-goals

The agent must not spend time on:

* bypassing OpenAI, Codex, or ChatGPT usage limits
* scraping ChatGPT Web or automating a browser session
* creating a daemon or background service
* using OpenAI API web search as the default path
* storing, reading, logging, copying, or committing `~/.codex/auth.json`
* supporting remote or multi-user execution in the first version
* implementing a generic arbitrary shell tool
* building a UI beyond basic tool registration and optional help text

## Technology preferences

Preferred stack:

* language: TypeScript
* runtime: Node.js 20+
* package manager: npm
* testing: Vitest or Node's built-in test runner; prefer Vitest if the agent confirms it fits current Pi extension examples
* linting: ESLint or TypeScript-only linting if simpler
* type checks: `tsc --noEmit`
* package format: Pi package with `extensions/` directory and/or explicit `pi.extensions` manifest
* CI: GitHub Actions running `scripts/quality-gate.sh`

Hard constraints:

* never commit real secrets or Codex auth files
* never read `~/.codex/auth.json` in application code
* invoke Codex with argument arrays, not shell-expanded strings
* default to `codex exec --sandbox read-only`
* set a timeout and max output buffer for Codex subprocesses
* keep user query data out of logs unless explicitly returned to Pi as the tool result
* do not add dependencies unless they materially simplify the work
* keep tickets small and update `BUILD_TICKETS.md` and `BUILD_NOTES.md` every cycle

Flexible choices:

* whether to parse Codex JSONL events or consume final stdout first, as long as the implementation is tested and documented
* whether package source is pure TypeScript loaded by Pi or compiled JavaScript, as long as installation and quality gates are consistent
* whether docs use Markdown only or include generated examples

## Architecture expectations

Target architecture:

```text
extensions/codex-web-search.ts
  -> src/pi/registerCodexWebSearchTool.ts
      -> src/codex/CodexRunner.ts
          -> node:child_process execFile/spawn
      -> src/codex/CodexJsonlParser.ts
      -> src/output/formatToolResult.ts
```

Expected responsibilities:

* `extensions/codex-web-search.ts`: Pi extension entrypoint; no heavy logic
* `registerCodexWebSearchTool.ts`: maps Pi API to internal tool implementation
* `CodexRunner.ts`: validates params, builds safe argv, runs Codex with timeout/maxBuffer, handles missing binary/errors
* `CodexJsonlParser.ts`: extracts final agent messages and optionally web-search events from `codex exec --json`
* `formatToolResult.ts`: produces readable, bounded tool output for Pi
* tests: mock process execution where possible; use a fake `codex` binary for integration-style tests

## Quality expectations

Expected quality gates:

* shell script syntax checks
* no-secret guardrail
* generated/private-file guardrail
* npm install/ci when `package.json` exists
* lint if configured
* typecheck if configured
* tests if configured
* build if configured
* package dry-run if configured

## Documentation expectations

Required docs:

* README.md
* docs/EXTENSION_SPEC.md
* docs/ARCHITECTURE.md
* docs/USAGE.md
* docs/SECURITY.md
* docs/TROUBLESHOOTING.md
* docs/MANUAL_VALIDATION.md

## Safety and security constraints

Do not include:

* real secrets
* private data
* credentials
* access tokens
* private keys
* real `.env` files
* Codex `auth.json`
* internal hostnames or private URLs
* destructive automation
* browser automation against ChatGPT Web
* unbounded subprocess execution
* shell command construction from user input

## Agent behaviour notes

* Work one ticket at a time.
* Prefer boring, explicit, easily reviewed code.
* The first implementation should be safe and small, not feature-complete.
* Use current Pi and Codex documentation when needed.
* If Codex CLI is available locally and web research is required during the build, the agent may use a constrained command such as:

```bash
codex exec --search --skip-git-repo-check --sandbox read-only "Research the current Pi extension API. Return concise notes and source URLs."
```

* Do not use Codex during the build to modify files; use it only for research unless a ticket explicitly asks for a fake-Codex test harness.
