# FocusBuddy

🚧 Work in Progress

FocusBuddy is a monorepo for a Pomodoro-based focus tracking app with content logging and learning time insights.

## Status

Implementation has not started yet, but the monorepo workspace skeleton is now in place.

This repository is currently being prepared with:

- shared Copilot workflow settings under `.github`
- a development container
- the initial project overview

## Development Setup

Dev container setup details are documented in [.devcontainer/README.md](.devcontainer/README.md), including:

- SSH-based Git commit signing inside the container
- `gh` authentication with a fine-grained personal access token
- verification and troubleshooting steps for local development

The Docker-based local development environment is documented in [docs/platform/local-development.md](docs/platform/local-development.md).

### Commit Message Tooling Demo

This repository includes a small commitlint demo for Issue #14.

Initial setup is wrapped in the Justfile recipe below. `pnpm` is the only supported package manager for this repository. The setup installs the local tooling from `pnpm-lock.yaml` without changing the lockfile, configures the `commit-msg` hook, and runs the commitlint verification steps.

`npm install` is rejected by the repository configuration before dependency resolution starts, so setup mistakes fail fast with an explicit package-manager error instead of drifting into npm-specific install behavior.

Inside the dev container, `just` is installed automatically. If you work outside the dev container, install `just` before running repository tasks.

Run this command after cloning the repository:

```bash
just commitlint-setup
```

If `pnpm-lock.yaml` is out of sync with `package.json`, the setup stops early so the mismatch can be reviewed instead of silently changing installed versions.

If dependencies are already installed and you only want to rerun the checks, use:

```bash
just commitlint-check
```

To see the available developer tasks, run:

```bash
just --list
```

The current demo accepts issue references such as `#14`, `refs #14`, or `fixes #14` in the commit message.

## Goal

FocusBuddy aims to help users:

- track focus sessions with a Pomodoro timer
- record what they worked on
- understand how long learning content takes over time

## Workspace Layout

The initial Turborepo workspace layout for Issue #18 is documented in [docs/platform/monorepo-workspace.md](docs/platform/monorepo-workspace.md).

The shared TypeScript, oxlint, Prettier, and Jest baselines for Issue #19 are documented in [docs/platform/shared-tooling.md](docs/platform/shared-tooling.md).

The current top-level areas are:

- `apps/api` for the future NestJS API app
- `apps/web` for the future Next.js web app
- `apps/mobile` as the reserved mobile app boundary
- `packages/api-contract` for the future OpenAPI spec and generated contract outputs
- `packages/config-*` for shared toolchain config packages
- `packages/logger` for the shared logger facade and runtime adapters

## Shared Tooling

The repository now exposes common developer commands for formatting, linting, testing, and type checking:

- `pnpm generate`
- `pnpm format`
- `pnpm format:check`
- `pnpm lint`
- `pnpm test`
- `pnpm typecheck`

Formatting is owned by Prettier, including quote style decisions for JavaScript and TypeScript files.

Linting is owned by oxlint.

Generated files are expected to live under `generated` or `__generated__` directories and are excluded from shared formatting and linting by default.

The OpenAPI contract package and its generation flow for Issue #20 live in `packages/api-contract`.

## Local Development Stack

Issue #51 adds a first local Docker development baseline with:

- `compose.local.yaml` for the local stack definition
- a shared local Node dev image under `docker/local`
- helper scripts under `scripts/local-dev`
- a documented local authentication strategy for web and API follow-up work

## Design Notes

- The first public-safe domain design note is available at [docs/domain/mvp-domain-model.md](docs/domain/mvp-domain-model.md).
- The follow-up continuity rules note is available at [docs/domain/mvp-continuity-rules.md](docs/domain/mvp-continuity-rules.md).
- The logical ER review note is available at [docs/domain/mvp-logical-er-review.md](docs/domain/mvp-logical-er-review.md).
- The Prisma schema design note is available at [docs/domain/mvp-prisma-schema-design.md](docs/domain/mvp-prisma-schema-design.md).
- The follow-up stamp and summary rules note is available at [docs/domain/mvp-stamp-and-summary-rules.md](docs/domain/mvp-stamp-and-summary-rules.md).
- The follow-up visibility rules note is available at [docs/domain/mvp-visibility-rules.md](docs/domain/mvp-visibility-rules.md).
