#!/usr/bin/env bash
set -euo pipefail

# Start tinyproxy in background for outbound network allowlist filtering.
# Proxy environment variables are set in devcontainer.json remoteEnv.

echo "[start-proxy] Starting tinyproxy..."

# Skip if already running (e.g., started by post-create.sh)
if pgrep -x tinyproxy > /dev/null; then
    echo "[start-proxy] tinyproxy is already running (PID: $(pgrep -x tinyproxy))"
    exit 0
fi

# Start tinyproxy (runs as daemon by default)
sudo tinyproxy -c /etc/tinyproxy/tinyproxy.conf

# Wait briefly for tinyproxy to be ready
sleep 1

# Verify tinyproxy is running
if pgrep -x tinyproxy > /dev/null; then
    echo "[start-proxy] tinyproxy is running (PID: $(pgrep -x tinyproxy))"
else
    echo "[start-proxy] ERROR: tinyproxy failed to start" >&2
    exit 1
fi

# To reload allowlist.txt without rebuild: sudo kill -HUP "$(pgrep -x tinyproxy)"

# Quick connectivity test (allowlisted host)
if curl -sf -x http://127.0.0.1:8888 --max-time 10 https://api.github.com > /dev/null 2>&1; then
    echo "[start-proxy] Connectivity test passed (api.github.com reachable via proxy)"
else
    echo "[start-proxy] WARNING: Connectivity test failed (api.github.com not reachable via proxy)" >&2
    echo "[start-proxy] tinyproxy may still be starting, or network may be unavailable" >&2
fi
