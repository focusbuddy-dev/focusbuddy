#!/usr/bin/env bash
set -euo pipefail

source "$(dirname "$0")/require-docker.sh"
require_docker

docker compose -f compose.local.yaml up -d --build "$@"