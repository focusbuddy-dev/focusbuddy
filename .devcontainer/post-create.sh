#!/usr/bin/env bash

# Bootstrap the core CLI tooling we expect after the dev container is created.

set -euo pipefail

node --version
npm --version
corepack --version
command -v pnpm || true
pnpm --version || true
corepack prepare pnpm@10.33.0 --activate
pnpm --version || true
bash .devcontainer/install-just.sh
just --version