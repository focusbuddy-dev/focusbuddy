#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "$0")/../.." && pwd)"

cd "$repo_root"
pnpm generate "$@"

bash "$(dirname "$0")/restart-running-app-services.sh" --best-effort