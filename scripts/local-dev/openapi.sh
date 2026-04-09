#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "$0")/../.." && pwd)"

cd "$repo_root"
pnpm generate "$@"

bash scripts/local-dev/restart-running-app-services.sh