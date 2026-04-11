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

The repository currently allows only these file-level CommonJS exceptions:

| File | Why it remains CommonJS | Exit condition |
| --- | --- | --- |
| `prettier.config.cjs` | the repository root and generator tooling still rely on a stable CommonJS Prettier config path | remove once the root Prettier entry and all explicit callers are verified against an ESM config path |
| `packages/config-prettier/index.cjs` | the shared Prettier config package currently publishes the CommonJS entry consumed by `prettier.config.cjs` | remove once the shared Prettier package can publish an ESM entry that all current callers load without compatibility issues |

## Package inventory and migration stance

| Workspace | Current state | Migration stance | Notes |
| --- | --- | --- | --- |
| `packages/logger` | explicit ESM runtime package | keep as the repository's simplest runtime-package reference | uses `type: module`, explicit ESM export entrypoints, and TypeScript-emitted build artifacts |
| `packages/api-contract` | explicit ESM runtime package with generated `.ts` source and built `.js` artifacts | continue tightening the build contract | should keep moving toward built-artifact-first consumption and currently still points generator formatting at the root CommonJS Prettier entry |
| `packages/config-typescript` | exports shared JSON config files | keep current mode for now | TypeScript config consumers do not benefit from package-level ESM and still depend on current tool loading behavior |
| `packages/config-jest` | exports raw `.ts` config modules with a shared ESM-consumption helper | coordinated migration only | the shared baseline now owns `node_modules` allowlist rules for ESM package consumption, but the package itself still relies on TypeScript config loading and Jest-specific loader behavior |
| `packages/config-oxlint` | exports raw `.ts` config modules | coordinated migration only | current consumers depend on tool execution of TypeScript config files |
| `packages/config-prettier` | CommonJS-only `index.cjs` entry | keep CommonJS | Prettier config loading still requires a stable CommonJS path in this repository |
| `apps/api` | NodeNext TypeScript app consumer | not a package-conversion target in this issue | app runtime strategy remains separate from package migration strategy |
| `apps/web` | bundler-managed app consumer | not a package-conversion target in this issue | can consume ESM packages without forcing repository-wide package conversion |
| `apps/mobile` | placeholder workspace | no action now | revisit when the workspace has real runtime code |

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

The shared config packages currently export raw `.ts`, `.json`, and `.cjs` files that are consumed directly by TypeScript, Jest, oxlint, and Prettier tooling entrypoints.

Those packages should not be converted package-by-package without a coordinated loader decision because their consumers are tools, not normal runtime imports. A repository-wide loader break in config packages would block routine lint, test, and typecheck flows.

The repository default is still ESM-first for tool configs. The current rule is:

- prefer `.ts`, `.mts`, `.mjs`, or other ESM-compatible config formats when the tool documents stable support
- keep a CommonJS config only when the exact current invocation path is still unverified or unstable under ESM
- document each remaining CommonJS file in the exception table above instead of treating config packages as blanket CommonJS-only areas

### API runtime compatibility

The API workspace uses the NodeNext TypeScript baseline with NestJS-oriented compiler settings. That is compatible with consuming explicit ESM packages through a stable export contract, but it does not by itself justify converting the API app runtime to pure ESM.

For this repository, package migration and app runtime migration remain separate decisions.

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
- verify and remove the remaining CommonJS Prettier exception chain when generator callers can consume an ESM config path
- audit API-side consumer compatibility before any package drops CommonJS support

## Review trigger

This strategy should be revisited whenever a new workspace package is proposed as an explicit ESM package, or when shared tooling changes reduce the repository's need for CommonJS compatibility.