# Shared Tooling Baselines

This document captures the output of issue #19.

Its purpose is to define the first shared TypeScript, oxlint, Prettier, and Jest baselines for FocusBuddy.

## Scope

This document defines:

- the shared config packages under `packages/config-*`
- the first runtime split between API and web tooling
- the repository-level formatting and lint commands
- the default handling rule for generated files

This document does not define application code, end-to-end test strategy, or CI workflow wiring.

## Shared config packages

### `packages/config-typescript`

- `base.json` provides strict TypeScript defaults that are safe for the whole monorepo
- `api.json` extends the base config with Node-oriented module settings for the future NestJS API
- `web.json` extends the base config with browser and bundler settings for the future Next.js web app
- browser-oriented web code should not inherit shared Node globals; if a future web workspace needs Node types for tooling, it should opt in through a separate tooling tsconfig

### `packages/config-oxlint`

- `base/oxlint.config.ts` defines the shared lint baseline and generated-file ignore rules
- `repository/oxlint.config.ts` is the root repository config for scripts and config files in this repo
- `api/oxlint.config.ts` extends the base config with a Node runtime
- `web/oxlint.config.ts` extends the base config with a browser runtime
- the oxlint baselines are written in TypeScript because that is one of the reasons this repository chose oxlint over a JSON-only lint configuration path

### `packages/config-prettier`

- `index.cjs` is the single source of truth for formatting decisions
- quote style is defined here so style comments do not need to be repeated in reviews

### `packages/config-jest`

- `base.ts` defines the shared Jest defaults
- `api.ts` sets the API test environment to Node
- `web.ts` sets the web test environment to jsdom
- the repository uses `ts-node` as the Jest config loader for TypeScript-based config files
- the shared Jest baselines stay directory-agnostic until the real app source trees exist in follow-up issues
- the shared Jest baselines do not enable TypeScript test execution until a real transform is chosen in follow-up app work

## Repository commands

The repository root now exposes:

- `pnpm format` to apply Prettier
- `pnpm format:check` to verify formatting without writing changes
- `pnpm lint` to run root oxlint checks and then workspace lint tasks
- `pnpm test` to keep the existing root test flow and workspace test flow
- `pnpm typecheck` to keep the existing workspace typecheck flow

## Generated files rule

Generated outputs should live under a `generated` or `__generated__` directory whenever possible.

The shared Prettier and oxlint baselines ignore those directories by default.

If a future issue needs committed generated files outside those directories, that issue must update the shared tooling config at the same time.

Hand-written wrapper code should stay outside generated directories so it still receives full lint and format checks.

## Runtime-specific usage

The API and web workspaces now include local config entry files that point to the shared baselines:

- `apps/api/tsconfig.json`
- `apps/api/oxlint.config.ts`
- `apps/api/jest.config.ts`
- `apps/web/tsconfig.json`
- `apps/web/oxlint.config.ts`
- `apps/web/jest.config.ts`

This keeps issue #21 and issue #22 focused on app implementation instead of re-deciding tool defaults.

## Handoff to follow-up issues

### For #21 and #22

- wire the real source and test files into the shared TypeScript, Jest, and oxlint configs
- add app-specific overrides only when the shared baseline is not enough
- choose a real TypeScript test transform before enabling `ts` or `tsx` test execution in Jest

### For #24

- run `pnpm format:check` and `pnpm lint` in CI
- treat formatting drift as a failed check instead of a review comment
