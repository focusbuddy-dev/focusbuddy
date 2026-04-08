# Web Safety Control Responsibilities

This document captures the output of issue #77.

Its purpose is to define the first layer-by-layer responsibility model for preventing, detecting, and recovering from the web safety concerns identified in the web accident inventory from issue #76 before feature implementation expands on top of issue #22.

It builds on [docs/platform/web-accident-pattern-inventory.md](web-accident-pattern-inventory.md), which defines the accident classes, control posture, and follow-up issue seeds that this responsibility model allocates across layers.

## Scope

This document defines:

- the control layers used for web safety in FocusBuddy
- which layers own prevention, detection, and recovery for the primary accident classes
- which controls should become mandatory entry points instead of team convention only
- how route or navigation safety, mutation safety, and background-fetch safety should be separated
- where current oxlint TypeScript promise-handling rules fit in the larger safety stack
- how a later type-aware lint stage should support those helper boundaries if the repo adopts one
- which follow-up implementation tracks should be split from this design

This document does not define final helper APIs, final lint configuration, or concrete app code.

## Primary accident classes

The primary focus stays on the shortlist from issue #76 because these are the cases most likely to create broad rework if they are handled ad hoc.

The primary accident classes are:

- async navigation race
- double submit or rapid re-entry
- concurrent fetch with stale response win
- unsaved exit during multi-step flow
- destructive mutation versus background refresh
- auth expiry or permission drift mid-flow
- over-broad fallback behavior
- hidden failure due to missing instrumentation

Other patterns from issue #76 can be layered on later, but these eight should drive the first safety architecture.

## Control layers

The first control model uses six layers.

### 1. Product and interaction design

This layer owns the user-visible policy for dangerous states.

It defines:

- when a control must lock interaction instead of merely warning
- when confirm-leave is mandatory
- when recovery should stay inline versus forcing a route reset
- when a background failure should remain quiet versus become visible

### 2. Shared contract and type surface

This layer makes unsafe flows harder to express.

It owns:

- typed mutation state and result surfaces
- typed error categories consumed from the shared contract work
- explicit route or request context values when late results must be invalidated
- idempotency and duplicate-intent semantics that should not remain implicit

### 3. Lint and import constraints

This layer blocks obviously unsafe entry points once the approved primitives exist.

It owns:

- import restrictions for approved async and mutation helpers
- current oxlint TypeScript promise-handling rules after the approved helper boundaries exist
- any later type-aware lint stage that the repo may choose to add for deeper async correctness checks
- discouraging direct low-level router or fetch usage in unsafe contexts
- preventing drift back to ad hoc feature-local safety logic

### 4. Runtime helpers and framework integration

This layer owns behavior that only matters under real timing and state changes.

It owns:

- stale-result discard and route-context invalidation
- mutation locking and duplicate-intent suppression
- background refresh coordination with destructive actions
- auth-expiry and permission-drift interruption handling
- helper-level telemetry emission for suppressed or recovered paths

### 5. Tests and CI

This layer proves the guarantees stay intact as feature work expands.

It owns:

- deterministic regression tests for race and duplicate-submission scenarios
- lint and import-gate enforcement inside CI
- route transition and destructive-action concurrency coverage
- smoke coverage for telemetry-bearing helpers where practical

### 6. Observability

This layer makes safety failures visible when prevention is incomplete or intentionally soft.

It owns:

- structured event names and required fields
- counters for suppressed duplicates, stale-result discards, forced re-auth, and fallback activation
- request or route correlation for recovery failures
- making silent recoveries visible enough to debug later

## Responsibility matrix

The matrix below names the primary owner for prevention, detection, and recovery. Secondary support is still allowed when needed.

| Accident class | Prevention owner | Detection owner | Recovery owner | Notes |
| --- | --- | --- | --- | --- |
| async navigation race | runtime helpers plus approved route-aware entry points | observability plus route race tests | runtime helpers | route changes invalidate old work even when the underlying request technically succeeded |
| double submit or rapid re-entry | runtime helpers plus product lock-state design | observability plus duplicate-submit tests | runtime helpers plus typed mutation state | prevention should be the default; backend idempotency is support, not the only defense |
| concurrent fetch with stale response win | runtime helpers plus typed fetch context | observability plus race tests | runtime helpers | stale-result discard policy must be centralized instead of screen-local |
| unsaved exit during multi-step flow | design plus runtime flow guards | flow tests plus abandonment telemetry | runtime helpers plus product recovery UX | this is a mixed-control case; prevention alone is not enough |
| destructive mutation versus background refresh | runtime helpers plus design lock policy | concurrency tests plus suppression telemetry | runtime helpers | destructive windows should pause or serialize conflicting refresh work |
| auth expiry or permission drift mid-flow | centralized auth-aware API path plus runtime capability invalidation | observability plus auth-interruption tests | runtime helpers plus #74 web error policy | prevention is partial here; forced recovery paths are required |
| over-broad fallback behavior | design plus typed error categories from #73 and #74 | tests plus fallback telemetry | runtime helpers plus app-level policy | recoverable failures should not collapse into generic redirect or route reset |
| hidden failure due to missing instrumentation | telemetry-bearing helper entry points | observability | runtime helpers plus CI spot checks | this concern is primarily detection-first |

## Layer-by-layer decisions

### Design responsibilities

Design owns the user-facing rules for risky situations.

The first design decisions should be:

- mutation actions with durable side effects should expose a locked or clearly busy state rather than advisory messaging only
- unsaved-exit warnings are required only for flows with meaningful draft loss or setup loss risk
- auth interruption should preserve user context when possible instead of forcing an unconditional home redirect
- recoverable stale-data or background-refresh failures should prefer inline recovery over destructive fallback

### Type and API boundary responsibilities

Types and contract surfaces should carry the state distinctions that runtime helpers depend on.

The first type-level decisions should be:

- route-aware async work should have an explicit route or request context token when late results must be rejected
- mutation helpers should expose first-class states such as idle, pending, succeeded, failed, and suppressed-duplicate
- duplicate-intent and idempotent-success semantics should be represented explicitly rather than inferred from generic success or failure values
- shared error categories come from issue #73, while issue #74 decides how web flows respond to those categories

### Lint and import responsibilities

Lint should support the safety architecture, not pretend to replace it.

The first lint decisions should be:

- once approved helpers exist, feature code should not freely bypass them with direct low-level router or raw fetch usage in sensitive contexts
- import restrictions should enforce centralized entry points for route-aware async work, mutation submission, auth-aware API access, and telemetry-bearing suppression paths
- the repo's current oxlint TypeScript promise-handling rules should be treated as a second-line guard after the approved helper boundaries exist
- if the repo later adopts a separate type-aware lint stage, that stage should stay in phase 2 and should deepen async correctness checks rather than redefine the safety architecture
- promise-handling rules should focus on catching unsafe escapes such as dropped async work or misused async handlers, not on expressing all product safety policy by themselves

The first current oxlint TypeScript candidate rules remain:

- `typescript/no-floating-promises`
- `typescript/no-misused-promises`
- `typescript/promise-function-async`

Rules like `typescript/require-await` should be treated as lower-priority hygiene rather than part of the first safety gate.

### Runtime responsibilities

Runtime helpers own the actual timing-sensitive safety behavior.

The first runtime decisions should be:

- route or navigation helpers own cancellation, ignore-late-result behavior, and route-context invalidation
- mutation helpers own busy locking, duplicate suppression, and post-success reconciliation hooks
- background refresh helpers own freshness updates but must not override destructive mutation windows
- auth-aware API access owns session interruption detection and routes the result into the web recovery policy defined by issue #74

### CI and test responsibilities

Tests should concentrate on the small set of race and safety guarantees that are easy to regress.

The first required coverage areas should be:

- route transition race suppression
- duplicate submit prevention
- stale response discard ordering
- destructive mutation versus background refresh coordination
- auth-expiry interruption and recovery routing

### Observability responsibilities

Observability should treat locally recovered or intentionally suppressed events as first-class signals when they reveal safety pressure.

The first telemetry requirements should be:

- count suppressed duplicate submissions
- count stale-result discards
- record forced re-auth or permission-drift interruptions
- record fallback activation when a route reset or redirect is used instead of inline recovery
- keep request or route correlation IDs available for failure investigation

## Mandatory entry points versus convention-only controls

The following controls should become mandatory entry points once implemented:

- navigation-aware async helpers for route-triggered work
- approved mutation helpers that own busy state and duplicate-intent suppression
- a centralized auth-aware API access path
- telemetry-bearing error and suppression reporting helpers

The following controls can start as convention plus guidance, then tighten later if drift appears:

- background refresh helpers for non-destructive screens
- local flow guard helpers for unsaved-exit handling on flows that are not yet widely reused

The rule of thumb is simple: if bypassing a primitive can cause cross-screen state corruption or hidden safety regressions, that primitive should become mandatory rather than advisory.

## Boundary decisions

### Route and navigation control

Route and navigation control owns:

- whether earlier work is still allowed to commit after the view context changed
- how route-scoped cancellation or ignore-late-result policy works
- when route reset is allowed as a recovery path

This layer should not own generic mutation semantics.

### Mutation control

Mutation control owns:

- duplicate-intent suppression
- busy locking for durable actions
- optimistic or reconciliation handoff after mutation completion
- safe interaction between submission state and retry state

This layer should not own generic route invalidation rules except where a mutation helper must signal a navigation-aware boundary.

### Background-fetch control

Background-fetch control owns:

- freshness updates
- stale-response discard
- suppression or deferral when a destructive mutation window is active

This layer should not be allowed to re-enable dangerous actions or override a mutation control decision.

## Relationship to issues #73 and #74

Issue #73 owns the shared error vocabulary and typed error surfaces.

Issue #74 owns the web-specific response policy, such as when to redirect, when to keep context, and when to show inline recovery.

This document sits between them by deciding which web safety controls depend on shared types, which depend on runtime policy, and which must be enforced by helper entry points or tests.

## Follow-up issue seeds

This design should split into focused implementation work under issue #22 and related tracks.

The first follow-up candidates are:

- route-aware async safety helpers and import restrictions
- mutation submission guardrails and duplicate-intent suppression
- background refresh coordination for destructive mutation windows
- auth-aware API access and interruption handling
- race-regression and duplicate-submit test coverage
- observability requirements for suppressed or recovered failures

## Summary

FocusBuddy should not rely on one layer to provide all web safety.

The first safety stack should use design for user-facing policy, shared types for explicit state boundaries, lint and import rules for safe entry points, runtime helpers for timing-sensitive behavior, tests for regression resistance, and observability for the cases that escape prevention.