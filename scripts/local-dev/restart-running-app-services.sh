#!/usr/bin/env bash
set -euo pipefail

source "$(dirname "$0")/require-docker.sh"
require_docker

restart_services=("$@")

if [[ $# -eq 0 ]]; then
  running_services="$(docker compose -f compose.local.yaml ps --status running --services 2>/dev/null || true)"

  for service_name in auth api web; do
    if grep -qx "$service_name" <<<"$running_services"; then
      restart_services+=("$service_name")
    fi
  done
fi

if [[ ${#restart_services[@]} -gt 0 ]]; then
  docker compose -f compose.local.yaml restart "${restart_services[@]}"
fi