# Package ESM Migration Strategy

This document captures the output of issue #120.

Its purpose is to define a repository-wide strategy for converting workspace packages to explicit ESM packages after the focused logger-package change from issue #23.

## Scope

This document defines:

- which workspace packages are candidates for explicit ESM conversion
- the package contract required before a package can declare `type: module`
- where current tooling still assumes CommonJS-oriented behavior
- when CommonJS compatibility must remain in place
- an ordered follow-up plan for package-by-package migration work

This document does not define a repository-wide app runtime conversion to pure ESM.

## Decision rules

- explicit ESM is opt-in per package; one package changing module mode does not authorize ad hoc conversion of unrelated packages
- runtime packages that other workspaces import at runtime should prefer built artifact exports over raw source file exports before they become explicit ESM packages
- config packages consumed directly by tools should not become explicit ESM packages until the consuming toolchain contract is documented and verified
- a package must keep CommonJS compatibility whenever any current consumer or tool still relies on `require()` or a CommonJS-only loader path
- no package may switch to explicit ESM without a documented export surface, build output contract, and verification plan

## Package inventory and migration stance

| Workspace | Current state | Migration stance | Notes |
| --- | --- | --- | --- |
| `packages/logger` | already explicit ESM with dual-publish exports | keep as the reference implementation | uses `type: module`, explicit `import` and `require` conditions, TypeScript-emitted ESM artifacts, and esbuild-generated CJS artifacts |
| `packages/api-contract` | source-export package with generated `.ts` outputs and a CommonJS helper entry | next runtime package candidate after a build contract is defined | should not expose generated source files as the long-term runtime contract once it becomes explicit ESM |
| `packages/config-typescript` | exports shared JSON config files | keep current mode for now | TypeScript config consumers do not benefit from package-level ESM and still depend on current tool loading behavior |
| `packages/config-jest` | exports raw `.ts` config modules | coordinated migration only | current consumers rely on TypeScript config loading and Jest-specific loader behavior |
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
5. provide a `require` condition whenever any current consumer still needs CommonJS compatibility
6. use NodeNext-compatible relative import specifiers in source where emitted JavaScript requires them
7. include verification that both the ESM import path and any required CommonJS path still resolve correctly

The logger package is the current repository reference for this contract. Future package migrations should copy the contract shape, not improvise a new one for each workspace.

For logger specifically, the CommonJS compatibility path should stay on a dedicated non-TypeScript transpile step. Declarations remain sourced from the ESM build output, `dist/cjs/package.json` keeps the CJS folder explicit, and the retired `tsconfig.cjs.json` plus `ignoreDeprecations` workaround should not be reintroduced.

## Tooling constraints and current breakpoints

### Jest and TypeScript test loading

The API workspace currently uses `ts-jest` with the local TypeScript config and does not enable Jest's ESM mode. That means a workspace package can expose explicit ESM only if test consumers continue to resolve through a compatible path.

Before more runtime packages become explicit ESM packages, the shared Jest baseline should be updated so the repository has one documented answer for:

- when `ts-jest` should run with `useESM: true`
- when `.ts` should be treated as ESM in test resolution
- how package tests verify both `import` and `require` conditions where dual publish remains necessary

### Tool-owned config packages

The shared config packages currently export raw `.ts`, `.json`, and `.cjs` files that are consumed directly by TypeScript, Jest, oxlint, and Prettier tooling entrypoints.

Those packages should not be converted package-by-package without a coordinated loader decision because their consumers are tools, not normal runtime imports. A repository-wide loader break in config packages would block routine lint, test, and typecheck flows.

### API runtime compatibility

The API workspace uses the NodeNext TypeScript baseline with NestJS-oriented compiler settings. That is compatible with consuming explicit ESM packages through a stable export contract, but it does not by itself justify converting the API app runtime to pure ESM.

For this repository, package migration and app runtime migration remain separate decisions.

### Build orchestration

The repository build and test tasks rely on upstream workspace builds through Turborepo. Any package that moves to explicit ESM must define a stable output layout so downstream tasks do not depend on raw source layout assumptions.

## What can move package-by-package

- runtime libraries with a narrow public API and an explicit build output can migrate individually once they adopt the full package contract
- packages that can follow the logger dual-publish pattern without changing shared tooling may proceed in separate implementation issues

## What must be coordinated across the repository

- any change to `packages/config-jest`, `packages/config-oxlint`, `packages/config-typescript`, or `packages/config-prettier`
- any change that requires the shared Jest baseline to adopt repository-wide ESM handling rules
- any change that removes CommonJS compatibility from a package still consumed by existing Node or tool entrypoints
- any change that couples package migration with an application runtime module-strategy change

## Ordered follow-up plan

1. keep `packages/logger` as the reference implementation and use it as the contract template for future runtime packages
2. define the shared Jest and test-runner rules required to consume explicit ESM workspace packages safely
3. define the build output and export contract for `packages/api-contract` so generated source stops being the primary runtime surface
4. migrate `packages/api-contract` only after its build and consumer contract are documented
5. decide whether config packages should remain direct source-export tool packages or move to a separate built-distribution model before attempting any config-package ESM change
6. revisit application runtime module strategy only after package-level migration rules are stable and proven in at least one additional package

## Follow-up issue split

The next implementation work should be split into discrete repository tasks:

- add a shared Jest baseline for consuming explicit ESM workspace packages
- define the build artifact and export contract for `packages/api-contract`
- migrate `packages/api-contract` with dual-publish support if any consumer still requires CommonJS
- decide the long-term contract for config packages: direct source exports versus built distribution packages
- audit API-side consumer compatibility before any package drops CommonJS support

## Review trigger

This strategy should be revisited whenever a new workspace package is proposed as an explicit ESM package, or when shared tooling changes reduce the repository's need for CommonJS compatibility.