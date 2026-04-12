# Web Error Handling Policy

This document captures the output of issue #74.

Its purpose is to define the first web-side error handling policy for redirects, inline feedback, retry actions, and route-level error rendering in FocusBuddy.

This document uses the shared public error vocabulary defined by issue #73 and applies it to web-specific route, mutation, and background-refresh behavior.

## Scope

This document defines:

- how the web app should interpret shared public error codes
- which failures trigger redirect, not-found rendering, inline feedback, retry UI, toast or banner messaging, or route-level ErrorBoundary rendering
- the first handling matrix for route loads, mutations, and background refreshes
- the boundary between shared error codes and web-only presentation logic
- when already rendered stale data may remain visible and when it must be replaced

This document does not define final copy, localization, design-system wording, mobile UX, or app implementation details.

## Ownership split

The first ownership split should stay explicit.

| Area                                       | Owns                                                                                                | Does not own                                     |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| shared contract consumption in `apps/web`  | branching by public `code`, using `retryable`, choosing UI states, route fallback decisions         | defining canonical server codes or HTTP mappings |
| route and page UX in `apps/web`            | redirect destinations, not-found rendering, route-level error rendering, mutation feedback patterns | server exception normalization                   |
| shared contract in `packages/api-contract` | error code vocabulary and response shape consumed by web                                            | UI copy, route transitions, visual severity      |

The rule of thumb is:

- the shared contract decides what the failure means
- the web policy decides how that failure appears to the user
- the web policy must not redefine the meaning of the shared error codes

## First handling principles

The first web error policy should follow these principles.

- redirect only when the user must change auth context before retrying
- prefer inline feedback for user-fixable mutation failures such as validation and narrow business-rule failures
- prefer not-found rendering for secrecy-preserving missing-or-hidden resources
- use route-level error rendering for route-load failures that are unrecoverable inside the current view
- keep background refresh failures non-destructive when already rendered data is still safe to show
- use toast or banner as supplemental signals, not as the only signal for route-fatal failures
- preserve local mutation input whenever the user can still correct and retry

## UI primitives

The first policy uses these primitives.

| UI primitive                        | Primary use                                                                        |
| ----------------------------------- | ---------------------------------------------------------------------------------- |
| redirect to sign-in                 | `AUTH_REQUIRED` when the current action cannot continue without new auth context   |
| not-found rendering                 | `RESOURCE_NOT_FOUND` and secrecy-preserving `ACCESS_DENIED` cases                  |
| inline field feedback               | `VALIDATION_ERROR`                                                                 |
| inline page-level business feedback | `INVALID_STATE_TRANSITION`, `DOMAIN_RULE_VIOLATION`, selected `DUPLICATE_RESOURCE` |
| retryable route error state         | `UPSTREAM_UNAVAILABLE`, selected route-load `RATE_LIMITED`                         |
| generic route error state           | `INTERNAL_ERROR` and unrecoverable route-load failures                             |
| non-blocking toast or banner        | selected background-refresh failures and capability-loss signals                   |

## Decision matrix

| Public code                | Route load on protected or owner-scoped page                                                                 | Route load on public page                                                           | Mutation or form submit                                                                                                     | Background refresh                                                                                |
| -------------------------- | ------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `VALIDATION_ERROR`         | treat as unexpected and log; render generic route error only if no local recovery exists                     | same as protected route load                                                        | show inline field or form error and preserve user input                                                                     | do not interrupt the view; log for investigation if it occurs                                     |
| `AUTH_REQUIRED`            | hard redirect to sign-in and preserve return path                                                            | keep the public page unless the viewer explicitly initiated an auth-required action | redirect to sign-in or open auth flow, then allow retry when the route can recover safely                                   | show session-expired banner or prompt without destroying the current view                         |
| `ACCESS_DENIED`            | render access-denied state only when the route already discloses resource existence; otherwise use not-found | usually render not-found for secrecy-preserving public surfaces                     | show non-field error and keep the current view; do not retry automatically                                                  | surface a non-blocking capability-lost message and stop the blocked action                        |
| `RESOURCE_NOT_FOUND`       | render not-found                                                                                             | render not-found                                                                    | show resource-missing message, disable stale action, and navigate away only if the current route can no longer remain valid | keep stale data only if it is still safe to show; otherwise replace with empty or not-found state |
| `INVALID_STATE_TRANSITION` | show recoverable page state when current resource state can be refreshed; otherwise use generic route error  | same as protected route load                                                        | show inline or page-level business message and refetch current resource state                                               | refetch once, then show non-blocking state-changed message                                        |
| `DOMAIN_RULE_VIOLATION`    | show recoverable page state when the resource context remains trustworthy                                    | same as protected route load                                                        | show inline or adjacent explanatory message and preserve current form state                                                 | keep current UI and surface a lightweight warning if the action was rejected                      |
| `DUPLICATE_RESOURCE`       | usually treat as recoverable and refresh the resource                                                        | same as protected route load                                                        | show idempotent success hint or narrow conflict message based on action semantics                                           | suppress noisy UI and reconcile with fresh data                                                   |
| `RATE_LIMITED`             | show retryable route error with cooldown guidance when the route cannot proceed                              | same as protected route load                                                        | show inline or toast cooldown message and temporarily disable repeated submit                                               | back off silently first, then surface a banner only if the condition persists                     |
| `UPSTREAM_UNAVAILABLE`     | render retryable route error state with request ID and retry affordance                                      | render retryable route error state with request ID and retry affordance             | preserve user input, show retry affordance, and avoid route reset                                                           | retain stale data, mark refresh failure, and retry later                                          |
| `INTERNAL_ERROR`           | render generic route error state and log with request ID                                                     | render generic route error state and log with request ID                            | show generic failure message, preserve input when possible, and offer retry                                                 | keep stale data if safe, log, and avoid repeated user interruption                                |

## Route-context rules

### Route loads

Route-load failures must choose among redirect, not-found rendering, recoverable page state, and route-level error rendering.

The first route-load rules should be:

- `AUTH_REQUIRED` on protected routes redirects to sign-in and preserves return path
- secrecy-preserving visibility failures prefer not-found over explicit access-denied rendering
- route-load `UPSTREAM_UNAVAILABLE` and route-load `INTERNAL_ERROR` become route-level error states rather than inline page fragments
- domain failures may stay in a recoverable page state only when the route still has enough trustworthy context to explain and retry safely

### Mutations and forms

Mutation failures should prefer preserving local state so the user can correct and retry.

The first mutation rules should be:

- `VALIDATION_ERROR` stays inline and keeps field values intact
- `INVALID_STATE_TRANSITION` and `DOMAIN_RULE_VIOLATION` stay adjacent to the affected action or page section instead of triggering route replacement
- `AUTH_REQUIRED` from mutation paths should preserve retry intent when feasible, but must not silently replay destructive actions after re-auth without explicit user confirmation
- `DUPLICATE_RESOURCE` should map to idempotent success when the product semantics are intentionally idempotent, such as repeated helpful-stamp enable

### Background refresh

Background refresh failures should not destroy already rendered valid data unless that data is now unsafe to show.

The first background-refresh rules should be:

- keep stale data visible for `UPSTREAM_UNAVAILABLE`, `INTERNAL_ERROR`, and transient `RATE_LIMITED` cases when the data is still safe
- if auth or permission drift makes the current data unsafe to keep showing, replace it with the safer state instead of leaving stale privileged content on screen
- use banner or lightweight messaging for refresh failures that affect capability but do not invalidate the entire route

## Auth and redirect policy

The first auth policy should be explicit.

- route-load `AUTH_REQUIRED` on protected routes uses hard redirect to sign-in and preserves return path
- public routes do not redirect just because a background request hit `AUTH_REQUIRED`; they only prompt when the user initiates an action that requires auth
- mutation-triggered `AUTH_REQUIRED` may use an in-place auth prompt only if the current route can remain valid and the pending action can be resumed safely
- after re-auth, the product should restore user context when possible instead of forcing a home redirect

## Not-found versus access-denied policy

The web app should preserve secrecy where needed instead of over-explaining authorization failures.

The first not-found policy should be:

- public summary pages and other public-facing routes should use not-found for all hidden-resource cases, even if the viewer is authenticated but unauthorized
- owner-scoped or already-disclosed routes may use explicit access-denied states when the user already knows the resource exists
- `RESOURCE_NOT_FOUND` remains the default rendering choice for missing or hidden content on public surfaces

## Duplicate-intent and stamp policy

The web app should not turn intentional idempotency into visible conflict noise.

The first duplicate-intent policy should be:

- duplicate helpful-stamp enable attempts should surface as silent success or no-op confirmation, not as a visible conflict error
- mutation helpers may still record suppressed duplicate intent internally for observability, but the user-visible state should stay stable
- non-idempotent duplicate creates may still show a narrow conflict message when the user needs to understand why the action failed

## Recoverable versus route-fatal failures

The route should remain recoverable only when the product can still explain the current state safely and offer a meaningful next action.

Use recoverable page state when:

- the resource context is still trustworthy
- the user can fix the problem in place
- no secrecy or auth reset is required

Use route-level error rendering when:

- the route cannot explain the current state without a full reload or retry
- upstream or internal failures prevent trustworthy route composition
- keeping the current route would encourage unsafe or misleading user actions

## Relationship to issues #73, #76, and #77

Issue #73 owns the shared public error vocabulary and response shape.

Issue #76 identifies the accident patterns that make inconsistent fallback behavior dangerous.

Issue #77 assigns responsibility for prevention, detection, and recovery across layers, and this document supplies the web-specific response policy referenced there.

The boundary is:

- issue #73 decides what the error means
- this document decides how the web app reacts
- issue #77 decides which layer owns the control path

## Follow-up issue seeds

This policy should be concrete enough to drive follow-up work such as:

- route-level error state helpers for retryable versus generic failures
- auth-required redirect and return-path helpers
- mutation error presentation helpers that preserve field state
- not-found versus access-denied route helpers for public and owner-scoped pages
- background refresh banners and stale-data retention rules

## Done-state coverage

This document now makes explicit:

- the first web error handling matrix by error code and request context
- redirect, inline feedback, retry, not-found, and route-level error rendering rules
- the ownership split between shared error codes and web-specific presentation logic
- the boundary between recoverable page state and route-fatal failures
- the decisions needed to guide implementation work after issue #22
