#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "Usage: just prisma <migration-name>"
  exit 1
fi

repo_root="$(cd "$(dirname "$0")/../.." && pwd)"
migration_name="$1"

cd "$repo_root"
pnpm --filter @focusbuddy/api prisma:migrate:dev -- --name "$migration_name"

bash "$(dirname "$0")/restart-running-app-services.sh" --best-effort