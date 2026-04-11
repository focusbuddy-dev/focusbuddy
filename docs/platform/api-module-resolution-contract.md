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

- app-local imports stay relative-import-first
- workspace package imports use declared package names and exported subpaths only
- external dependencies use their published package specifiers only
- no app-local source alias such as `@/`, `~/`, or bare `src/*` is part of the supported API contract today

This contract is intentionally conservative because it is the one contract shape that already aligns with the API workspace's current execution paths without adding separate runtime-specific resolution shims.

## Supported specifier forms

### App-local runtime code under `apps/api/src`

Use relative specifiers for app-local code.

Examples:

- `./health/health.module`
- `../config/local-runtime-env`
- `./prisma.service`

Current hand-written API source intentionally uses this pattern in runtime entrypoints, modules, services, and adapters.

### API test files under `apps/api/test`

Use relative specifiers into `../src/*` for API source imports from tests.

Examples:

- `../src/health/health.controller`
- `../src/logging/api-request-logging.interceptor`

This matches the current `ts-jest` contract and avoids introducing a test-only alias rule that the runtime paths do not also own.

### Workspace package imports

Use declared package names and exported subpaths.

Examples:

- `@focusbuddy/api-contract`
- `@focusbuddy/logger`
- `@focusbuddy/config-jest/api`

This follows the repository-wide workspace boundary rules.

### Prisma config imports

Use relative imports from `prisma.config.ts` into API runtime helpers under `./src/*`.

Example:

- `./src/config/local-runtime-env`

This keeps the Prisma CLI path aligned with the API source tree without inventing a separate config-only alias contract.

## Execution-path contract

### TypeScript compile-time resolution

`apps/api/tsconfig.json` extends the shared API baseline with `module` and `moduleResolution` set to `NodeNext`.

The current repository-owned compile-time contract is:

- relative app-local imports inside `src` and `test`
- declared package imports for workspace packages and external dependencies
- no repository-owned app-local `paths` mapping for API source aliases

### Nest local startup

The API local dev command uses Nest startup against the hand-written TypeScript source tree.

The supported contract for that path is still the same relative-import-first source layout. No additional alias loader, runtime import hook, or Nest-only resolution override is currently part of the supported API startup contract.

### Emitted runtime execution from `dist`

The parity and built-runtime path executes the emitted output from `dist/main.js`.

The supported contract for that path is:

- TypeScript emits runtime-relative module references that remain valid after the `src` tree is built into `dist`
- runtime resolution does not depend on TypeScript-only alias metadata surviving into Node execution

This is one reason the current app-local contract stays relative-import-first.

### Jest execution

The API workspace uses `ts-jest` with the local TypeScript config and does not currently opt into a separate API alias contract.

The supported test-resolution contract is:

- tests import source through relative paths into `../src/*`
- package imports keep using package names
- Jest does not own a separate app-local alias mapping for API source files today

### Prisma command execution

The Prisma CLI path is configured through `apps/api/prisma.config.ts`, which imports API runtime env helpers from the source tree.

The supported Prisma contract is:

- config-to-source imports remain relative
- Prisma commands do not rely on a TypeScript-only app-local alias mapping
- the same source files used by runtime env loading stay reachable without adding a Prisma-specific resolution rule

## Unsupported contract shapes today

The following are intentionally unsupported for `apps/api` today:

- app-local aliases such as `@/`, `~/`, or `src/*`
- a Jest-only alias that runtime and Prisma paths do not also share
- a Nest-only or ts-node-only alias hook that `dist` runtime does not share
- a Prisma-config-only alias that differs from the main API source contract

These are unsupported because they would create multiple resolution contracts for the same workspace instead of one repository-owned contract.

## Why the current contract is acceptable now

The current contract is not the shortest to read, but it is explicit and reproducible.

Its advantages are:

- one app-local rule works across compile, startup, built runtime, tests, and Prisma config
- emitted runtime code does not depend on TypeScript-only alias rewrites
- tests do not need a second source-import vocabulary that runtime code lacks
- the repository avoids tool-specific resolution drift while the API runtime contract is still stabilizing

## Future alias prerequisite checklist

Any future proposal to support an app-local alias in `apps/api` must verify all of the following together:

1. TypeScript compile-time resolution accepts the alias without adding deprecated or tool-fragile config.
2. Nest local startup and watch mode resolve the same alias without a dev-only exception path.
3. The built `dist` runtime resolves the same specifiers without hidden loader assumptions.
4. Jest resolves the same alias without creating a test-only contract.
5. Prisma config and Prisma CLI command execution resolve the same alias without a config-only exception path.
6. Fast local development and parity-oriented runtime validation still exercise the same module-resolution rule.

Until that checklist is satisfied, the supported API contract remains relative-import-first.