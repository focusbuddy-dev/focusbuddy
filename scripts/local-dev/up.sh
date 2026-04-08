#!/usr/bin/env bash
set -euo pipefail

source "$(dirname "$0")/require-docker.sh"

docker compose -f compose.local.yaml up -d --build "$@"