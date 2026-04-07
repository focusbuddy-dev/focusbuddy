# Monorepo Workspace Layout

This document captures the output of issue #18.

Its purpose is to define the first Turborepo workspace layout and the initial package boundaries for FocusBuddy.

## Scope

This document defines:

- the top-level `apps` and `packages` layout
- the first responsibility split for web, API, mobile, and shared packages
- the basic Turborepo task structure used from the repository root

This document does not define detailed app implementation, Prisma setup details, or OpenAPI generation details.

## Workspace tree

```text
apps/
  api/
  mobile/
  web/
packages/
  api-contract/
  config-jest/
  config-oxlint/
  config-prettier/
  config-typescript/
  logger/
```

## App boundaries

### `apps/api`

- owns the future NestJS API application
- owns Prisma integration and database access inside the API boundary
- maps persistence models to contract models instead of leaking database shapes directly
- is the main implementation target for issue #21

### `apps/web`

- owns the future Next.js web application
- consumes generated contract outputs instead of defining API shapes directly
- is the main implementation target for issue #22

### `apps/mobile`

- reserves the future mobile app boundary without implementing it now
- should later consume the same contract outputs and shared logger facade where practical
- stays as a placeholder in the MVP setup stage

## Shared package boundaries

### `packages/api-contract`

- stores the future OpenAPI source of truth
- is expected to own generated contract outputs such as TypeScript types, validation helpers, and API client artifacts
- is the main implementation target for issue #20

### `packages/config-typescript`

- will provide the shared TypeScript config baseline
- is reserved for issue #19

### `packages/config-oxlint`

- will provide the shared oxlint baseline and runtime-specific overrides
- is reserved for issue #19

### `packages/config-prettier`

- will provide the shared Prettier baseline
- is reserved for issue #19

### `packages/config-jest`

- will provide the shared Jest baseline and environment split for web and API
- is reserved for issue #19

### `packages/logger`

- will expose the shared logger interface and runtime-specific adapters
- is the main implementation target for issue #23

## Boundary rules

- app code lives under `apps/*`
- shared reusable code or configuration lives under `packages/*`
- API contract ownership starts in `packages/api-contract`, not in the API app
- Prisma and database access stay in the API boundary unless a later issue explicitly extracts a shared database package
- generated contract outputs are expected to be consumed by apps, not edited manually inside apps
- mobile remains reserved but should follow the same package boundary rules when implemented later

## Basic Turborepo task structure

The repository root exposes these first shared commands:

- `pnpm build`
- `pnpm dev`
- `pnpm lint`
- `pnpm test`
- `pnpm typecheck`

The initial `turbo.json` intentionally stays small.

- `build` depends on upstream workspace builds
- `build` currently declares no outputs because the issue only creates placeholder workspaces, not real app artifacts yet
- `dev` is uncached because later app dev servers will be long-running
- `lint`, `test`, and `typecheck` are defined at the workspace level so the root can orchestrate them consistently

The current workspace package scripts are placeholders so the monorepo structure can be validated before follow-up issues add real implementation.

## Handoff to follow-up issues

### For #19

- the shared tooling baselines are now documented in `docs/platform/shared-tooling.md`
- future app work should consume the shared config packages instead of defining one-off local tool settings

### For #20

- replace the placeholder contract package with the first OpenAPI-driven package and generation flow

### For #21

- implement the NestJS API app inside `apps/api`
- wire Prisma into the API boundary using the schema decisions from issue #40

### For #22

- implement the Next.js app inside `apps/web`

### For #23

- replace the placeholder logger package with the shared logger facade and runtime-specific adapters

### For #51

- add the Docker-based local development environment on top of this workspace layout
