#!/usr/bin/env bash
set -euo pipefail

source "$(dirname "$0")/require-docker.sh"
require_docker

restart_services=()
running_services="$(docker compose -f compose.local.yaml ps --status running --services 2>/dev/null || true)"

for service_name in auth api web; do
  if grep -qx "$service_name" <<<"$running_services"; then
    restart_services+=("$service_name")
  fi
done

docker compose -f compose.local.yaml up -d --build "$@"

if [[ $# -eq 0 && ${#restart_services[@]} -gt 0 ]]; then
  bash "$(dirname "$0")/restart-running-app-services.sh" "${restart_services[@]}"
fi