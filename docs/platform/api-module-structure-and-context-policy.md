# API Module Structure And Context Policy

This document captures the output of issue #174.

Its purpose is to define a reviewable implementation baseline for hand-written code in `apps/api`, with a focus on responsibility-oriented module structure, explicit Nest and Prisma boundaries, type-safe environment access, disciplined side-effect placement, and exported comments that preserve implementation intent.

## Scope

This document defines:

- how hand-written `apps/api` modules should be split into directories and files
- how exported API code should document role and boundary intent
- how Nest bootstrap, modules, controllers, services, mappers, logging, and Prisma responsibilities should be separated
- how env access should be centralized instead of spread across runtime code
- where side effects belong and which code should remain pure or near-pure
- how logging and error handling should be implemented at API boundaries
- what naming vocabulary exported code should use
- which rules should be enforced automatically instead of staying review-only guidance
- the current known inconsistencies that should be used as review triggers

This document does not define a full repository-wide policy for every workspace, a forced immediate rewrite of all existing API files, or a product-level schema redesign.

## Decision summary

- hand-written `apps/api` code should default to one primary responsibility per file, with splitting triggered by mixed boundary roles rather than by file length alone
- exported API runtime surfaces should carry short role comments using a fixed format when boundary intent is not already obvious
- Nest bootstrap, controllers, services, Prisma access, mappers, and logging should stay in distinct layers instead of collapsing into broad service files
- Prisma client creation and env loading should stay behind explicit configuration boundaries, not scattered through arbitrary runtime modules
- application code should not read `process.env` directly outside designated env modules
- controllers should remain thin translation boundaries from transport input to application behavior and output shape
- mappers should stay pure and should not acquire transport, persistence bootstrap, or request-context side effects
- logging should happen at operational boundaries, and the same failure should not be logged redundantly at every layer
- strict automation should enforce the highest-risk boundary rules where the tooling allows it

## Current inconsistency audit

Issue #174 starts from a real mismatch between desired structure and the current `apps/api` tree.

The current known inconsistencies are:

- `apps/api/src/main.ts` reads `process.env.PORT` directly instead of going through an env boundary
- `apps/api/src/logging/api-runtime-logger.ts` reads `process.env.LOG_LEVEL` directly instead of going through an env boundary
- `apps/api/src/config/local-runtime-env.ts` correctly centralizes env access for database setup, but the pattern is not yet the API-wide default
- exported runtime surfaces across `apps/api/src` do not yet carry consistent role comments, which makes AI-authored and later-edited code harder to evaluate quickly
- `apps/api/src/health/health.controller.ts` currently reaches directly into Prisma for a raw health query, which is acceptable for a small baseline but should be treated as a narrow exception rather than the target layering style for feature code
- `apps/api/src/prisma/prisma.service.ts` currently combines Prisma client option creation, env loading, and lifecycle wiring in one file; this is acceptable for a minimal bootstrap seam but should remain a deliberately small infrastructure boundary

This audit is intentionally concrete so follow-up refactors can close specific mismatches instead of appealing to general style preference.

## Module structure rules

### One file, one primary responsibility

The default expectation is one file, one primary responsibility.

This does not mean one file, one function.

It means a reviewer should be able to answer one clear question about the file:

What is the main job this file owns?

The file should usually be split when any of the following becomes true:

- exported members would naturally change for different reasons
- transport, application, persistence, and mapping logic are mixed together
- pure shaping logic and external side effects live in the same module
- the file contains more than one independently nameable section such as `controller`, `service`, `mapper`, and `env`
- a reviewer would need to scroll past unrelated sections to understand one change safely

Small file-local helpers may stay together when they all serve the same primary responsibility.

### Soft split signals

The repository should treat the following as soft review signals, not absolute limits:

- roughly 150 lines of hand-written logic in one file
- more than two exported runtime surfaces in one file
- both persistence access and output mapping in the same file
- both env loading and unrelated runtime behavior in the same file

When one of these appears, the reviewer should ask whether the file still has one primary responsibility.

### Thin entrypoint rule

`index.ts` files are allowed when they expose one stable public module surface.

They should stay thin and should not become storage files for helpers, constants, fixtures, and real implementation all at once.

### Barrel rule

Keep barrels narrow.

Allowed barrel-like entrypoints are:

- feature or module `index.ts` files that expose one stable public surface
- package export boundaries that are already part of the workspace contract

Avoid broad convenience barrels such as `services/index.ts`, `mappers/index.ts`, or multi-feature export hubs.

They make dependency review harder and hide real layering decisions.

## API boundary rules

### Layer vocabulary

For `apps/api`, hand-written source should be reasoned about in these roles:

- bootstrap
- module wiring
- controller
- application service
- mapper
- persistence adapter
- infrastructure adapter
- config and env

Each file should fit one of these roles clearly enough that a reviewer can tell what it may import and what it should not own.

### Bootstrap

Bootstrap code is responsible for starting the Nest application and wiring top-level runtime concerns.

Bootstrap may own:

- Nest application creation
- top-level logger wiring
- global interceptor or pipe registration
- reading already-validated runtime configuration

Bootstrap must not own:

- feature business rules
- Prisma queries unrelated to startup readiness
- contract mapping
- feature-specific validation logic

### Controllers

Controllers are transport boundaries.

Controllers may own:

- HTTP route decoration
- transport-level input extraction
- delegation to application services
- transport response shaping when the response contract is trivial

Controllers should stay thin.

Controllers must not become the place where complex query composition, persistence orchestration, or reusable mapping logic accumulates.

### Application services

Application services coordinate one use case or a small set of tightly related use cases.

Application services may own:

- orchestration across domain logic, mappers, and persistence adapters
- transaction-aware sequencing
- typed error conversion at the use-case boundary
- operational logging when a real recovery or failure boundary is crossed

Application services should not become generic utility bags for unrelated endpoints.

### Mappers

Mappers convert one representation into another.

Mappers should stay pure.

Mappers must not own:

- database access
- env access
- logging side effects
- request-context reads
- transaction control

The current `contract-mappers.ts` file is a legitimate shape for this layer, but future growth should still respect one primary responsibility per file or directory.

### Persistence and infrastructure adapters

Persistence adapters own database client interaction.

Infrastructure adapters own concrete external systems such as logging sinks, env readers, or queue clients.

These adapters should return typed values and keep boundary-specific details out of controllers and mappers.

## Prisma responsibility rules

### Prisma boundary split

Prisma-related concerns should be split into distinct responsibilities:

- Prisma client bootstrap and lifecycle
- query execution or persistence access
- mapping from Prisma records to contract or domain shapes
- application-level orchestration around those operations

Do not collapse all four into one broad service file.

### Current baseline exception

The current `PrismaService` shape is acceptable as a small bootstrap-oriented infrastructure seam.

As feature work grows, query execution and higher-level orchestration should move out of that bootstrap seam instead of expanding it into a general-purpose application layer.

### Mapper separation rule

Do not place Prisma-to-contract mapping into controllers or bootstrap files.

Keep that logic in mapper modules so response-shape churn and persistence churn can be reviewed separately.

## Export comment rules

### Default rule

Every hand-written exported runtime surface should have a short leading comment that explains its role.

The comment should answer the question:

Why does this export exist in the module boundary, and what responsibility does it own?

### Fixed comment format

Use one short block comment format for hand-written exported runtime surfaces.

The preferred order is:

- `Role:` what this export owns
- `Boundary:` where it may be used or what it must not depend on
- `Ref:` optional Issue, PR, or Discussion reference when history matters

Example:

```ts
/**
 * Role: Creates the API runtime logger used by Nest bootstrap and request boundaries.
 * Boundary: Infrastructure adapter only. Must not own request-specific business logic.
 * Ref: #174
 */
export function createApiRuntimeLogger() {}
```

Use `Ref:` only when the decision would otherwise look arbitrary.

Do not add empty fields just to satisfy the template.

### Acceptable exceptions

The following do not need repetitive per-export comments when a file-level comment already explains the role clearly:

- tightly related exported types in one small types file
- pure re-export barrels
- generated code
- framework-mandated exports when one file-level comment already explains the boundary

## Constants and env rules

### Constant placement rule

Use feature-local `constants.ts` when the values are only relevant inside one feature or infrastructure directory.

If a deterministic constant is reused across multiple API feature directories and is still API-local, place it under a concrete shared path such as:

- `src/common/constants/logging.ts`
- `src/common/constants/http.ts`
- `src/common/constants/<domain>.ts`

Do not create one giant shared constants file.

### Env boundary rule

Environment variables should be read through dedicated env modules under `src/config` or `src/env`.

The contract should stay the same:

- read from `process.env` only inside designated env modules
- validate and normalize there
- export typed values or typed getters from there
- do not read `process.env` directly from bootstrap, controllers, services, mappers, or logging adapters

Suggested layer split:

- runtime env for deployed or host startup behavior
- local-dev env helpers for compose or host-side development glue
- test env helpers for test-only overrides

Production runtime code must not import test-only env helpers.

## Side-effect placement rules

### Core split

For `apps/api`, prefer this mental model:

- controllers translate transport boundaries
- application services coordinate use cases and side effects
- mappers stay pure
- adapters touch external systems

### Allowed side-effect boundaries

The following boundaries may own side effects:

- bootstrap
- controllers when transport interaction is unavoidable and thin
- application services
- persistence adapters
- infrastructure adapters

### Pure-boundary rule

Mappers, formatters, and pure value helpers should not own:

- database access
- env access
- logger emission
- filesystem access
- time-based orchestration unless time is injected as data

## Logging and error handling rules

### Logging rule of thumb

Log at the boundary where the system crosses an operational seam or makes a recovery decision.

Typical logging boundaries include:

- bootstrap
- request interceptors and middleware-like boundaries
- application services when a use-case failure or degraded fallback is chosen
- infrastructure adapters when an external dependency fails in a way the caller must understand

Do not log the same failure redundantly at every layer.

### Error conversion rule

Do not swallow errors silently.

An error may be caught only when the code does one of the following:

- converts it to a typed application or transport error
- adds boundary context and rethrows
- chooses an explicitly allowed fallback or degraded path

### User-facing versus operator-facing split

Controllers and transport layers decide HTTP-facing behavior.

Operational logging should keep request IDs, boundary context, and sanitized technical detail for operators.

Do not leak operator-facing technical detail into API response copy or schema fields that are meant for client consumption.

## Naming rules

Use names that expose intent, not just implementation shape.

Recommended prefixes and verbs:

- `is`, `has`, `can`, `should` for boolean-returning checks
- `build` for pure assembly of a new value from known inputs
- `create` for factories or dependency wiring that may hold state or runtime configuration
- `resolve` for interpreting inputs or context into one decision
- `get` for simple synchronous retrieval without remote I/O
- `read` for boundary reads from request, env, storage, or another scoped source
- `fetch` for remote I/O
- `load` for orchestration that may combine multiple reads for one caller need
- `to` for pure transformation into another representation
- `parse` for validation and normalization of external input
- `format` for display or log string rendering
- `assert` for invariant checks that throw on failure
- `map` for explicit representation conversion where the source and target types matter

Avoid vague names such as `handleData`, `processThing`, or `utils` when a narrower verb would tell the reviewer more.

## Enforcement and automation rules

### Enforcement stance

These rules should not stay documentation-only.

The repository should prefer strict automation and fail fast when a new change crosses a boundary incorrectly.

### First enforcement targets

The highest-value checks to automate are:

- ban direct `process.env` access outside designated env modules
- ban controllers from importing test-only helpers
- ban mappers from importing Prisma bootstrap or runtime env modules
- ban broad convenience barrels outside allowed `index.ts` boundaries
- require stable test naming for API test files

### Tooling split

Use oxlint where the rule can be expressed directly.

Use repository-owned boundary scripts or AST checks where oxlint cannot yet express the rule precisely enough.

Important examples that may require repository-owned checks are:

- exported role comments on hand-written runtime surfaces
- path-based layer restrictions inside `apps/api`
- narrow barrel restrictions based on file name and directory role

## Review checklist

Use the following checklist when reviewing new or changed `apps/api` code:

- does each file still have one primary responsibility
- are bootstrap, controller, service, mapper, Prisma, and infrastructure responsibilities clearly separated
- are controllers thin transport boundaries instead of logic-heavy orchestration layers
- are Prisma bootstrap, query execution, and mapping kept distinct enough to review safely
- is `process.env` accessed only through designated env modules
- are mappers pure and free of side effects
- does the code log at the right operational boundary without duplicating the same failure everywhere
- does each exported hand-written surface explain its role with a short comment or a clear file-level comment
- do export names communicate intent through a stable verb vocabulary

## Review triggers

This document should be revisited when one of the following becomes true:

- `apps/api` gains stricter boundary automation for path-based layer rules
- the Prisma surface grows enough that a more explicit persistence-access pattern becomes necessary
- another workspace wants the same shared app-level base policy and it becomes worth extracting one common layer above the API- and web-specific documents
- the export comment rule proves too noisy and needs narrower exemptions

Until then, the practical rule is simple: keep API files single-purpose, keep Nest and Prisma boundaries explicit, centralize env access, keep mappers pure, place side effects only at real runtime boundaries, log once at the right seam, and leave short role comments on exported hand-written code.