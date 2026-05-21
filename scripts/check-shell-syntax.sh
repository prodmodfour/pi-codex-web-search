#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
# shellcheck source=scripts/lib/pretty-print.sh
source "$SCRIPT_DIR/lib/pretty-print.sh"

pp_banner "Shell syntax checks"

while IFS= read -r -d '' script; do
  relative_path="${script#"$REPO_ROOT/"}"
  pp_step "bash -n $relative_path"
  bash -n "$script"
done < <(find "$REPO_ROOT/scripts" -type f -name '*.sh' -print0 | sort -z)

pp_success "Shell syntax checks passed."
