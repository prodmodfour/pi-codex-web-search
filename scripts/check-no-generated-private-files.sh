#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=scripts/lib/pretty-print.sh
source "$SCRIPT_DIR/lib/pretty-print.sh"

pp_banner "Generated/private-file guardrail"

bad=0

report_bad_path() {
  local path="$1"
  pp_error "Private or generated path exists and should not be committed: $path"
  bad=1
}

check_path() {
  local path="$1"
  if [[ -e "$path" || -L "$path" ]]; then
    report_bad_path "$path"
  fi
}

check_glob() {
  local pattern="$1"
  local path
  local matches=()

  shopt -s nullglob
  matches=( $pattern )
  shopt -u nullglob

  for path in "${matches[@]}"; do
    # Template files are allowed; real local env files are not.
    if [[ "$path" == ".env.example" ]]; then
      continue
    fi
    report_bad_path "$path"
  done
}

check_path ".env"
check_glob ".env.*"
check_path ".codex"
check_path "auth.json"
check_path "node_modules"
check_path "dist"
check_path "build"
check_path "coverage"
check_glob "*.tgz"

if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  tracked_bad="$(
    git ls-files \
      | grep -E '(^|/)(auth\.json|\.codex(/|$)|node_modules/|dist/|build/|coverage/|\.agent/logs/|[^/]+\.tgz$|\.env($|\.))' \
      | grep -vE '(^|/)\.env\.example$' \
      || true
  )"

  if [[ -n "$tracked_bad" ]]; then
    pp_error "Tracked private/generated files detected."
    printf '%s\n' "$tracked_bad"
    bad=1
  fi
fi

if (( bad != 0 )); then
  exit 1
fi

pp_success "No generated/private paths detected."
