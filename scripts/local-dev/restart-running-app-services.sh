#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "$0")/../.." && pwd)"
compose_file="$repo_root/compose.local.yaml"
best_effort=false

if [[ "${1:-}" == "--best-effort" ]]; then
  best_effort=true
  shift
fi

source "$(dirname "$0")/require-docker.sh"

if $best_effort; then
  if ! require_docker; then
    echo "Warning: Docker/Compose is not available; skipping app service restart." >&2
    exit 0
  fi
else
  require_docker
fi

cd "$repo_root"

restart_services=("$@")

if [[ $# -eq 0 ]]; then
  running_services="$(docker compose -f "$compose_file" ps --status running --services 2>/dev/null || true)"

  for service_name in auth api web; do
    if grep -qx "$service_name" <<<"$running_services"; then
      restart_services+=("$service_name")
    fi
  done
fi

if [[ ${#restart_services[@]} -gt 0 ]]; then
  docker compose -f "$compose_file" restart "${restart_services[@]}"
fi