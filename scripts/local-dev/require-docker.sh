#!/usr/bin/env bash
set -euo pipefail

require_docker() {
  if ! command -v docker >/dev/null 2>&1; then
    cat >&2 <<'EOF'
Docker CLI is not available in this environment.

If you are inside the dev container, rebuild it after enabling Docker outside
of Docker in .devcontainer/devcontainer.json.

If you are on the host machine, install Docker Desktop or Docker Engine and
make sure the `docker` command is on PATH.
EOF
    return 127
  fi

  if ! docker info >/dev/null 2>&1; then
    cat >&2 <<'EOF'
Docker CLI is available, but the Docker engine is not reachable.

Start Docker on the host machine and, if you are inside the dev container,
rebuild or reopen it so the Docker socket is available again.
EOF
    return 1
  fi

  if ! docker compose version >/dev/null 2>&1; then
    cat >&2 <<'EOF'
Docker CLI is available and the Docker engine is reachable, but Docker Compose
v2 is not available.

Install or enable the Docker Compose v2 plugin so the `docker compose`
command works in this environment, then retry.
EOF
    return 1
  fi

  if [[ -f /.dockerenv ]] && [[ "${PWD}" == /workspaces/* ]] && [[ -z "${FOCUSBUDDY_WORKSPACE_MOUNT:-}" ]]; then
    cat >&2 <<'EOF'
Docker is reachable, but the host workspace path has not been forwarded into this
dev container session.

Rebuild the dev container so remoteEnv picks up FOCUSBUDDY_WORKSPACE_MOUNT, then
retry the local Docker helper.
EOF
    return 1
  fi
}

if [[ "${BASH_SOURCE[0]}" == "$0" ]]; then
  require_docker
fi