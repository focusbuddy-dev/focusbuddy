#!/usr/bin/env bash

# Bootstrap the core CLI tooling we expect after the dev container is created.

set -euo pipefail

expected_package_manager="$({
	node --input-type=module -e "import { readFileSync } from 'node:fs'; console.log(JSON.parse(readFileSync('./package.json', 'utf8')).packageManager);"
})"

node --version
corepack --version
command -v pnpm || true
pnpm --version || true
printf 'Using package manager from package.json: %s\n' "$expected_package_manager"
corepack prepare "$expected_package_manager" --activate
pnpm --version || true
bash .devcontainer/install-just.sh
just --version
printf '%s\n' 'Repository dependencies are intentionally not installed during post-create.'
printf '%s\n' 'Run just commitlint-setup for the reproducible initial setup flow.'
