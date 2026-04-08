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

# Start the local Docker development stack.
local-up:
    bash scripts/local-dev/up.sh

# Stop the local Docker development stack.
local-down:
    bash scripts/local-dev/down.sh

# Show logs from the local Docker development stack.
local-logs service="":
    bash scripts/local-dev/logs.sh {{service}}

# Open a psql shell against the local PostgreSQL container.
local-psql:
    bash scripts/local-dev/psql.sh