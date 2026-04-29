#!/usr/bin/env bash
set -euo pipefail

# Start tinyproxy in daemon mode for outbound network allowlist filtering.
# Runs as the unprivileged `node` user thanks to `User node` / `Group node`
# in tinyproxy.conf — no sudo required. Logs go to /var/log/tinyproxy/tinyproxy.log
# (the directory is created and chowned to `node` in the Dockerfile) since
# daemon mode detaches stdio and stderr would otherwise be lost.

echo "[start-proxy] Starting tinyproxy..."

# Skip if already running (e.g., started by post-create.sh)
if pgrep -x tinyproxy > /dev/null; then
    echo "[start-proxy] tinyproxy is already running (PID: $(pgrep -x tinyproxy))"
    exit 0
fi

# Start tinyproxy (forks into background by default)
tinyproxy -c /etc/tinyproxy/tinyproxy.conf

# Wait briefly for tinyproxy to be ready
sleep 1

# Verify tinyproxy is running
if pgrep -x tinyproxy > /dev/null; then
    echo "[start-proxy] tinyproxy is running (PID: $(pgrep -x tinyproxy), logs: /var/log/tinyproxy/tinyproxy.log)"
else
    echo "[start-proxy] ERROR: tinyproxy failed to start (check /var/log/tinyproxy/tinyproxy.log)" >&2
    exit 1
fi

# To reload allowlist.txt without rebuild: pkill -HUP tinyproxy

# Quick connectivity test (allowlisted host)
if curl -sf -x http://127.0.0.1:8888 --max-time 10 https://api.github.com > /dev/null 2>&1; then
    echo "[start-proxy] Connectivity test passed (api.github.com reachable via proxy)"
else
    echo "[start-proxy] WARNING: Connectivity test failed (api.github.com not reachable via proxy)" >&2
    echo "[start-proxy] tinyproxy may still be starting, or network may be unavailable" >&2
fi
