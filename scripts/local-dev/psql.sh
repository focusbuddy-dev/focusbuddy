#!/usr/bin/env bash
set -euo pipefail

source "$(dirname "$0")/require-docker.sh"

postgres_user="${POSTGRES_USER:-focusbuddy}"
postgres_db="${POSTGRES_DB:-focusbuddy}"

docker compose -f compose.local.yaml exec postgres psql -U "$postgres_user" -d "$postgres_db"