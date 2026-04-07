#!/usr/bin/env bash
set -euo pipefail

docker compose -f compose.local.yaml up -d --build "$@"