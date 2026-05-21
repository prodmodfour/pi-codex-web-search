# Usage

## Load the package

See [`INSTALLATION.md`](INSTALLATION.md) for local path, git, and npm-style Pi package loading commands plus package-manifest and auto-discovery notes.

Common local development flow:

```bash
npm install
npm test
pi -e .
```

Common project-local install from a checkout:

```bash
pi install -l /absolute/path/to/pi-codex-web-search
pi
```

When Codex is authenticated with a ChatGPT/Codex account, calls made by `codex_web_search` use the local Codex CLI and may consume that account's Codex/ChatGPT plan limits. They do not use OpenAI API web-search billing by default. The extension cannot bypass Codex, ChatGPT, account, network, or web-search availability limits.

## Extension help command

When the package is loaded as a Pi extension, invoke `/codex-web-search` to show concise static help for the `codex_web_search` tool. The command explains the parameters, defaults, and read-only Codex invocation shape. It does not execute Codex or read credential files.

## Prompt examples

Use `codex_web_search` when the user asks for current or source-backed public web information. The model is most likely to call the tool when the prompt names it directly:

```text
Use the codex_web_search tool in live mode to search the web for the latest Node.js LTS release line. Return two concise bullets and include source URLs.
```

```text
Use codex_web_search to find current installation guidance for Pi packages from local path, git, and npm sources. Summarize the commands with source URLs.
```

```text
Use codex_web_search in live mode to compare the latest stable releases of two public libraries. Include the release dates and cited sources.
```

```text
Use codex_web_search with mode cached to answer from Codex's existing context only: what does this extension do? Keep it brief.
```

Use `mode: "live"` when freshness matters. Use `mode: "cached"` when you intentionally want the extension to omit Codex `--search`; cached mode still invokes the local Codex CLI.

## Configuring `codex_web_search`

The default package entrypoint reads only documented environment variables. Set them before launching Pi if you need different safe defaults:

```bash
export PI_CODEX_WEB_SEARCH_CODEX_BINARY=/opt/codex/bin/codex
export PI_CODEX_WEB_SEARCH_DEFAULT_MODE=cached
export PI_CODEX_WEB_SEARCH_TIMEOUT_MS=180000
export PI_CODEX_WEB_SEARCH_MAX_OUTPUT_CHARS=20000
export PI_CODEX_WEB_SEARCH_SANDBOX=read-only
```

Settings:

| Setting | Environment variable | Default | Validation |
| --- | --- | --- | --- |
| Codex binary | `PI_CODEX_WEB_SEARCH_CODEX_BINARY` | `codex` | non-empty string without null bytes |
| Default mode | `PI_CODEX_WEB_SEARCH_DEFAULT_MODE` | `live` | `live` or `cached` |
| Default timeout | `PI_CODEX_WEB_SEARCH_TIMEOUT_MS` | `120000` | integer from `1000` to `300000` |
| Default max output | `PI_CODEX_WEB_SEARCH_MAX_OUTPUT_CHARS` | `12000` | integer from `500` to `50000` |
| Sandbox | `PI_CODEX_WEB_SEARCH_SANDBOX` | `read-only` | currently only `read-only` |

Precedence is: explicit project/in-process config passed to `registerCodexWebSearchTool(pi, { config })`, then environment variables, then built-in defaults. A tool call's own `mode`, `timeoutMs`, and `maxOutputChars` override configured defaults for that call.

The configuration layer does not read `~/.codex/auth.json`, `$HOME`, or arbitrary project config files.

## Running the autonomous build

Run one cycle first:

```bash
scripts/build-loop.sh --allow-ahead
```

Run a longer runway:

```bash
scripts/build-loop.sh --max-cycles 30 --allow-ahead
```

Push after each successful cycle only after a remote is configured:

```bash
scripts/build-loop.sh --max-cycles 30 --push
```

## Changing the agent

The build loop delegates agent execution to:

```text
scripts/run-agent.sh
```

The default wrapper uses Pi:

```bash
pi --no-session -p @AGENTS.md @PROJECT_BRIEF.md @BUILD_TICKETS.md @BUILD_NOTES.md "$PROMPT"
```

Set `PI_BIN` if your binary has a different name:

```bash
PI_BIN=/path/to/pi scripts/build-loop.sh
```

## Expected build flow

The agent should implement the tickets in order, committing after each completed ticket.

Do not skip ahead unless a ticket is marked `BLOCKED` with a clear reason.
