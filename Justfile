# Show the available developer tasks.
[default]
default:
    just --list

# Install local tooling, configure the commit-msg hook, and run the checks.
commitlint-setup:
    pnpm install --frozen-lockfile
    bash scripts/run-commitlint-checks.sh

# Re-run the commitlint verification, tests, and demo.
commitlint-check:
    bash scripts/run-commitlint-checks.sh

# Format the repository with the shared Prettier config.
format:
    pnpm format

# Check repository formatting without writing changes.
format-check:
    pnpm format:check

# Generate OpenAPI-driven contract outputs.
generate:
    pnpm generate

# Start the default fast compose local development path.
dev:
    bash scripts/local-dev/up.sh

# Stop the default fast compose local development path.
dev-down:
    bash scripts/local-dev/down.sh

# Show logs from the default fast compose local development path.
dev-logs service="":
    bash scripts/local-dev/logs.sh {{service}}

# Open a psql shell against the fast compose PostgreSQL container.
dev-psql:
    bash scripts/local-dev/psql.sh

# Compatibility alias for the fast compose local development path.
local-up:
    bash scripts/local-dev/up.sh

# Compatibility alias for stopping the fast compose local development path.
local-down:
    bash scripts/local-dev/down.sh

# Compatibility alias for showing fast compose logs.
local-logs service="":
    bash scripts/local-dev/logs.sh {{service}}

# Compatibility alias for opening a psql shell against the fast compose PostgreSQL container.
local-psql:
    bash scripts/local-dev/psql.sh
