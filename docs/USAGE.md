# Usage

## Extension help command

When the package is loaded as a Pi extension, invoke `/codex-web-search` to show concise static help for the `codex_web_search` tool. The command explains the parameters, defaults, and read-only Codex invocation shape. It does not execute Codex or read credential files.

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
