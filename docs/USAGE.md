# Usage

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
