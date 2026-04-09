#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "Usage: just schema <migration-name>"
  exit 1
fi

repo_root="$(cd "$(dirname "$0")/../.." && pwd)"
migration_name="$1"

cd "$repo_root"
pnpm --filter @focusbuddy/api prisma:migrate:dev -- --name "$migration_name"

bash scripts/local-dev/restart-running-app-services.sh