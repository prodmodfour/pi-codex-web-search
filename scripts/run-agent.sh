#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=scripts/lib/pretty-print.sh
source "$SCRIPT_DIR/lib/pretty-print.sh"

if [[ $# -ne 1 ]]; then
  pp_error "Usage: scripts/run-agent.sh '<prompt>'"
  exit 2
fi

PROMPT="$1"
PI_BIN="${PI_BIN:-pi}"

if ! command -v "$PI_BIN" >/dev/null 2>&1; then
  pp_error "Required command not found: $PI_BIN"
  pp_hint "Set PI_BIN=/path/to/pi or edit scripts/run-agent.sh for a different agent command."
  exit 127
fi

pp_step "Launching Pi agent."
pp_cmd "$PI_BIN --no-session -p @AGENTS.md @PROJECT_BRIEF.md @BUILD_TICKETS.md @BUILD_NOTES.md '<prompt>'"

"$PI_BIN" --no-session -p @AGENTS.md @PROJECT_BRIEF.md @BUILD_TICKETS.md @BUILD_NOTES.md "$PROMPT"
