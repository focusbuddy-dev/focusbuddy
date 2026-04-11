# API Module Resolution Contract

This document captures the output of issue #158.

Its purpose is to define one repository-owned module resolution contract for `apps/api` across TypeScript compile-time checks, Nest local startup, emitted runtime execution from `dist`, Jest execution, and Prisma command paths.

## Scope

This document defines:

- the currently supported import specifier forms for `apps/api`
- the current app-local import rule for hand-written API code
- how the same rule is expected to hold across compile, local startup, `dist` runtime, Jest, and Prisma command execution
- which specifier forms are intentionally unsupported today
- what a future API-local alias proposal would need to verify before it becomes supported

This document does not define a repository-wide alias rollout, a package-boundary policy change, or an application runtime migration to pure ESM.

## Contract summary

The current supported module resolution contract for `apps/api` is:

- app-local imports use `#api/*` as the repository-owned internal specifier rooted at `apps/api`
- workspace package imports use declared package names and exported subpaths only
- external dependencies use their published package specifiers only
- app-local runtime code, tests, and Prisma config all resolve the same `#api/*` specifier family

This contract is intentionally narrow. `apps/api` owns one internal specifier family and wires every execution path to the same meaning instead of allowing tool-specific aliases to drift.

## Supported specifier forms

### App-local runtime code under `apps/api/src`

Use `#api/*` for app-local code.

Examples:

- `#api/health/health.module`
- `#api/config/local-runtime-env`
- `#api/prisma/prisma.service`

Current hand-written API source intentionally uses this pattern in runtime entrypoints, modules, services, and adapters.

### API test files under `apps/api/test`

Use the same `#api/*` specifiers for API source imports from tests.

Examples:

- `#api/health/health.controller`
- `#api/logging/api-request-logging.interceptor`

This keeps Jest on the same import vocabulary as the runtime paths.

### Workspace package imports

Use declared package names and exported subpaths.

Examples:

- `@focusbuddy/api-contract`
- `@focusbuddy/logger`
- `@focusbuddy/config-jest/api`

This follows the repository-wide workspace boundary rules.

### Prisma config imports

Use the same `#api/*` imports from `prisma.config.ts` into API runtime helpers.

Example:

- `#api/config/local-runtime-env`

This keeps the Prisma CLI path aligned with the same app-local contract used by compile, source startup, tests, and emitted runtime.

## Execution-path contract

### TypeScript compile-time resolution

`apps/api/tsconfig.json` extends the shared API baseline with `module` and `moduleResolution` set to `NodeNext`.

The current repository-owned compile-time contract is:

- `#api/*` app-local imports inside `src`, `test`, and `prisma.config.ts`
- declared package imports for workspace packages and external dependencies
- `package.json#imports` as the runtime contract plus `customConditions: ["development"]` for source-side resolution

### Nest local startup

The API local dev command boots the Nest application directly from the hand-written TypeScript source tree.

The supported contract for that path is:

- `NODE_OPTIONS=--conditions=development`
- `tsx` executes `src/main.ts`
- `#api/*` resolves to `./src/*.ts` through the package `imports` contract

The repository explicitly does not rely on a Nest-only alias hook. Source startup uses the same package `imports` contract as the other paths and only swaps the TypeScript executor.

### Emitted runtime execution from `dist`

The parity and built-runtime path executes the emitted output from `dist/main.js`.

The supported contract for that path is:

- TypeScript preserves `#api/*` specifiers in emitted output
- Node resolves the same `#api/*` specifiers through package `imports`
- the default package `imports` target resolves those specifiers to `./dist/*.js`

This is one reason the contract is owned in `package.json#imports` rather than in TypeScript-only `paths` metadata.

### Jest execution

The API workspace uses `ts-jest` with the local TypeScript config and a Jest mapper for `#api/*`.

The supported test-resolution contract is:

- tests import API source through `#api/*`
- package imports keep using package names
- Jest mirrors the same repository-owned `#api/*` contract instead of inventing a different test-only vocabulary

### Prisma command execution

The Prisma CLI path is configured through `apps/api/prisma.config.ts`, which imports API runtime env helpers through `#api/*`.

The supported Prisma contract is:

- `NODE_OPTIONS=--conditions=development`
- `#api/*` resolves to `./src/*.ts` through package `imports`
- the same source files used by runtime env loading stay reachable without adding a Prisma-only alias rule

## Unsupported contract shapes today

The following are intentionally unsupported for `apps/api` today:

- app-local aliases such as `@/`, `~/`, or bare `src/*`
- a second app-local alias family alongside `#api/*`
- a Jest-only alias that runtime and Prisma paths do not also share
- a Nest-only alias hook that `dist` runtime does not share
- a Prisma-config-only alias that differs from the main API contract

These are unsupported because they would create multiple resolution contracts for the same workspace instead of one repository-owned contract.

## Why the current contract is acceptable now

The current contract is not the shortest to read, but it is explicit and reproducible.

Its advantages are:

- one app-local rule works across compile, startup, built runtime, tests, and Prisma config
- emitted runtime code uses the same specifiers as the source tree
- tests do not need a second source-import vocabulary that runtime code lacks
- Prisma config does not need a config-only relative import exception
- the repository avoids tool-specific resolution drift while keeping NodeNext-compatible runtime behavior

## Future alias prerequisite checklist

Any future proposal to support an app-local alias in `apps/api` must verify all of the following together:

1. TypeScript compile-time resolution accepts the alias without adding deprecated or tool-fragile config.
2. Source startup resolves the same alias without a Nest-only exception path.
3. The built `dist` runtime resolves the same specifiers without hidden loader assumptions.
4. Jest resolves the same alias without creating a test-only contract.
5. Prisma config and Prisma CLI command execution resolve the same alias without a config-only exception path.
6. Fast local development and parity-oriented runtime validation still exercise the same module-resolution rule.

The current `#api/*` contract satisfies that checklist for the API workspace today.
