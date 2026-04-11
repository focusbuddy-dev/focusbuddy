# Shared Tooling Baselines

This document captures the output of issue #19.

Its purpose is to define the first shared TypeScript, oxlint, Prettier, and Jest baselines for FocusBuddy.

## Scope

This document defines:

- the shared config packages under `packages/config-*`
- the first runtime split between API and web tooling
- the repository-level formatting and lint commands
- the default handling rule for generated files

This document does not define application code, end-to-end test strategy, or deployed-environment workflow wiring beyond the initial merge gate handoff.

## Shared config packages

### `packages/config-typescript`

- `base.json` provides strict TypeScript defaults that are safe for the whole monorepo
- `api.json` extends the base config with Node-oriented module settings for the future NestJS API
- `web.json` extends the base config with browser and bundler settings for the future Next.js web app
- browser-oriented web code should not inherit shared Node globals; if a future web workspace needs Node types for tooling, it should opt in through a separate tooling tsconfig

### `packages/config-oxlint`

- `base/oxlint.config.ts` defines the shared lint baseline and generated-file ignore rules
- the shared base is strict by default for hand-written code and enforces the repository's `undefined`-first and no-non-null-assertion policy
- `repository/oxlint.config.ts` is the root repository config for scripts and config files in this repo
- the repository config carries narrow overrides for script and GitHub helper paths instead of weakening the shared base for all code
- `api/oxlint.config.ts` extends the base config with a Node runtime
- `web/oxlint.config.ts` extends the base config with a browser runtime
- the oxlint baselines are written in TypeScript because that is one of the reasons this repository chose oxlint over a JSON-only lint configuration path

### `packages/config-prettier`

- `index.mjs` is the single source of truth for formatting decisions
- quote style is defined here so style comments do not need to be repeated in reviews
- the repository root consumes this package through `prettier.config.mjs`

### `packages/config-jest`

- `base.ts` defines the shared Jest defaults
- `api.ts` sets the API test environment to Node
- `web.ts` sets the web test environment to jsdom
- `define.ts` owns the shared Jest config type contract for tooling files in this repo
- the repository uses `ts-node` as the Jest config loader for TypeScript-based config files
- app-level Jest config files should consume the shared config typing helper instead of importing low-level Jest type packages directly
- the shared Jest baselines stay directory-agnostic until the real app source trees exist in follow-up issues
- the shared Jest baselines do not enable TypeScript test execution until a real transform is chosen in follow-up app work

## Shared config consumption rule

- app workspaces must consume shared config packages through package names and exported subpaths such as `@focusbuddy/config-jest/web`
- app workspaces must not reach into `packages/*` through relative filesystem paths such as `../../packages/config-jest/...`
- when an app-level config or test file imports a shared config package, that app must declare the package in its own `devDependencies`
- this rule also applies to TypeScript config inheritance when the shared config package exposes a stable package subpath
- root-owned tool executables such as `jest`, `oxlint`, `ts-node`, and `stylelint` may stay at the repository root when package scripts intentionally invoke them through repository-owned command entrypoints

## Repository commands

The repository root now exposes:

- `pnpm format` to apply Prettier
- `pnpm format:check` to verify formatting without writing changes
- `pnpm lint` to run root oxlint checks and then workspace lint tasks
- `pnpm merge-gate` to run the initial merge validation sequence
- `pnpm test` to keep the existing root test flow and workspace test flow
- `pnpm typecheck` to keep the existing workspace typecheck flow

The initial merge gate sequence is:

- `pnpm generate`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`

This keeps generated contract outputs available before downstream validation steps run.

The repository now uses GitHub Actions to run the same merge gate on pull requests and pushes to `main`.

Deploy-only checks remain outside this merge gate. Examples include deployed acceptance checks, deploy approval rules, and runtime-only validation in non-local environments.

The repository-wide package ESM migration strategy is documented in `docs/platform/esm-migration-strategy.md` and must be consulted before converting additional workspace packages to explicit ESM.

The repository default for hand-written JavaScript, TypeScript, and tool config files is now ESM-first. Remaining CommonJS files must be tracked as explicit file-level exceptions in that strategy document.

## Generated files rule

Generated outputs should live under a `generated` or `__generated__` directory whenever possible.

The shared Prettier and oxlint baselines ignore those directories by default.

If a future issue needs committed generated files outside those directories, that issue must update the shared tooling config at the same time.

Hand-written wrapper code should stay outside generated directories so it still receives full lint and format checks.

Hand-written application and package code should also prefer `undefined` over `null` unless a boundary or tool-specific path has a documented exception.

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

- keep the root command entrypoints aligned with the repository merge gate
- keep generated outputs available before downstream validation tasks

### For #71

- keep the root merge-gate entrypoint and the GitHub Actions workflow in sync
- update this document if merge validation adds or removes required checks
