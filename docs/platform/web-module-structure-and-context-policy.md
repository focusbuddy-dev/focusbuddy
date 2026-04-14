# Web Module Structure And Context Policy

This document captures the output of issue #173.

Its purpose is to define a reviewable implementation baseline for hand-written code in `apps/web`, with a focus on responsibility-oriented module structure, thin public entrypoints, test placement, type-safe environment access, MSW support boundaries, and code comments that preserve implementation intent.

## Scope

This document defines:

- how hand-written `apps/web` modules should be split into directories and files
- when `index.ts` or `index.tsx` should exist and how thin it should stay
- where tests should live by default and what still belongs under `apps/web/test`
- how file-level responsibility limits should be judged before a module becomes too mixed
- which import boundaries matter for Next.js server, browser, shared, and testing code
- how constants and environment variables should be separated
- how side effects, logging, and error handling should be placed
- what naming vocabulary exported code should use
- where MSW support code should live and how test-only values should stay out of production paths
- what comments exported hand-written code should carry so later edits can recover intent
- which rules should be enforced automatically instead of staying documentation-only
- the current known inconsistencies that should be used as review triggers

This document does not define a repository-wide rule for every workspace, a mandatory one-shot migration of all existing web files, or a new lint rule set for style-only enforcement.

## Decision summary

- hand-written `apps/web` code should prefer responsibility-oriented feature directories over flat multi-purpose files once a module has more than one meaningful concern
- one file should usually own one primary responsibility, with splitting triggered by mixed runtime boundaries, mixed change reasons, or mixed side-effect families rather than by file length alone
- a public module entrypoint should usually be `index.ts` or `index.tsx`, and it should stay thin
- tests for one module should default to source-adjacent placement so test coverage is visible where the implementation lives
- module-local integration tests may stay adjacent when they still verify one feature directory, while cross-feature or framework-entry integration tests belong under `apps/web/test/integration`
- `apps/web/test` should stay reserved for workspace-level setup, cross-module integration tests, and test utilities that are intentionally shared
- constants should live in `constants.ts` only when they are deterministic code values, while environment variables should be read and validated through dedicated env modules
- hand-written `apps/web` code should not read `process.env` directly outside those env modules
- environment access should be split into `public`, `server`, and `test` layers with caller restrictions that match the runtime boundary
- `apps/web` code should treat Next.js server and browser boundaries as first-class structure decisions rather than as accidental import details
- MSW support code should move out of `apps/web/test/msw` and into a named non-production source boundary so responsibility is explicit without pretending it is production code
- for this repository, prefer `apps/web/src/testing/msw` over bare `apps/web/src/msw` because the `testing` segment makes the non-production boundary harder to misuse
- test-only fixtures and MSW handlers must not be shared with production runtime paths just because the data shape happens to match
- exported hand-written code should carry short intent comments so the next editor can recover role and context without reading a long blame trail
- exported comment format should stay short and predictable so it can be reviewed and later enforced mechanically
- side effects should stay in explicit action, handler, hook, or adapter boundaries instead of being mixed into views or pure helpers
- logs should be emitted at operational boundaries, while user-facing error decisions should be made near the UI boundary from typed error information
- naming should use a small fixed vocabulary such as `is`, `has`, `build`, `create`, `resolve`, `fetch`, and `to` so export intent is visible from the symbol name alone
- the repository should prefer strict automation for these rules; if oxlint cannot express one of them directly, a repository-owned boundary check should be added
- comments may point to Issues or Discussions when the implementation would otherwise look arbitrary, but detailed product reasoning should stay outside the code repository unless it directly constrains shipped behavior

## Current inconsistency audit

Issue #173 starts from a real mismatch between desired structure and the current `apps/web` tree.

The current known inconsistencies are:

- `apps/web/src/components/web-baseline-page.tsx` is a single component file with multiple presentational responsibilities and no thin directory entrypoint
- `apps/web/src/lib/api/example-public-target-summary.ts` is used both as runtime preview data and as MSW response data, which mixes demo/runtime concerns with test fixture concerns
- `apps/web/test/public-summary-client.test.ts` and `apps/web/test/web-baseline-page.test.tsx` live away from the source modules they verify, so coverage is not obvious from the source tree
- `apps/web/jest.config.ts` only matches tests under `apps/web/test`, which means the configuration still blocks source-adjacent test placement
- `apps/web/test/msw/handlers.ts` and `apps/web/test/msw/server.ts` place MSW under the test tree even though MSW support is a responsibility boundary rather than a test-runner primitive
- `apps/web/src/lib/api/focusbuddy-client.ts` reads `process.env` directly instead of routing through a typed env module
- exported functions and constants across `apps/web/src` currently do not carry consistent role comments, which makes AI-authored or later-edited code harder to evaluate quickly

This audit is intentionally concrete so follow-up refactors can close specific mismatches instead of appealing to a vague style preference.

## Module structure rules

### Responsibility-first directory rule

When one hand-written module has more than one meaningful concern, prefer a directory with a thin public entrypoint.

Examples of meaningful concern splits include:

- public entrypoint versus internal implementation details
- React view composition versus derived display data
- runtime logic versus constants
- runtime logic versus test fixtures
- API surface versus internal mapping helpers

For example, a module like `web-baseline-page` should prefer a structure such as:

```text
web-baseline-page/
  index.tsx
  view.tsx
  sections.tsx
  constants.ts
  types.ts
  index.test.tsx
```

The exact file names may vary, but the split should follow responsibility, not arbitrary file-length targets.

### One file, one primary responsibility

The default expectation is one file, one primary responsibility.

This does not mean one file, one function.

It means a reader should be able to answer one clear question about the file:

What is the main job this file owns?

The file should usually be split when any of the following becomes true:

- exported members would naturally change for different reasons
- the file mixes server-only, browser-only, and test-only concerns
- the file mixes pure shaping logic with external side effects
- the file contains more than one independently nameable section such as `view`, `mapping`, `actions`, and `fixtures`
- a reviewer would need to scroll past unrelated sections to understand one change safely

The file does not need to be split merely because it has more than one helper.

Small file-local helpers may stay together when they all serve the same primary responsibility.

### Soft split signals

The repository should treat the following as soft review signals, not absolute limits:

- roughly 150 lines of hand-written logic in one file
- more than two exported runtime surfaces in one file
- both side-effecting logic and presentational markup in the same module
- both production data and test fixture data in the same module

When one of these appears, the reviewer should ask whether the file still has one primary responsibility.

### Thin entrypoint rule

`index.ts` and `index.tsx` are public entrypoints, not storage files.

They should usually do one or more of the following only:

- export the main implementation
- assemble a small dependency wiring layer
- expose the minimal public surface for the directory

They should usually not become the place where constants, fixtures, helper functions, and tests accumulate together.

### Do not split mechanically

Do not create a directory and five files for every tiny helper.

The split is justified when it makes one of the following easier:

- seeing the public surface quickly
- identifying where tests belong
- separating production logic from support code
- reviewing one concern without scanning unrelated implementation detail

If a file still has exactly one obvious responsibility, a single file remains acceptable.

### Barrel rule

This repository should keep barrels narrow.

Allowed barrel-like entrypoints are:

- feature or module `index.ts` or `index.tsx` files that expose one stable public surface
- package export boundaries that are already part of the workspace contract

Avoid broad convenience barrels such as `common/index.ts`, `constants/index.ts`, or multi-feature export hubs.

They make code navigation worse, hide real dependencies, and make boundary review harder.

## Import boundary rules

### Runtime classes

For `apps/web`, hand-written source should be reasoned about in four runtime classes:

- server entry code
- browser entry code
- shared pure code
- testing-only code

Every source file should fit one of these classes clearly enough that reviewers can tell what it may import.

### Server entry code

Server entry code includes areas such as:

- `src/app/**` server components without `'use client'`
- route handlers
- server helpers that read request data or server-only env

Server entry code may import:

- shared pure code
- server-only adapters and env modules
- browser components only through the framework-supported component boundary

Server entry code must not import:

- `src/testing/**`
- test fixtures
- browser-only runtime helpers that assume DOM globals

### Browser entry code

Browser entry code includes modules with `'use client'` and browser-only event or effect orchestration.

Browser entry code may import:

- shared pure code
- browser-safe adapters and hooks
- `public` env accessors only

Browser entry code must not import:

- server-only env modules
- request-only helpers such as code built on `next/headers` or `next/cookies`
- Node built-ins and server-only runtime adapters
- `src/testing/**`

### Shared pure code

Shared pure code should be safe to use from both server and browser callers.

Shared pure code must not import:

- `next/headers`, `next/cookies`, or other request-only APIs
- DOM globals or browser-only modules
- Node built-ins
- `src/testing/**`
- env modules other than a deliberately shared typed value module

If a helper needs any of those imports, it is not shared pure code and should move to a server, browser, or testing boundary.

### Testing-only code

Testing-only code lives under boundaries such as `src/testing/**` and `apps/web/test/**`.

Testing-only code may import production modules in order to verify them.

Production runtime code must not import testing-only code back.

### Preview data versus fixture data

Preview data used by shipped runtime paths is production-owned data even when it looks fake.

Fixture data used by tests or MSW is testing-owned data even when it looks realistic.

Do not merge them into one helper merely because they currently share the same shape.

## Test placement rules

### Source-adjacent tests are the default

Tests for one module should default to source-adjacent placement.

Examples:

- `index.test.ts`
- `index.test.tsx`
- `view.test.tsx`
- `client.test.ts`

The goal is that a reviewer can open one directory and immediately see whether the module has tests.

These source-adjacent tests should usually be unit or module-local behavior tests.

### Integration test placement

Use `*.integration.test.ts` or `*.integration.test.tsx` when a test verifies collaboration across more than one internal unit.

Placement depends on the collaboration boundary.

Keep the integration test adjacent when it still belongs to one feature directory, for example when one feature's public entrypoint coordinates several internal files.

Move the test under `apps/web/test/integration/**` when it crosses one of the following boundaries:

- more than one feature directory
- framework entrypoints such as route handlers, middleware, or app-router wiring
- shared setup or support utilities that are broader than one source module

This keeps adjacent tests focused and keeps `apps/web/test` reserved for broader seams.

### Test naming rule

Use the following naming by default:

- `*.test.ts` or `*.test.tsx` for unit and module-local behavior
- `*.integration.test.ts` or `*.integration.test.tsx` for broader collaboration tests
- `setup-tests.ts` only for runner setup files

Do not hide production fixtures under names such as `constants.ts` or `helpers.ts` when they are really test support.

### What still belongs under `apps/web/test`

Keep these under `apps/web/test`:

- Jest setup such as `setup-tests.ts`
- shared test utilities intentionally used across many modules
- cross-module integration tests whose subject is larger than one source directory
- framework-level tests whose natural home is not one source module

Create subdirectories such as `apps/web/test/integration` and `apps/web/test/utils` instead of letting the top-level `test` tree become flat and ambiguous.

### Required follow-up for configuration

Because `apps/web/jest.config.ts` currently matches only `test/**/*.test.ts?(x)`, source-adjacent tests are not fully enabled yet.

Any migration to source-adjacent tests should update Jest and related tooling in the same change or in a directly linked follow-up.

## Constants and environment rules

### `constants.ts` is for deterministic values

Use `constants.ts` for values that are stable code-level facts, such as:

- labels
- message templates
- fixed numeric thresholds
- route segment constants
- feature-local display defaults

Do not use `constants.ts` as a mixed dumping ground for env access, runtime feature detection, or test fixtures.

### Constant placement rule

Use feature-local `constants.ts` when the values are only relevant inside one feature directory.

If a deterministic constant is reused across multiple feature directories and is still web-local, place it under a concrete shared path such as:

- `src/common/constants/routing.ts`
- `src/common/constants/display.ts`
- `src/common/constants/<domain>.ts`

Do not create one giant shared constants file.

Split shared constants by topic so imports still reveal intent.

### Keep copy local unless reuse is real

Short copy that exists only to explain one component or route should usually stay local to that module.

Move strings into shared constants only when one of the following is true:

- the same wording is intentionally reused across multiple modules
- the value is part of a stable semantic contract such as route segments or status labels
- centralization clearly reduces drift more than it harms readability

### Fixture rule

Fixtures, sample payloads, and test defaults are not constants for this policy.

Place them under testing or preview-specific modules, not under `constants.ts`.

### Environment access must be typed and centralized

Environment variables should be read through dedicated env modules, for example:

- `env/public.ts`
- `env/server.ts`
- `env/shared.ts`

The exact file split may vary, but the contract should stay the same:

- read from `process.env` once per env module boundary
- validate and normalize there
- export typed values or typed getters from there
- do not read `process.env` directly from app code, components, route handlers, or shared runtime helpers

This keeps runtime configuration reviewable and prevents environment-specific fallback logic from spreading across feature code.

### Environment layer rule

The default env layers are:

- `src/env/public.ts` for values safe to expose to browser code
- `src/env/server.ts` for server-only values
- `src/env/test.ts` for test-only overrides or helpers

Caller restrictions should be strict:

- browser code may import only `public` env access
- server code may import `public` and `server` env access
- test files and setup code may import `test` env helpers
- production code must not import `test` env helpers

If one env value is needed in more than one layer, expose it intentionally from the correct module instead of letting callers reach into another runtime layer.

## MSW structure and boundary rules

### Preferred location

MSW support code should prefer a source boundary such as:

```text
apps/web/src/testing/msw/
  handlers/
  factories/
  browser.ts
  server.ts
```

This is preferred over `apps/web/test/msw` because MSW is more than a test-file artifact, and it is preferred over bare `apps/web/src/msw` because the `testing` segment makes the non-production boundary explicit.

### Production-boundary rule

Production runtime code must not import from `src/testing/*`.

That includes code under areas such as:

- `src/app`
- `src/components`
- production runtime helpers under `src/lib`

If a real page needs preview data for a baseline or empty-state experience, that data should come from a production-owned demo or preview module, not from MSW factories or test fixtures.

### Fixture separation rule

If test fixtures and runtime preview data look similar, keep them in different modules unless they truly represent the same product-owned contract.

The current `example-public-target-summary` usage should be treated as a boundary smell because one helper is serving two reasons at once:

- previewing a baseline page at runtime
- shaping mock responses for tests

Those should be split so test-only values can be removed, changed, or hardened without silently changing shipped runtime behavior.

## Export comment rules

### Default rule

Every hand-written exported function, component, class, constant object, or exported module surface should have a short leading comment that explains its role.

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
 * Role: Resolves the browser-safe API base URL for web client calls.
 * Boundary: Public env only. Must not read server-only env values.
 * Ref: #173
 */
export function getPublicApiBaseUrl() {}
```

Use `Ref:` only when the decision would otherwise look arbitrary.

Do not add empty fields just to satisfy the template.

### Minimum comment content

For most exports, one short block comment is enough.

Examples of useful fields are:

- role
- boundary
- why this exists
- what it intentionally does not own
- optional reference to an Issue or Discussion when the implementation would otherwise look arbitrary

Example:

```ts
/**
 * Role: Builds the web-local public target summary preview used by the baseline page.
 * Boundary: Runtime preview data only. Do not reuse from test-only MSW fixtures.
 * Ref: #173
 */
export function buildPreviewPublicTargetSummary() {}
```

### Acceptable exceptions

The following do not need repetitive per-export comments when a file-level comment already explains the role clearly:

- tightly related exported types in one small types file
- pure re-export barrels
- generated code
- framework-mandated exports such as `metadata`, `config`, or route methods when one file-level comment already explains the boundary

### External references

When context lives outside the repository, prefer short references instead of copying long background into comments.

Good comment behavior is:

- keep the code comment short and implementation-adjacent
- link to the exact Issue, PR, or Discussion when history matters
- avoid duplicating private strategy notes or broad product exploration into source comments

This keeps comments durable while still giving later maintainers a path back to the original decision.

## Side-effect placement rules

### Core split

For `apps/web`, prefer this mental model:

- views render data
- actions and handlers trigger side effects
- adapters touch external systems
- pure helpers shape values

### Views

Views include presentational components and pure rendering helpers.

Views should not own:

- network calls
- router navigation
- logger emission
- direct header or cookie access
- storage access
- time-based orchestration or subscriptions

Views may accept callbacks, data, and already-prepared state.

### Actions, handlers, and hooks

Place browser-side side effects in explicit boundaries such as:

- event handlers
- custom hooks
- controller-like action helpers

These boundaries may own things like:

- `router.push`
- mutation submission
- logger emission
- storage writes
- subscription setup and cleanup

`useEffect` is not banned, but it should be used for real lifecycle synchronization, not to hide pure derivation or general business logic.

### Adapters

Adapters own external boundary details.

Examples include:

- API clients
- request readers
- cookie or header readers
- browser storage wrappers
- logging runtime adapters

Adapters should return typed values and keep boundary-specific details out of views.

## Logging and error handling rules

### Logging rule of thumb

Log at the boundary where the system crosses an operational seam or makes a recovery decision.

Typical logging boundaries include:

- route handlers
- middleware
- server actions
- API adapters when a remote call fails
- browser-side action handlers when a user-visible recovery path is chosen

Do not log the same failure repeatedly at every stack layer.

If a lower layer already emitted the authoritative operational log, upper layers should usually add user-facing handling without duplicating the same log.

### Error conversion rule

Do not swallow errors silently.

An error may be caught only when the code does one of the following:

- converts it to a typed result or shared error shape
- adds boundary context and rethrows
- chooses a user-facing fallback that is explicitly allowed by the web error policy

### User-facing versus operator-facing handling

Use the shared public error vocabulary and the web error policy to decide what the user sees.

Keep operator-facing detail in logs and structured context, not in user-facing copy.

In practice:

- user-facing code decides redirect, inline feedback, retry, not-found, or route-fatal behavior
- operational logging keeps request IDs, boundary context, and sanitized technical detail
- recovery decisions should reference `docs/platform/web-error-handling-policy.md`
- logging placement should stay consistent with `docs/platform/logging-and-audit-boundaries.md`

## Naming rules

Use names that expose intent, not just implementation shape.

Recommended prefixes and verbs:

- `is`, `has`, `can`, `should` for boolean-returning checks
- `build` for pure assembly of a new value from known inputs
- `create` for factories or dependency wiring that may hold state or runtime configuration
- `resolve` for interpreting inputs or context into one decision
- `get` for simple synchronous retrieval without remote I/O
- `read` for boundary reads from request, storage, or another scoped source
- `fetch` for network or remote I/O
- `load` for orchestration that may combine multiple reads or fetches for one caller need
- `to` for pure transformation into another representation
- `parse` for validation and normalization of external input
- `format` for display or log string rendering
- `assert` for invariant checks that throw on failure

Avoid vague names such as `handleData`, `processThing`, or `utils` when a narrower verb would tell the reviewer more.

## Enforcement and automation rules

### Enforcement stance

These rules should not stay documentation-only.

The repository should prefer strict automation and fail fast when a new change crosses a boundary incorrectly.

### First enforcement targets

The highest-value checks to automate are:

- ban direct `process.env` access outside `src/env/**`
- ban production imports from `src/testing/**`
- ban browser entry code from importing server-only env or request-only helpers
- enforce test naming for `*.test.*` and `*.integration.test.*`
- ban broad convenience barrels outside allowed `index.ts` and `index.tsx` boundaries

### Tooling split

Use oxlint where the rule can be expressed directly.

Use repository-owned boundary scripts or AST checks where oxlint cannot yet express the rule precisely enough.

Important examples that may require repository-owned checks are:

- exported role comments on hand-written runtime surfaces
- path-based runtime boundary rules inside one workspace
- narrow barrel restrictions based on file name and directory role

## Review checklist

Use the following checklist when reviewing new or changed `apps/web` code:

- does the module expose a thin public entrypoint when the feature has multiple responsibilities
- does each file still have one primary responsibility
- are tests visible from the source directory for module-local behavior
- are broader integration tests placed under `apps/web/test/integration` instead of being mixed into unit-test locations
- do imports respect server, browser, shared, and testing runtime boundaries
- are constants separated from env access and fixtures
- are shared constants topic-based instead of being dumped into one global file
- is `process.env` accessed only through typed env modules
- do callers only import the env layer allowed for their runtime
- is MSW support kept behind a clearly non-production source boundary
- are test fixtures separated from production runtime preview data
- are side effects kept out of pure views and pure helpers
- does the code log at the right operational boundary without duplicating the same failure everywhere
- does each exported hand-written surface explain its role with a short comment or a clear file-level comment
- do export names communicate intent through a stable verb vocabulary
- if the implementation depends on historical context, is there a durable issue or discussion reference instead of a long in-code narrative

## Review triggers

This document should be revisited when one of the following becomes true:

- `apps/web` gains a verified lint or boundary-enforcement path that can prevent production imports from `src/testing/*`
- source-adjacent tests are enabled and the repository wants to narrow what still belongs in `apps/web/test`
- another workspace wants the same rules and it becomes worth extracting a repository-wide policy instead of a web-first one
- the export comment rule proves too noisy and needs a narrower definition for low-risk export categories

Until then, the practical rule is simple: split by responsibility, keep entrypoints thin, make tests visible near the code they verify, centralize env access, keep MSW and fixtures behind explicit non-production boundaries, and leave short intent comments on exported hand-written code.