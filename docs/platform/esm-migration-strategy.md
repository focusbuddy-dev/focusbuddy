# Repository ESM Strategy

This document captures the repository module strategy after issue #57 and the package migration work from issue #120.

Its purpose is to define an ESM-first repository policy, the file-level CommonJS exceptions that still remain, and the package contract for workspace packages that move to explicit ESM after the focused logger-package change from issue #23.

## Scope

This document defines:

- the repository default for hand-written JavaScript, TypeScript, and tool config files
- which current files are allowed to remain CommonJS
- which workspace packages are candidates for explicit ESM conversion
- the package contract required before a package can declare `type: module`
- when CommonJS compatibility may remain in place for packages or config files that still need it
- an ordered follow-up plan for package-by-package migration work

This document does not define a repository-wide app runtime conversion to pure ESM.

## Decision rules

- all hand-written JavaScript and TypeScript should be written in ESM form unless a documented exception still applies
- tool config files should use ESM-compatible formats whenever the current toolchain supports them in a stable way
- CommonJS is allowed only for a file whose current tool or invocation path is not yet verified as stable under ESM
- CommonJS exceptions must be tracked file-by-file with both the current reason and the condition that would allow removal
- new files must default to ESM and must not introduce new CommonJS entrypoints without a documented blocker
- existing CommonJS files should be treated as temporary compatibility shims and removed once the blocker is verified gone
- explicit ESM is opt-in per package; one package changing module mode does not authorize ad hoc conversion of unrelated packages
- runtime packages that other workspaces import at runtime should prefer built artifact exports over raw source file exports before they become explicit ESM packages
- runtime packages should default to explicit ESM-only exports and should add a CommonJS `require` path only when a verified current consumer or tool still blocks on it
- config packages consumed directly by tools should not change module contracts until the consuming toolchain contract is documented and verified
- a package or config file may keep CommonJS compatibility only while a verified current consumer or tool still relies on `require()` or a CommonJS-only loader path
- no package may switch to explicit ESM without a documented export surface, build output contract, and verification plan

## Current CommonJS exceptions

The repository currently has no documented file-level CommonJS exceptions.

## Issue 57 resolved decisions

- add `type: module` at the repository root so root-owned TypeScript and JavaScript tool configs load without typeless-package warnings
- add `type: module` to `apps/api` and `apps/web` so app-owned TypeScript tooling files inherit the same ESM-first rule as the repository root
- keep the API app on the NodeNext TypeScript baseline and use `.js` relative import specifiers in hand-written source so emitted runtime code stays valid under the package-level ESM rule
- add `type: module` to `packages/config-jest` and `packages/config-oxlint` because those packages export raw TypeScript config modules and are now part of the verified ESM tool-config path
- do not add `type: module` to `packages/config-typescript` because it only ships JSON config data and does not need JavaScript module interpretation
- keep `commitlint.config.ts`, `prettier.config.mjs`, and `stylelint.config.mjs` as the repository root tool-config entrypoints
- treat future `MODULE_TYPELESS_PACKAGE_JSON` warnings in CI as blocked regressions, not tolerated noise

## Package inventory and migration stance

| Workspace                    | Current state                                                                                            | Migration stance                                                                                        | Notes                                                                                                                                          |
| ---------------------------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/logger`            | explicit ESM runtime package                                                                             | keep as the repository's simplest runtime-package reference                                             | uses `type: module`, explicit ESM export entrypoints, and TypeScript-emitted build artifacts                                                   |
| `packages/api-contract`      | explicit ESM runtime package with generated `.ts` source and built `.js` artifacts                       | continue tightening the build contract                                                                  | should keep moving toward built-artifact-first consumption and now points generator formatting at the root ESM Prettier entry                  |
| `packages/config-typescript` | exports shared JSON config files                                                                         | keep current mode for now                                                                               | TypeScript config consumers do not benefit from package-level ESM and still depend on current tool loading behavior                            |
| `packages/config-jest`       | `type: module` config package that exports raw `.ts` config modules with a shared ESM-consumption helper | keep as the shared Jest config source                                                                   | the shared baseline now owns `node_modules` allowlist rules and the package scope removes typeless-package warnings during Jest config loading |
| `packages/config-oxlint`     | `type: module` config package that exports raw `.ts` config modules                                      | keep as the shared oxlint config source                                                                 | current consumers still depend on tool execution of TypeScript config files, but the package scope now removes typeless-package warnings       |
| `packages/config-prettier`   | explicit `.mjs` tool config package                                                                      | keep as the shared Prettier reference                                                                   | the repository root and the API contract generator both consume the ESM entry                                                                  |
| `apps/api`                   | `type: module` NodeNext TypeScript app consumer                                                          | keep the package-level ESM rule and validate runtime scripts through NodeNext-compatible source imports | the app remains on the existing NestJS-oriented TypeScript baseline and now uses `.js` relative specifiers in hand-written source              |
| `apps/web`                   | `type: module` bundler-managed app consumer                                                              | keep the package-level ESM rule                                                                         | Next.js tooling already runs through ESM-safe config entrypoints and does not require CommonJS compatibility                                   |
| `apps/mobile`                | placeholder workspace                                                                                    | no action now                                                                                           | revisit when the workspace has real runtime code                                                                                               |

## Explicit ESM package contract

Any workspace package that becomes an explicit ESM package must satisfy all of the following:

1. declare `type: module` in its package manifest
2. export only documented public entrypoints through `exports`
3. publish built JavaScript artifacts instead of exposing raw `.ts` source files as the primary runtime contract
4. provide `types` entries for every public subpath
5. omit the CommonJS `require` condition by default and add it only when a verified current consumer or tool still needs CommonJS compatibility
6. use NodeNext-compatible relative import specifiers in source where emitted JavaScript requires them
7. include verification that the ESM import path resolves correctly and that any retained CommonJS path still resolves when one is intentionally kept

The logger package is the current repository reference for a runtime package that can move to explicit ESM without retaining a separate CommonJS artifact. Future package migrations should copy the contract shape that matches their actual consumers, not preserve CommonJS by default.

## Tooling constraints and current breakpoints

### Jest and TypeScript test loading

The shared Jest baseline now includes one repository-owned way to consume ESM packages from Jest configs: `withEsmPackageSupport` in `packages/config-jest`. The current web Jest setup already uses that helper to allowlist specific ESM packages under `node_modules`.

The API workspace still uses `ts-jest` with the local TypeScript config and does not enable Jest's ESM mode by default. That means the next ESM-only runtime package consumed by API tests should update the API Jest transform at the same time instead of forcing the package back to CommonJS compatibility.

For this repository, the current Jest rule is:

- use the shared Jest baseline to own `transformIgnorePatterns` allowlists for ESM packages under `node_modules`
- add `extensionsToTreatAsEsm` through the shared helper only when the consuming app is actually opting into Jest ESM execution
- pair `withEsmPackageSupport` with `ts-jest` `useESM: true` in the API workspace when the first ESM-only runtime package enters API test execution
- verify `require` behavior only for packages that intentionally retain a CommonJS path

### Tool-owned config packages

The shared config packages currently export raw `.ts`, `.json`, and `.mjs` files that are consumed directly by TypeScript, Jest, oxlint, and Prettier tooling entrypoints.

Those packages still need coordinated loader decisions because their consumers are tools, not normal runtime imports. Issue #57 verifies the current Jest and oxlint paths well enough to mark `packages/config-jest` and `packages/config-oxlint` as `type: module`, but future config-package changes should still be validated as a repository-owned contract.

The repository default is still ESM-first for tool configs. The current rule is:

- prefer `.ts`, `.mts`, `.mjs`, or other ESM-compatible config formats when the tool documents stable support
- keep a CommonJS config only when the exact current invocation path is still unverified or unstable under ESM
- document each remaining CommonJS file in the exception table above instead of treating config packages as blanket CommonJS-only areas

### API runtime compatibility

The API workspace uses the NodeNext TypeScript baseline with NestJS-oriented compiler settings. Under the issue #57 decision, the API package now declares `type: module` and keeps runtime compatibility by using NodeNext-safe `.js` relative import specifiers in hand-written source and config files that run directly under Node.

For this repository, the API package-level ESM rule is now decided, but broader runtime migration work should still stay focused on verified consumer and deployment behavior rather than ad hoc file-by-file churn.

### Build orchestration

The repository build and test tasks rely on upstream workspace builds through Turborepo. Any package that moves to explicit ESM must define a stable output layout so downstream tasks do not depend on raw source layout assumptions.

## What can move package-by-package

- runtime libraries with a narrow public API and an explicit build output can migrate individually once they adopt the full package contract
- packages whose current consumers are already ESM-compatible can follow the logger package's ESM-only pattern in separate implementation issues
- root tool configs such as commitlint and stylelint should move to ESM-compatible file formats as soon as their current command paths are verified

## What must be coordinated across the repository

- any change to `packages/config-jest`, `packages/config-oxlint`, `packages/config-typescript`, or `packages/config-prettier`
- any change that requires the shared Jest baseline to adopt repository-wide ESM handling rules
- any change that removes CommonJS compatibility from a package or config file still consumed by existing Node or tool entrypoints
- any change that couples package migration with an application runtime module-strategy change

## Ordered follow-up plan

1. keep `packages/logger` as the ESM-only runtime reference and `packages/config-jest` as the shared Jest ESM-consumption reference for future runtime packages
2. define the build output and export contract for `packages/api-contract` so generated source stops being the primary runtime surface
3. migrate `packages/api-contract` after its build and consumer contract are documented, keeping it ESM-only unless a verified blocker requires a CommonJS path
4. keep converting root tool configs to ESM-compatible formats when their current invocations are verified, and keep the CommonJS exception list as small as possible
5. decide whether config packages should remain direct source-export tool packages or move to a separate built-distribution model before attempting any coordinated config-package module-contract change
6. revisit application runtime module strategy only after package-level migration rules are stable and proven in at least one additional runtime package

## Follow-up issue split

The next implementation work should be split into discrete repository tasks:

- define the build artifact and export contract for `packages/api-contract`
- migrate `packages/api-contract` as ESM-only unless an actual current consumer forces a retained CommonJS path
- decide the long-term contract for config packages: direct source exports versus built distribution packages
- audit API-side consumer compatibility before any package drops CommonJS support

## Review trigger

This strategy should be revisited whenever a new workspace package is proposed as an explicit ESM package, or when shared tooling changes reduce the repository's need for CommonJS compatibility.
