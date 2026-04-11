# Import Path And Function Style Policy

This document captures the output of issue #96 and the follow-up enforcement review from issue #152.

Its purpose is to define the current repository policy for app-local import paths and preferred function declaration style without forcing premature style churn before build and runtime wiring is fully settled.

## Scope

This document defines:

- the current default for app-local imports inside `apps/*`
- the current default for function declaration style in hand-written code
- where the policy differs between workspace boundaries and intra-workspace code
- the current decision on whether these preferences should gain lint enforcement
- when a future alias rollout or stricter enforcement may be reconsidered

This document does not define a repository-wide alias migration, a broad style-only refactor, or new lint enforcement for stylistic preferences.

## Decision summary

- workspace-to-workspace imports must continue using package names and exported subpaths, not relative filesystem paths into other workspaces
- app-local imports inside a workspace should currently stay relative by default
- repository-wide app-local path alias standardization is deferred until build-time resolution, runtime execution, Jest resolution, local developer commands, and CI enforcement are aligned clearly enough to avoid toolchain drift
- if app-local aliases are revisited later, that decision should be made app-by-app instead of as an immediate repository-wide rule
- short same-folder and nearby relative imports remain allowed and are still the default even if a future app later adopts an alias for deeper paths
- hand-written exported code should stay function-declaration-first by default, including React components, route handlers, controllers, mappers, and shared utility functions
- arrow functions remain appropriate for file-local callbacks, event handlers, hook callbacks, promise chains, and other closure-oriented local logic
- the repository should not run a style-only migration or add lint enforcement for these preferences unless the practical maintenance value becomes clearer than the churn cost

## Import path policy

### Cross-workspace imports

The repository already has a strong boundary rule for cross-workspace imports:

- apps consume shared packages through package names and exported subpaths
- apps do not import other apps directly
- packages do not import apps directly
- no workspace may reach into another workspace through relative filesystem imports

That rule remains the primary import-path policy because it protects actual architectural boundaries.

### Intra-workspace imports

Inside a single app or package, relative imports remain the current repository default.

This is the current choice because:

- the shared TypeScript baselines do not currently define repository-owned `baseUrl` or `paths` mappings
- `apps/web` uses bundler-oriented module resolution and could adopt an app-local alias sooner than other workspaces, but that would still be a workspace-specific decision rather than a repository-wide standard
- `apps/api` uses NodeNext module resolution, so alias adoption there must be evaluated together with runtime execution, emitted output expectations, Jest behavior, and local command wiring
- the repository still treats build wiring and runtime wiring as more important than style-level source path shortening

For now, the practical import rule is:

- use relative imports for hand-written code within the same workspace
- prefer the shortest relative path that stays clear and stable
- keep package-boundary imports on package names and exported subpaths only

If an app later adopts an alias such as `@/`, that rollout should:

1. stay limited to the app that can verify its full toolchain contract
2. leave short same-folder relative imports available where they remain clearer than an alias hop
3. ship with explicit updates for compile-time, test-time, runtime, local-dev, and CI resolution paths
4. avoid forcing unrelated packages or other apps into the same style decision prematurely

Packages should not introduce private source aliases as a default style. Published entrypoints and exported subpaths are the package contract that matters more than source-level path shortening.

Current verified app-level exception:

- `apps/web` may use `@/` for imports rooted at `apps/web/src/*` when crossing app-local directory boundaries
- `apps/web` should still keep same-folder and nearby relative imports where they remain shorter and clearer, such as CSS modules or tightly local helpers
- this is a web-local allowance, not a repository-wide default for all workspaces

Current verified app-level contract:

- `apps/api` may use `#api/*` for app-local imports rooted at `apps/api`
- the current API toolchain now verifies one repository-owned contract across TypeScript compile-time resolution, source startup, emitted runtime execution from `dist`, Jest resolution, and Prisma command execution
- `#api/*` is the only supported app-local alias family for the API workspace today
- `@/`, `~/`, and bare `src/*` remain unsupported in `apps/api`
- same-folder and nearby relative imports remain allowed when they are shorter and clearer than `#api/*`

The current API-side module resolution contract is documented in `docs/platform/api-module-resolution-contract.md`.

## Function declaration style policy

The current repository default for hand-written code is function-declaration-first.

This applies to:

- exported React components
- Next.js route handlers and other framework entry functions
- NestJS bootstrap and application-facing exported functions
- shared mappers, helpers, and utility functions
- logger, contract, or adapter factory functions that are part of the hand-written code surface

This is the current choice because:

- the existing hand-written codebase already leans heavily toward named function declarations
- keeping that default avoids broad churn with little architectural benefit
- boundary clarity, runtime safety, and toolchain consistency are higher-value concerns than forcing one expression style everywhere
- named functions stay easy to identify in stack traces, exports, and file scanning without adding a new repository-wide stylistic split

Arrow functions remain the normal choice for local behavior that is naturally expression-oriented, including:

- event handlers
- hook callbacks such as `useEffect` and transitions
- inline mapping and filtering callbacks
- closure-based helper functions that do not need to be part of the file's main exported surface
- adapter method slots or object-literal callback implementations that are naturally value-shaped

This policy does not require converting existing arrow functions back to declarations when the local expression form is already the better fit. The rule is a default, not a style-purity exercise.

## Enforcement stance

Issue #152 revisited this policy after the repository had stable app-level import contracts for the current workspaces.

That review keeps the repository on a documentation-first stance for import-path and function-style preferences.

The repository should not add a new lint rule at repository or workspace scope just to force app-local aliases or to require one function declaration shape for all exported code.

No immediate source migration is required by this policy.

Current enforcement should stay focused on:

- workspace boundary protection
- exported subpath discipline
- runtime-safety and null-handling rules
- generated-versus-hand-written code boundaries

The post-review reasons are:

- the workspace-boundary rules already enforce the import mistakes that create architectural risk
- `apps/web` and `apps/api` now have verified app-local alias contracts, but both still intentionally allow short same-folder and nearby relative imports where those remain clearer than an alias hop
- a lint rule strict enough to force alias usage would either ban intentionally allowed local relative imports or require exception-heavy configuration that adds maintenance cost without protecting a stronger repository invariant
- exported hand-written code already leans strongly toward named function declarations, so a new function-style rule would mostly restate an existing convention while creating noisy edge cases for expression-shaped code
- no recurring bug class or review churn has shown that documentation-only guidance is failing badly enough to justify new style enforcement

If future implementation work proves that one workspace has a concrete maintenance problem that linting can solve with narrow and low-exception rules, that linting should be introduced as a targeted follow-up for that workspace only.

## Follow-up issue split

The policy decision in this document intentionally separates future implementation work into focused follow-up issues instead of one repository-wide cleanup:

- #153 verifies whether `apps/web` should adopt an app-local alias without changing repository-wide defaults
- #154 verifies whether `apps/api` should keep relative imports or can safely support an alias under the NodeNext runtime contract
- #152 reviews the now-stable app-level contracts and keeps import-path and function-style preferences documentation-first rather than adding new lint enforcement

This means issue #96 is the decision point, not the implementation vehicle for any broad migration.

## Current observations behind this policy

- current app and package code still uses relative imports in many hand-written files
- the web workspace now has a verified `@/` allowance for deeper app-local imports while still allowing shorter nearby relative imports
- current hand-written exported code is mostly written with function declarations rather than arrow functions
- the API workspace now has a verified `#api/*` contract across compile, source startup, `dist` runtime, Jest, and Prisma command paths
- import-style enforcement would be weaker than the repository's existing boundary-oriented rules unless a later issue identifies a concrete maintenance benefit that documentation cannot handle
- function-style enforcement would still be weaker than the repository's existing boundary-oriented rules unless a later issue identifies a concrete maintenance benefit

## Review triggers

This document should be revisited when one of the following becomes true:

- a specific workspace starts seeing repeated review churn or source drift that a narrow import-style lint rule can prevent without banning intentionally allowed nearby relative imports
- a future lint rule can express the function-declaration preference without forcing local callback-shaped code into suppressions or awkward rewrites
- a future lint proposal can show concrete maintenance value beyond style preference alone

Until then, the repository should keep the current low-churn rule: package-name imports across workspace boundaries, workspace-local import choices documented per app contract, and function declarations as the default shape for hand-written exported code without new style-only lint enforcement.
