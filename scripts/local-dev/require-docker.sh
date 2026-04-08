#!/usr/bin/env bash
set -euo pipefail

if command -v docker >/dev/null 2>&1; then
  if docker info >/dev/null 2>&1; then
    return 0
  fi

  cat >&2 <<'EOF'
Docker CLI is available, but the Docker engine is not reachable.

Start Docker on the host machine and, if you are inside the dev container,
rebuild or reopen it so the Docker socket is available again.
EOF
  exit 1
fi

cat >&2 <<'EOF'
Docker CLI is not available in this environment.

If you are inside the dev container, rebuild it after enabling Docker outside
of Docker in .devcontainer/devcontainer.json.

If you are on the host machine, install Docker Desktop or Docker Engine and
make sure the `docker` command is on PATH.
EOF
exit 127