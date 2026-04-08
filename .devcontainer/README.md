# Dev Container Setup

This repository uses a dev container for local development.

The container configuration handles two separate concerns:

- Git commit signing with SSH keys
- GitHub CLI authentication for issue and pull request workflows
- developer task entrypoints with just

These are related, but they do not use the same authentication path.

## just Task Runner

This repository now uses `just` as the main entry point for developer tasks.

The dev container installs a pinned `just` release during `postCreateCommand` by running [.devcontainer/install-just.sh](install-just.sh).

Useful checks inside the container:

```bash
just --version
just --list
```

If you work outside the dev container, install `just` on the host before running repository tasks.

## Package Manager Policy

`pnpm` is the only supported package manager in this repository.

Use this command for the first repository setup inside the dev container:

```bash
just commitlint-setup
```

That flow runs `pnpm install --frozen-lockfile` through the Justfile, so dependency installation stays reproducible and explicit.

The dev container intentionally does not install repository dependencies during `postCreateCommand`.

This separation is intentional, not temporary. Dev container startup can already fail for multiple reasons. If dependency installation is added to `postCreateCommand`, the failure surface becomes larger and troubleshooting becomes harder.

## What Is Automated

The dev container automates two bootstrap steps:

- `postCreateCommand` prepares the pinned `pnpm` version from `package.json` and installs `just`
- `postStartCommand` configures Git SSH signing on container start via [setup-git-signing.sh](setup-git-signing.sh)

Repository dependency installation is intentionally left out of `postCreateCommand` and stays in the explicit `just commitlint-setup` flow.

The signing script does the following:

- reads the first public key exposed by the forwarded `ssh-agent`
- writes that public key to a container-local file under `~/.ssh`
- configures Git to use SSH signing with that file

This avoids pointing Git at a host-only path such as `/Users/...`, which does not exist inside the container.

## Host Requirements

Before opening the repository in the dev container, make sure the host machine already has working SSH access to GitHub.

The dev container now uses Docker outside of Docker for repository tasks such as `just local-up`.
That means Docker must be installed and running on the host machine before the container is rebuilt.

Recommended checks on the host:

```bash
ssh -T git@github.com
ssh-add -L
docker version
```

Expected results:

- `ssh -T git@github.com` confirms GitHub SSH authentication works
- `ssh-add -L` prints at least one public key
- `docker version` succeeds on the host

If `ssh-add -L` returns no identities, commit signing inside the container will not be configured.
If `docker version` fails on the host, Docker-based local development commands will not work from inside the dev container.

## Git Commit Signing

Git push over SSH and Git commit signing are different things.

- SSH push authentication uses the forwarded `ssh-agent`
- Git commit signing uses `gpg.format=ssh` and `user.signingkey`

If commit signing is configured against a host-only path, Git fails during commit even if SSH access to GitHub already works.

The container setup avoids that by generating a container-local public key file on startup.

Useful checks inside the container:

```bash
git config --show-origin --get-regexp '^(user\.signingkey|commit\.gpgsign|gpg\.format)$'
git log --show-signature -1
```

Expected behavior:

- `user.signingkey` points to `/home/node/.ssh/github_signing_key.pub`
- signed commits show a valid SSH signature locally

## GitHub CLI Authentication

The dev container includes `gh` via a devcontainer feature. Authentication for `gh` is provided by `GH_TOKEN`, not by the host machine's GitHub CLI login session.

Mounting `~/.config/gh` from the host is not reliable on macOS because the host `gh` login may store the token in Keychain instead of `hosts.yml`.

The recommended approach is:

1. create a fine-grained personal access token for this repository
2. expose it on the host as `GH_TOKEN`
3. let the dev container read it through `remoteEnv`

### Recommended Fine-Grained Token Settings

Create a fine-grained personal access token with these settings:

- Resource owner: `focusbuddy-dev`
- Repository access: `Only select repositories`
- Selected repository: `focusbuddy`
- Repository permissions:
  - `Issues`: `Read and write`
  - `Pull requests`: `Read and write`
  - `Contents`: `Read`

Use a short expiration unless there is a reason not to.

If the organization requires approval for fine-grained tokens, the token may remain pending until approved.

### macOS Host Setup

On macOS, expose the token to GUI apps such as VS Code through `launchctl`:

```bash
launchctl setenv GH_TOKEN 'YOUR_TOKEN'
launchctl getenv GH_TOKEN
```

Then fully restart VS Code and rebuild the dev container.

### Windows Host Setup (Unverified)

The following Windows steps are included for completeness, but they have not been verified in this repository yet.

The container-side setup should still work because the signing script runs inside the Linux dev container, not on the Windows host.

To expose `GH_TOKEN` from PowerShell for the current session only:

```powershell
$env:GH_TOKEN = "YOUR_TOKEN"
code .
```

To persist `GH_TOKEN` as a user environment variable:

```powershell
setx GH_TOKEN "YOUR_TOKEN"
```

If you use `setx`, fully close VS Code and reopen it before rebuilding the dev container.

Recommended host-side checks on Windows:

```powershell
ssh -T git@github.com
ssh-add -L
echo $env:GH_TOKEN
```

Expected behavior:

- GitHub SSH authentication succeeds
- `ssh-add -L` shows at least one public key
- `GH_TOKEN` is set before VS Code opens the folder in the dev container

## Verification After Rebuild

Run these checks inside the container:

```bash
printenv GH_TOKEN | wc -c
gh auth status
docker version
docker compose version
git config --get user.signingkey
git log --show-signature -1
```

Expected behavior:

- `printenv GH_TOKEN | wc -c` returns more than `1`
- `gh auth status` succeeds without running `gh auth login`
- `docker version` shows Docker client and server information
- `docker compose version` succeeds
- `git config --get user.signingkey` returns the container-local key path
- `git log --show-signature -1` shows the commit signature

## Troubleshooting

### `gh auth status` says you are not logged in

If this command fails but `printenv GH_TOKEN | wc -c` returns `1`, the container received an empty environment variable.

That usually means VS Code did not inherit the host's `GH_TOKEN` value at the time the dev container was rebuilt.

Recommended recovery steps:

1. verify that `GH_TOKEN` is set on the host before rebuilding the container
2. fully restart VS Code
3. rebuild the dev container
4. rerun the verification commands inside the container

On macOS, `launchctl getenv GH_TOKEN` is a useful check.

On Windows PowerShell, use `echo $env:GH_TOKEN`.

### `docker: command not found` from `just local-up`

That usually means the dev container was created without Docker outside of Docker support.

Recommended recovery steps:

1. confirm `.devcontainer/devcontainer.json` includes `ghcr.io/devcontainers/features/docker-outside-of-docker:1`
2. make sure Docker is installed and running on the host machine
3. rebuild the dev container
4. rerun `docker version` and `docker compose version` inside the container

If `docker version` works on the host but not in the container after rebuild, the container likely did not pick up the updated feature configuration.

### `docker info` fails inside the dev container

That means the Docker CLI is present, but the host Docker engine is not reachable from the container.

Recommended recovery steps:

1. start Docker on the host machine
2. rebuild or reopen the dev container
3. rerun `docker version` and `docker compose version` inside the container

### `git commit` fails with a host path under `/Users/...`

That means Git is still pointing at a host-only signing key path.

Check the current setting inside the container:

```bash
git config --show-origin --get-regexp '^(user\.signingkey|commit\.gpgsign|gpg\.format)$'
```

The signing key should point to `/home/node/.ssh/github_signing_key.pub`, not to a host path.

### `ssh -T git@github.com` works but commit signing still fails

That is possible and expected when SSH push authentication works but Git commit signing is misconfigured.

Treat these as separate checks.
