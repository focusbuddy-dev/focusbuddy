# Dev Container Setup

This repository uses a dev container for local development. **All development happens inside the container.** Host-side direct `pnpm` / `just` is not the supported workflow.

The container handles:

- pnpm via corepack, pinned to the version in `package.json`
- `just` task runner (pinned binary install)
- outbound network allowlist via tinyproxy (Level 1 restriction)
- Claude Code CLI + ccusage with persisted authentication
- GitHub CLI authentication via `GH_TOKEN`
- host's git `user.name` / `user.email` propagation
- Docker outside of Docker for `just dev` / `docker compose`

Commit signing is intentionally **disabled** in this repository (unsigned commits, matched with the upstream Claude framework).

## What Is Automated

`postCreateCommand` runs once after the container is created and:

1. starts tinyproxy with the outbound allowlist
2. configures `gh` git credential helper if `GH_TOKEN` is present
3. installs Claude Code CLI and ccusage globally (`npm-global`, supply-chain `--min-release-age=3`)
4. verifies Python (used by `.claude/hooks/*.py` once Phase 3 lands)
5. ensures the `focusbuddy-claude-auth` volume is owned by the `node` user
6. activates the pinned `pnpm` via corepack
7. installs the pinned `just` binary into `/home/node/.npm-global/bin`
8. propagates host git `user.name` / `user.email` from `.devcontainer/.devcontainer.env`
9. sets repo-local `pull.rebase=false` and `commit.gpgsign=false`

`postStartCommand` (every container start) restarts tinyproxy if it is not already running.

Repository dependencies are intentionally **not** installed during `postCreateCommand`. Run `just commitlint-setup` once after the container starts.

## Host Requirements

Before opening the repository in the dev container, the host needs only:

- **Docker** running (Docker Desktop on macOS/Windows, Docker Engine on Linux)
- **A fine-grained GitHub personal access token** for this repository, written to `.devcontainer/.devcontainer.env` (see below). The token is no longer read from host environment variables — `.devcontainer.env` is per-repo and `.gitignore`d.

`ssh` access from the host to GitHub is **not required** because pushes go through HTTPS + `GH_TOKEN` from inside the container.

## `.devcontainer/.devcontainer.env`

This file is gitignored and read at container start via `runArgs --env-file`. Create it before the first build:

```env
GH_TOKEN=<fine-grained PAT>
```

`HOST_GIT_USER_NAME` and `HOST_GIT_USER_EMAIL` are upserted automatically by `initialize.sh` from the host's global git config — do not write them manually.

### Recommended fine-grained token settings

- Resource owner: `focusbuddy-dev`
- Repository access: `Only select repositories`
- Selected repository: `focusbuddy`
- Repository permissions:
  - `Issues`: `Read and write`
  - `Pull requests`: `Read and write`
  - `Contents`: `Read and write`

If the organization requires approval for fine-grained tokens, the token may stay pending until approved.

## Outbound Network Allowlist (tinyproxy)

All outbound HTTP/HTTPS traffic from the container is forced through `http://127.0.0.1:8888` (tinyproxy). The allowlist is in `.devcontainer/allowlist.txt`. Anything not in the allowlist is denied (`FilterDefaultDeny Yes`).

Currently allowlisted hosts:

- GitHub (`github.com`, `api.github.com`, `*.githubusercontent.com`)
- npm (`registry.npmjs.org`, `*.npmjs.org`)
- Anthropic / Claude (`api.anthropic.com`, `*.anthropic.com`, `*.claude.com`)
- Slack (`hooks.slack.com`)
- PyPI (`pypi.org`, `files.pythonhosted.org`)
- ghcr (`ghcr.io`, `*.ghcr.io`)
- Docker registry (`registry-1.docker.io`, `auth.docker.io`, `production.cloudflare.docker.com`, `*.docker.com`, `mcr.microsoft.com`)

To reload the allowlist without rebuilding the container:

```bash
sudo kill -HUP "$(pgrep -x tinyproxy)"
```

Adding a host requires a Pull Request that updates `allowlist.txt`.

## Claude Code Authentication Volume

`/home/node/.claude` is backed by the named volume `focusbuddy-claude-auth`. This survives container rebuilds, so re-running `claude` does not re-trigger authentication. The volume is per-machine, not per-worktree.

## just Task Runner

`just` is installed at `/home/node/.npm-global/bin/just` (in PATH). Useful commands:

```bash
just --list
just --version
```

## Package Manager Policy

`pnpm` is the only supported package manager in this repository.

For the first repository setup inside the dev container:

```bash
just commitlint-setup
```

This runs `pnpm install --frozen-lockfile` through the Justfile. Repository dependency installation is intentionally separated from `postCreateCommand` so dev container startup failures stay isolated from dependency-resolution failures.

## Working With Issue Worktrees

Issue work happens in `.worktrees/issue-<N>/`. The container binds the opened folder to `/workspaces/focusbuddy`, so worktrees can be opened directly:

1. open the target worktree folder in its own VS Code window
2. rebuild or reopen the dev container from that worktree window
3. inside the container, `pwd` returns `/workspaces/focusbuddy`

`FOCUSBUDDY_WORKSPACE_MOUNT` continues to forward the host-side path so `docker compose` bind mounts hit the host filesystem rather than `/workspaces/...`.

## Verification After Rebuild

Run these checks inside the container:

```bash
printenv GH_TOKEN | wc -c
printenv FOCUSBUDDY_WORKSPACE_MOUNT
gh auth status
docker version
docker compose version
claude --version
ccusage --version
just --version
pnpm --version
python3 --version
pgrep -x tinyproxy && echo "tinyproxy running"
```

Expected:

- `GH_TOKEN` length > 1
- `FOCUSBUDDY_WORKSPACE_MOUNT` returns the host repo path
- `gh auth status` succeeds without `gh auth login`
- `docker version` / `docker compose version` succeed
- `claude` / `ccusage` / `just` / `pnpm` / `python3` print their versions
- tinyproxy is running

Then verify outbound traffic is filtered:

```bash
curl -sf -x http://127.0.0.1:8888 --max-time 10 https://api.github.com/zen   # OK
curl -sf -x http://127.0.0.1:8888 --max-time 10 https://www.example.com      # blocked
```

## Troubleshooting

### `gh auth status` says you are not logged in

Most likely `.devcontainer/.devcontainer.env` is missing or `GH_TOKEN` is not set in it.

```bash
ls -la /workspaces/focusbuddy/.devcontainer/.devcontainer.env
printenv GH_TOKEN | wc -c
```

If the file is missing, create it with `GH_TOKEN=<your PAT>` and rebuild the container.

### `just dev` fails with `docker: command not found`

The dev container was rebuilt without the `docker-outside-of-docker` feature, or Docker is not running on the host.

Confirm `.devcontainer/devcontainer.json` includes `ghcr.io/devcontainers/features/docker-outside-of-docker:1`, then ensure Docker is running on the host and rebuild.

### `docker info` fails inside the container

Docker CLI is present, but the host Docker engine is not reachable. Start Docker on the host and reopen the container.

### `Mounts denied` mentions `/workspaces/...` during `just dev`

`docker compose` is bind-mounting the container path. Confirm `FOCUSBUDDY_WORKSPACE_MOUNT` is set:

```bash
printenv FOCUSBUDDY_WORKSPACE_MOUNT
```

If empty, check `.devcontainer/devcontainer.json` `containerEnv` and rebuild.

### `npm install -g` fails with EACCES

`NPM_CONFIG_PREFIX=/home/node/.npm-global` should make the prefix user-writable without sudo. If you see EACCES, the Dockerfile didn't `chown` the directory — rebuild with no cache.

### tinyproxy is not running

```bash
bash /workspaces/focusbuddy/.devcontainer/start-proxy.sh
```

Or rebuild. If sudoers is misconfigured, the script logs the failure to stderr.

### A new outbound host is blocked

Add the host to `.devcontainer/allowlist.txt` (POSIX extended regex), then:

```bash
sudo kill -HUP "$(pgrep -x tinyproxy)"
```

The change is bind-mounted, no rebuild required for the running session, but commit the change so future rebuilds inherit it.
