#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=scripts/lib/pretty-print.sh
source "$SCRIPT_DIR/lib/pretty-print.sh"

pp_banner "Secret guardrail"

PATTERN='(sk-[A-Za-z0-9_-]{20,}|ghp_[A-Za-z0-9_]{30,}|github_pat_[A-Za-z0-9_]{20,}|xox[baprs]-[A-Za-z0-9-]{20,}|BEGIN (RSA|OPENSSH|EC|DSA)? ?PRIVATE KEY|"(access_token|refresh_token|id_token)"[[:space:]]*:)' 

if grep -RInE \
  --exclude-dir=.git \
  --exclude-dir=node_modules \
  --exclude-dir=dist \
  --exclude-dir=coverage \
  --exclude-dir=.agent \
  --exclude='package-lock.json' \
  --exclude='npm-shrinkwrap.json' \
  "$PATTERN" .; then
  pp_error "Potential secret material found. Review the matches above."
  exit 1
fi

pp_success "No obvious secrets found."
