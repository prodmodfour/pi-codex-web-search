#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=scripts/lib/pretty-print.sh
source "$SCRIPT_DIR/lib/pretty-print.sh"

have() { command -v "$1" >/dev/null 2>&1; }
run_cmd() { pp_cmd "$*"; "$@"; }
warn() { pp_warn "$*"; }

pp_banner "Quality gate"

pp_section "Shell syntax checks"
while IFS= read -r -d '' script; do
  pp_step "bash -n $script"
  bash -n "$script"
done < <(find scripts -type f -name '*.sh' -print0 | sort -z)
pp_success "Shell syntax checks passed."

pp_section "Secret guardrail"
run_cmd bash scripts/check-no-secrets.sh

pp_section "Generated/private-file guardrail"
run_cmd bash scripts/check-no-generated-private-files.sh

if [[ -f package.json ]]; then
  pp_section "Node project"
  if have npm; then
    if [[ -f package-lock.json ]]; then
      run_cmd npm ci
    else
      run_cmd npm install
    fi

    run_cmd npm run lint --if-present
    run_cmd npm run typecheck --if-present
    run_cmd npm test --if-present
    run_cmd npm run build --if-present

    if npm run | grep -qE '^[[:space:]]+pack:check'; then
      run_cmd npm run pack:check
    else
      pp_info "No pack:check script detected; skipping package dry-run."
    fi
  else
    warn "npm not installed; skipping Node checks"
  fi
else
  pp_info "No package.json yet; skipping Node checks until Ticket 000 creates the package."
fi

pp_section "Summary"
pp_success "Quality gate passed."
