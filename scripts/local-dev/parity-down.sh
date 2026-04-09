#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "$0")/../.." && pwd)"

cd "$repo_root"

source "$(dirname "$0")/require-docker.sh"
require_docker

docker compose -f compose.local.yaml -f compose.parity.yaml down "$@"