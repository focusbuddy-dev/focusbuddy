#!/usr/bin/env bash
set -uo pipefail

# Smoke verify the local-dev setup from inside the devcontainer.
#
# Run this after `Reopen in Container` + `just dev` (postgres / auth up).
# It catches regressions where devcontainer.json / compose.local.yaml /
# .env drift apart and the container can no longer reach the dependency
# services by hostname (the silent failure mode that motivated this script).
#
# Tools used: getent, bash /dev/tcp, curl. nc / jq / ss are intentionally
# avoided so the script runs on the bare node:24-bookworm base image.

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
ENV_FILE="$REPO_ROOT/.env"
NETWORK_NAME="focusbuddy-net"
POSTGRES_HOST="postgres"
POSTGRES_PORT="5432"
AUTH_HOST="auth"
AUTH_PORT="9099"
TCP_TIMEOUT_SECONDS="2"

failures=()

pass() {
  printf '[verify] OK   %s\n' "$1"
}

fail() {
  printf '[verify] FAIL %s\n' "$1" >&2
  failures+=("$1")
}

check_dns() {
  local host="$1"
  if getent hosts "$host" >/dev/null 2>&1; then
    pass "DNS: $host resolves"
  else
    fail "DNS: $host does not resolve (devcontainer not on $NETWORK_NAME?)"
  fi
}

check_tcp() {
  local host="$1"
  local port="$2"
  if timeout "$TCP_TIMEOUT_SECONDS" bash -c "exec 3<>/dev/tcp/${host}/${port}" >/dev/null 2>&1; then
    pass "TCP: ${host}:${port} reachable"
  else
    fail "TCP: ${host}:${port} not reachable (compose service down?)"
  fi
}

check_http_ok() {
  local label="$1"
  local url="$2"
  # Bypass the egress proxy (tinyproxy) for intra-container traffic; the
  # allowlist only covers external hosts, so auth/postgres on focusbuddy-net
  # would otherwise return 403 even when the service is healthy.
  if curl --noproxy '*' --silent --show-error --fail --max-time 5 --output /dev/null "$url"; then
    pass "HTTP: ${label} ${url} returned 2xx"
  else
    fail "HTTP: ${label} ${url} did not return 2xx"
  fi
}

check_env_key() {
  local key="$1"
  if [ ! -f "$ENV_FILE" ]; then
    fail ".env: missing $ENV_FILE"
    return
  fi
  if grep -Eq "^${key}=" "$ENV_FILE"; then
    pass ".env: ${key} is set"
  else
    fail ".env: ${key} is not set"
  fi
}

# 1. Sanity: we are inside a container.
if [ -f /.dockerenv ]; then
  pass "running inside a container"
else
  fail "not running inside a container (run from devcontainer)"
fi

# 2. DNS join — proves runArgs --network ${NETWORK_NAME} took effect.
check_dns "$POSTGRES_HOST"
check_dns "$AUTH_HOST"

# 3. TCP reachability — proves compose stack is up on the shared network.
check_tcp "$POSTGRES_HOST" "$POSTGRES_PORT"
check_tcp "$AUTH_HOST" "$AUTH_PORT"

# 4. Auth health endpoint — proves auth-stub is actually serving HTTP.
check_http_ok "auth /health" "http://${AUTH_HOST}:${AUTH_PORT}/health"

# 5. .env wiring — proves ad-hoc dev DSN/URL are populated.
check_env_key "DATABASE_URL"
check_env_key "FOCUSBUDDY_AUTH_BASE_URL"

if [ ${#failures[@]} -eq 0 ]; then
  echo "[verify] All checks passed."
  exit 0
fi

echo "[verify] ${#failures[@]} check(s) failed:" >&2
for entry in "${failures[@]}"; do
  echo "  - $entry" >&2
done
exit 1
