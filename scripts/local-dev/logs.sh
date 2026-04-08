#!/usr/bin/env bash
set -euo pipefail

source "$(dirname "$0")/require-docker.sh"
require_docker

service_name="${1:-}"

if [[ -n "$service_name" ]]; then
  docker compose -f compose.local.yaml logs -f "$service_name"
else
  docker compose -f compose.local.yaml logs -f
fi