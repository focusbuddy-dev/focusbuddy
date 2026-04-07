# Local Development Environment

This document captures the output of issue #51.

Its purpose is to define the first Docker-based local development environment for FocusBuddy.

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

The current `api` and `web` containers intentionally run placeholder runtime scripts because issues #21 and #22 have not implemented the real applications yet.

This keeps the local orchestration, ports, health checks, and runtime assumptions testable now without pretending that the API or web app already exist.

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
- will later be replaced by the real NestJS runtime in issue #21

### `web`

- uses the shared local Node development image
- receives API base URL and auth-related settings through environment variables
- will later be replaced by the real Next.js runtime in issue #22

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

Follow-up implementation issues should continue this rule:

- keep secrets out of tracked files
- keep tracked examples minimal and local-development-oriented
- pass runtime values to containers through compose environment settings rather than hidden machine-specific shell state

## Developer flow

The repository exposes these local development helpers:

- `just local-up`
- `just local-down`
- `just local-logs`
- `just local-psql`

The helper scripts live under [scripts/local-dev](../../scripts/local-dev).

Expected local flow:

1. copy [.env.example](../../.env.example) to a local `.env` file if overrides are needed
2. run `just local-up`
3. inspect logs with `just local-logs`
4. connect to PostgreSQL with `just local-psql` when needed
5. stop the stack with `just local-down`

## Relationship to the dev container

The dev container and the local Docker compose stack solve different problems.

- the dev container prepares the editing and CLI environment
- the local compose stack prepares the app and service runtime topology

They should stay compatible, but they are not the same layer.

## Current differences from deployed runtime

The first local stack intentionally differs from production in these ways:

- PostgreSQL is local Docker PostgreSQL, not Cloud SQL
- auth is a local stub for now, not real Firebase Auth or a full emulator setup yet
- web and API are placeholder runtime services until their app issues land
- there is no Secret Manager or Cloud Run wiring in the local stack

These differences are acceptable for the current stage because the goal is to make the local workflow explicit and reproducible before full app implementation begins.

## Handoff to follow-up issues

### For #21

- replace the API placeholder command with the real NestJS app runtime
- reuse the current `DATABASE_URL` and auth environment pattern where practical

### For #22

- replace the web placeholder command with the real Next.js app runtime
- reuse the current API base URL and auth environment pattern where practical

### For #30

- replace the auth stub with Firebase Auth emulator support or another finalized local auth mechanism

### For #28 and #31

- align the local PostgreSQL and config approach with the later Cloud SQL and runtime configuration rules