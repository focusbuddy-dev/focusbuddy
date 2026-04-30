#!/usr/bin/env bash
set -euo pipefail

# Host-side initializeCommand for focusbuddy devcontainer.
# Runs on the VS Code host before the container starts.
#
# Responsibilities:
# 1. Ensure .devcontainer/.devcontainer.env exists.
# 2. If git is available on the host, sync host's git user.name / user.email
#    into HOST_GIT_USER_NAME / HOST_GIT_USER_EMAIL in .devcontainer.env
#    (preserving other lines such as GH_TOKEN). Empty values remove the line.
#    This step is skipped — not fatal — when git is missing, so that the
#    docker network setup below still runs.
# 3. Ensure the shared docker network `focusbuddy-net` exists, so the
#    devcontainer can join it via runArgs --network and resolve compose
#    service names (postgres, auth) by hostname.
#
# Atomicity: env-file writes go through mktemp + mv → rename within same FS.
# trap EXIT cleans up the temp file on error/interrupt.
# Line match is anchored to start-of-line (^KEY=) to avoid substring collisions.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${SCRIPT_DIR}/.devcontainer.env"

# 1. Ensure .devcontainer.env exists
if [ ! -f "$ENV_FILE" ]; then
    touch "$ENV_FILE"
fi

# upsert helper.
# If value is non-empty: replace existing ^KEY= line, or append if absent.
# If value is empty: remove any existing ^KEY= line (no-op if absent).
upsert_env() {
    local key="$1"
    local value="$2"
    local file="$3"
    local tmp
    tmp="$(mktemp "${file}.XXXXXX")"
    trap 'rm -f "$tmp"' EXIT
    if [ -n "$value" ]; then
        awk -v k="$key" -v v="$value" '
            BEGIN { found = 0 }
            $0 ~ "^" k "=" { print k "=" v; found = 1; next }
            { print }
            END { if (!found) print k "=" v }
        ' "$file" > "$tmp"
    else
        awk -v k="$key" '$0 !~ "^" k "=" { print }' "$file" > "$tmp"
    fi
    mv "$tmp" "$file"
    trap - EXIT
}

# 2. git user sync (skipped — not fatal — if git is unavailable on host).
if command -v git >/dev/null 2>&1; then
    HOST_NAME="$(git config --global user.name || true)"
    HOST_EMAIL="$(git config --global user.email || true)"

    # Reject values containing newlines (would corrupt env-file format).
    if [[ "$HOST_NAME" == *$'\n'* ]]; then
        echo "[initialize] WARNING: host git user.name contains newline; skipping." >&2
        HOST_NAME=""
    fi
    if [[ "$HOST_EMAIL" == *$'\n'* ]]; then
        echo "[initialize] WARNING: host git user.email contains newline; skipping." >&2
        HOST_EMAIL=""
    fi

    upsert_env "HOST_GIT_USER_NAME" "$HOST_NAME" "$ENV_FILE"
    upsert_env "HOST_GIT_USER_EMAIL" "$HOST_EMAIL" "$ENV_FILE"

    if [ -z "$HOST_NAME" ] || [ -z "$HOST_EMAIL" ]; then
        echo "[initialize] NOTE: host git user.name or user.email is unset. Container commits may require manual config." >&2
    fi
else
    echo "[initialize] WARNING: git not found on host. Skipping git user sync." >&2
fi

# 3. Ensure the shared docker network exists before the devcontainer joins it.
# The compose stack (postgres, auth) attaches as `external: true`, and the
# devcontainer joins via runArgs --network. Created idempotently on the host.
NETWORK_NAME="focusbuddy-net"
if command -v docker >/dev/null 2>&1; then
    if ! docker network inspect "$NETWORK_NAME" >/dev/null 2>&1; then
        docker network create "$NETWORK_NAME" >/dev/null
        echo "[initialize] Created docker network: $NETWORK_NAME"
    fi
else
    echo "[initialize] WARNING: docker not found on host. devcontainer requires docker." >&2
fi
