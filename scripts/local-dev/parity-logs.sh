#!/usr/bin/env bash
set -euo pipefail

source "$(dirname "$0")/require-docker.sh"
require_docker

repo_root="$(cd "$(dirname "$0")/../.." && pwd)"
service_name="${1:-}"

cd "$repo_root"

if [[ -n "$service_name" ]]; then
  docker compose -f compose.local.yaml -f compose.parity.yaml logs -f "$service_name"
else
  docker compose -f compose.local.yaml -f compose.parity.yaml logs -f
fi