# API App Baseline

This workspace now contains the first NestJS API baseline for issue #21.

## Current responsibilities

- bootstrap the NestJS runtime on the local API port
- connect Prisma to PostgreSQL through the local startup contract, using explicit `DATABASE_URL` or deriving it from tracked local PostgreSQL inputs for host-side startup
- keep Prisma models separate from generated API contract models through explicit mapper functions
- expose a `/health` endpoint for local runtime and compose health checks

## Tooling

- TypeScript config extends the shared API baseline from `packages/config-typescript`
- oxlint config extends the shared API lint baseline
- Jest uses the shared API baseline plus a local `ts-jest` transform for TypeScript tests
- Prisma CLI uses `prisma.config.ts`, while runtime access uses the PostgreSQL driver adapter required by Prisma 7

## Performance baseline

- start the parity stack from the repository root with `just parity`
- capture the repository-owned API baseline with `pnpm --filter @focusbuddy/api measure:baseline`
- review committed baseline snapshots under `apps/api/performance/baselines/`

The API workspace depends on `@focusbuddy/api-contract` and expects its generated outputs to be built before local compile or test commands run.

The current repository-owned module resolution contract for this workspace uses `#api/*` for app-local imports and is documented in `docs/platform/api-module-resolution-contract.md`.
