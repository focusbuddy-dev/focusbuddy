#!/usr/bin/env bash
set -euo pipefail

docker compose -f compose.local.yaml down "$@"