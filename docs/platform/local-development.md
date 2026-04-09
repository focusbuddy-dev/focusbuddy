# Local Development Environment

This document captures the output of issue #51.

Its purpose is to define the first Docker-based local development environment for FocusBuddy.

For the current repository policy on supported local execution modes, see [local-execution-modes.md](./local-execution-modes.md).

## Scope

This document defines:

- the first local Docker orchestration approach
- the runtime layout for web, API, PostgreSQL, and local auth development support
- the local environment variable strategy
- the current local authentication strategy and its planned evolution

This document does not define production deployment, final Cloud Run setup, or feature implementation inside web or API.

## Chosen local orchestration

The local development stack uses `docker compose` with [compose.local.yaml](../../compose.local.yaml).

The compose file currently starts four services:

- `postgres` for a real local PostgreSQL instance
- `auth` for a local auth stub service
- `api` for the API runtime container
- `web` for the web runtime container

Issue #21 replaces the API placeholder with the real NestJS runtime while keeping the same local port and environment variable wiring.

Issue #22 creates the real Next.js web baseline under `apps/web`, and issue #106 wires that baseline into the local Docker Compose `web` service.

This keeps the local orchestration, ports, health checks, and runtime assumptions testable while aligning the local stack with the current real API and web baselines.

## Service roles

### `postgres`

- uses the official `postgres:16-bookworm` image
- persists data in a named Docker volume
- is the source of truth for local PostgreSQL behavior in development

### `auth`

- currently runs a local development auth stub
- exposes the local auth base URL that web and API can target during early development
- exists so auth assumptions are explicit before Firebase Auth integration is implemented

### `api`

- uses the shared local Node development image
- receives `DATABASE_URL`, auth mode, and auth base URL through environment variables
- now runs the first NestJS API baseline from issue #21
- restarts through Nest watch mode when local API source files change during `just dev`
- exposes `/health` so the compose health check can validate both NestJS startup and PostgreSQL connectivity

### `web`

- uses the shared local Node development image
- runs the real Next.js baseline created in issue #22 and wired into local compose by issue #106
- receives API base URL and auth-related settings through environment variables
- exposes `/health` so the compose health check can validate that the web runtime is reachable after startup

## Shared local image

The shared local runtime image lives at [docker/local/node-dev.Dockerfile](../../docker/local/node-dev.Dockerfile).

Current purpose:

- provide a stable Debian-based Node runtime close to the repository dev environment
- enable `pnpm` through Corepack
- give the local compose services one shared base image instead of service-specific ad hoc commands

This is not meant to be a production image.

## Local authentication strategy

The chosen local auth strategy has two phases.

### Current phase

- use `FOCUSBUDDY_AUTH_MODE=stub`
- run the `auth` service as a local auth stub
- make web and API read auth mode and auth base URL from environment variables

This keeps local auth explicit even before Firebase integration is implemented.

### Planned follow-up phase

- switch the `auth` service from the stub to Firebase Auth emulator support when issue #30 is implemented
- keep the same high-level wiring pattern so web and API still read auth settings from environment variables

This means the repository does not try to fully reproduce managed Firebase behavior today, but it also does not leave local auth behavior undefined.

## Local environment variable strategy

The first tracked example file is [.env.example](../../.env.example).

The local compose stack currently expects these categories of values:

- PostgreSQL database name, user, password, and host port
- host port mappings for API, web, and auth
- local auth mode
- a browser-visible API base URL for the Next.js web runtime

Follow-up implementation issues should continue this rule:

- keep secrets out of tracked files
- keep tracked examples minimal and local-development-oriented
- pass runtime values to containers through compose environment settings rather than hidden machine-specific shell state
- distinguish between container-internal service URLs and browser-visible URLs when wiring frontend runtime variables

For API local startup, the runtime contract is:

- load `.env` before local runtime validation
- honor an explicit `DATABASE_URL` when one is already provided
- derive a localhost PostgreSQL connection string from tracked `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, and optional `POSTGRES_PORT` when `DATABASE_URL` is absent
- fail fast with an actionable startup error when neither an explicit nor a derivable local database connection is available

This keeps the tracked local PostgreSQL inputs as the source of configuration categories while still allowing Compose and host-side auxiliary startup to resolve different final runtime addresses.

## Developer flow

The repository exposes these local development helpers:

- `just install`
- `just schema <migration-name>`
- `just dev`
- `just dev-down`
- `just dev-logs`
- `just dev-logs-running`
- `just dev-psql`

The helper scripts live under [scripts/local-dev](../../scripts/local-dev).

Routine full-stack local development should start with the `just dev` entrypoint.

Re-running `just dev` while the stack is already up restarts the development-oriented app services (`auth`, `api`, and `web`) so package manifest or startup script changes are picked up without recycling PostgreSQL.

When you need to update workspace dependencies, run `just install`. It executes `pnpm install` from the repository root and then restarts the currently running app services so dependency and startup changes are picked up without restarting PostgreSQL.

When you change the Prisma schema, run `just schema <migration-name>`. It applies the API migration, regenerates the Prisma client through the existing package script, and then restarts the currently running app services so the updated schema contract is picked up without restarting PostgreSQL.

Low-level host-side commands such as `pnpm dev` and direct app package dev commands remain available as auxiliary escape hatches, but they are not the primary supported full-stack workflow.

Expected local flow:

1. copy [.env.example](../../.env.example) to a local `.env` file if overrides are needed
2. If you are working inside the dev container, rebuild it with Docker outside of Docker support enabled
3. Make sure Docker is installed and running on the host machine
4. run `just dev`
5. run `just install` whenever a local dependency change should also refresh the running app services
6. run `just schema <migration-name>` whenever a Prisma schema change should also refresh the running app services
7. inspect logs with `just dev-logs`
8. inspect only the currently running service logs with `just dev-logs-running` when you want a narrower follow mode
9. connect to PostgreSQL with `just dev-psql` when needed
10. stop the stack with `just dev-down`

This flow is the current `fast compose` lane. It is the default full-stack local workflow for this repository.

## Relationship to the dev container

The dev container and the local Docker compose stack solve different problems.

- the dev container prepares the editing and CLI environment
- the local compose stack prepares the app and service runtime topology

They should stay compatible, but they are not the same layer.

When the repository dev container is rebuilt with Docker outside of Docker enabled, Docker commands run inside the dev container use the host machine's Docker engine rather than a separate Docker daemon inside the container.

This means the local compose workflow can be started from inside the dev container, but it still depends on Docker being installed and running on the host machine.

The compose file also needs bind mounts to resolve against the host filesystem, not the container-only `/workspaces/...` path. The dev container handles that by forwarding the host repository path through `FOCUSBUDDY_WORKSPACE_MOUNT`, which the compose file uses as the bind mount source when available.

## Current differences from deployed runtime

The first local stack intentionally differs from production in these ways:

- PostgreSQL is local Docker PostgreSQL, not Cloud SQL
- auth is a local stub for now, not real Firebase Auth or a full emulator setup yet
- web now serves the current Next.js baseline, but feature UI remains intentionally minimal after issue #22
- there is no Secret Manager or Cloud Run wiring in the local stack

These differences are acceptable for the current stage because the goal is to make the local workflow explicit and reproducible before full app implementation begins.

For the distinction between the default `fast compose` path, the future `parity compose` path, and host-side auxiliary startup, see [local-execution-modes.md](./local-execution-modes.md).

## Handoff to follow-up issues

### For #21

- extend the real NestJS API baseline with feature modules and real endpoints
- keep the current `DATABASE_URL` and auth environment pattern where practical

### For #22 and #106

- issue #22 established the Next.js web baseline only
- issue #106 connects that baseline to the local Docker Compose `web` runtime
- follow-up web issues should build on the real local compose runtime rather than reintroducing the placeholder service

### For #30

- replace the auth stub with Firebase Auth emulator support or another finalized local auth mechanism

### For #28 and #31

- align the local PostgreSQL and config approach with the later Cloud SQL and runtime configuration rules
