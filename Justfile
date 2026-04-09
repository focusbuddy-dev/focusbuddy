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

# Install workspace dependencies and restart running app services.
install:
    bash scripts/local-dev/install.sh

# Apply a local Prisma schema migration and restart running app services.
prisma name:
    bash scripts/local-dev/prisma.sh {{name}}

# Regenerate OpenAPI contract outputs and restart running app services.
openapi:
    bash scripts/local-dev/openapi.sh

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

# Show logs from only the currently running fast compose services.
dev-logs-running:
    bash scripts/local-dev/logs-running.sh

# Open a psql shell against the fast compose PostgreSQL container.
dev-psql:
    bash scripts/local-dev/psql.sh
