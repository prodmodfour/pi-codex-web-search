#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=scripts/lib/pretty-print.sh
source "$SCRIPT_DIR/lib/pretty-print.sh"

pp_banner "Generated/private-file guardrail"

bad=0

check_path() {
  local path="$1"
  if [[ -e "$path" ]]; then
    pp_error "Private or generated path exists and should not be committed: $path"
    bad=1
  fi
}

check_path ".env"
check_path ".codex"
check_path "auth.json"
check_path "node_modules"
check_path "dist"
check_path "coverage"

if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  if git ls-files | grep -Eq '(^|/)(auth\.json|\.env(\..*)?|\.codex/|node_modules/|coverage/|\.agent/logs/)'; then
    pp_error "Tracked private/generated files detected."
    git ls-files | grep -E '(^|/)(auth\.json|\.env(\..*)?|\.codex/|node_modules/|coverage/|\.agent/logs/)'
    bad=1
  fi
fi

if (( bad != 0 )); then
  exit 1
fi

pp_success "No generated/private paths detected."
