#!/usr/bin/env bash
set -euo pipefail

source "$(dirname "$0")/require-docker.sh"
require_docker

running_services="$(docker compose -f compose.local.yaml ps --status running --services 2>/dev/null || true)"

if [[ -z "$running_services" ]]; then
  echo "No running compose services found for the fast compose stack."
  exit 0
fi

readarray -t running_service_names <<<"$running_services"

docker compose -f compose.local.yaml logs -f "${running_service_names[@]}"