# Transport-Level Request Rejection Policy

This document captures the output of issue #92.

Its purpose is to define how FocusBuddy should reason about request failures that happen before normal app code can parse the request, attach the normal request ID, or return the shared JSON error contract.

This document builds on the web error handling policy, the web accident pattern inventory, [web-safety-control-responsibilities.md](web-safety-control-responsibilities.md), and the MVP API error model.

## Scope

This document defines:

- the repository-level definition of transport-level request rejection
- the boundary between pre-app transport rejection and app-level error handling
- the first prevention policy for cookie, session, and header growth
- the required response ownership when rejection happens before app code runs
- the minimum observability and verification requirements for these failures
- concrete follow-up work needed in docs, local tooling, and CI

This document does not define the final CDN or ingress product, final production infrastructure, or the final implementation details of auth/session helpers.

## Core distinction

The repository should separate two failure classes.

| Failure class                     | Reaches normal app code | Shared JSON error contract available | Normal app request ID available | Primary owner                                       |
| --------------------------------- | ----------------------- | ------------------------------------ | ------------------------------- | --------------------------------------------------- |
| app-level error                   | yes                     | yes                                  | yes                             | app error handling and web response policy          |
| transport-level request rejection | not reliably            | not guaranteed                       | not guaranteed                  | edge, platform, transport policy, and observability |

The practical classification rule is:

- if the failure can happen before the application can safely parse the request and attach its normal diagnostics, treat it as transport-level rejection
- do not force these failures into the shared app error contract just because the UI would prefer a typed JSON response
- app-level policy starts only after the request has crossed the application boundary

## First definition of transport-level rejection

Transport-level request rejection means a request is rejected at the browser, CDN, proxy, load balancer, HTTP server, or framework boundary before the repository can rely on normal app middleware, route handlers, guards, or exception filters.

Typical characteristics are:

- the app may never receive a usable request object
- the app may never attach the normal request ID
- the app may never return the shared typed JSON error response from issue #73
- the only durable signal may exist in browser, edge, proxy, or server logs

## Primary example classes

The repository should treat the following as first-class transport rejection examples.

| Example class                         | Typical trigger                                                                                          | Why it is transport-level                                                             | First prevention owner               |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------ |
| oversized request headers             | cookie growth, duplicated cookies, forwarded-header growth, accidental custom-header bloat               | request may be rejected by browser, proxy, or HTTP server before the app runs         | auth/session transport plus platform |
| cookie-bomb or cookie duplication     | repeated cookie appends, stale cookie names left in place, multiple session layers writing independently | the aggregate `Cookie` header can exceed a platform limit before any route logic runs | auth/session transport               |
| malformed or invalid headers          | illegal header encoding, invalid header syntax, broken proxy forwarding                                  | request parsing may fail before middleware or route handlers run                      | platform and transport configuration |
| protocol or server boundary rejection | request rejected by reverse proxy, ingress, or server parser due to boundary rules                       | no app-owned error mapping is available                                               | platform layer                       |

These examples matter because they create a real failure class that app-level JSON error design cannot normalize after the fact.

## Ownership split

The first ownership split should stay explicit.

| Area                                  | Owns                                                                                               | Does not own                                                 |
| ------------------------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| shared app error model from issue #73 | typed JSON errors for requests that reach the app boundary                                         | failures rejected before app code runs                       |
| web error handling from issue #74     | how the web product reacts to app-level error codes and route failures                             | pretending early rejection always has a typed app error body |
| auth and session transport            | cookie shape, serialization discipline, header-budget awareness, duplicate-cookie prevention       | generic proxy or ingress response generation                 |
| platform and edge layer               | actual early rejection behavior, status code choice, server or proxy limits, raw rejection logging | redefining app-level public error codes                      |
| observability                         | cross-layer visibility when app request IDs are missing                                            | assuming app logs are always present                         |

The rule of thumb is:

- app error policy owns failures that reach app code
- transport policy owns failures that do not reliably reach app code
- auth and session work is not complete if it can still create unbounded cookie or header growth without measurement

## Prevention policy

The first prevention policy should make transport drift explicit instead of treating it as an operational surprise.

### Header and cookie budget policy

- request-header growth must be treated as a designed budget, not an incidental byproduct of auth or session implementation
- auth and session code must keep an explicit budget for aggregate cookie footprint, per-cookie size, and cookie count
- the repository must keep a documented soft budget for day-to-day development and a stricter hard budget that blocks merge once enforcement exists
- exact byte limits may depend on the final edge stack, but the repository-owned budget must be conservative enough that platform selection does not become the first time a violation is discovered
- auth/session implementation is incomplete until those budgets are written down, measurable, and checked in at least one automated path

### Cookie writing discipline

- one logical concern should own each cookie name; independent layers must not append competing session cookies without coordination
- replacing or clearing a cookie must be explicit so stale values do not silently accumulate
- duplicate-cookie scenarios and accidental header multiplication must be treated as safety bugs, not as harmless local-dev quirks
- browser-visible and server-only cookies should be reviewed together because aggregate request size is what matters at rejection time

### Drift policy for local development

- fast local development may use stubs or simplified auth flows, but it must not normalize unlimited cookie or header growth as acceptable
- parity-oriented validation must include at least one runtime path where realistic header limits are enforced before app code runs
- if local-fast mode cannot reproduce a transport rejection class, the repository must provide a parity check or CI gate that can reproduce or detect that rejection before app code runs

## Response behavior policy

Transport rejection should not be disguised as a normal app error.

The first response rules should be:

- when rejection happens before app code runs, the response owner is the edge, proxy, server, or platform layer that rejected the request
- when possible, that layer should return the narrowest standard HTTP response available for the failure class, such as a `431`-style response for oversized request headers
- the response body may be minimal, plain-text, or platform-generated; it does not need to match the app JSON error contract
- the app must not claim ownership of diagnostics it could not have produced
- web code should treat these failures as transport or network boundary failures, not as missing app error normalization

This boundary is important because a user-visible failure may still need handling even when no typed JSON response exists.

## Observability policy

Transport rejection is primarily an observability problem when prevention fails.

The first required signal set should be:

- a platform or edge correlation ID whenever the platform can provide one
- rejection status code and coarse rejection reason
- request target metadata that is safe to log, such as method, path pattern, or route family
- request-header size or cookie-size indicators when available
- a counter or metric family for early rejection by reason and route family

The first logging rules should be:

- do not rely on the app request ID for this class because it may never exist
- keep raw cookie values and secrets out of logs; log sizes, counts, and reason categories instead
- preserve enough cross-layer timing and correlation to connect browser reports, edge logs, and server logs when the request sometimes reaches the app and sometimes does not

## Minimum verification points

The repository should verify this boundary in four places.

### 1. Design-time review

- auth, session, and platform changes must document whether they affect cookie count, cookie size, or request-header growth
- any new request metadata added by proxies, auth, or tracing should be reviewed for header-budget impact

### 2. Fast local checks

- lightweight checks should measure serialized cookie and header footprint before full-stack runtime tests are needed
- helper tests should cover duplicate-cookie and uncontrolled-growth scenarios where practical
- local tooling should make budget violations visible before a developer reaches deploy-time debugging

### 3. Parity-oriented validation

- the repository should keep at least one validation path that exercises realistic header-limit enforcement before app code runs
- this path should confirm that the failure appears as a transport rejection rather than a normal app JSON error
- the path should be able to reproduce at least the oversized-header or cookie-bomb class because that is the most likely auth/session accident here

### 4. CI or merge-gate enforcement

- once budget measurement helpers exist, CI should fail when hard budgets are exceeded
- parity checks should run often enough that auth/session transport changes cannot ship without coverage
- if full parity runtime is too expensive for every push, the repository should still run fast budget checks on every merge gate and reserve the heavier rejection scenario for a narrower but mandatory CI stage

## Relationship to issues #73, #74, #76, and #77

Issue #73 owns the shared public app error vocabulary.

Issue #74 owns how the web product reacts when those app-level error codes are returned.

Issue #76 identifies accident patterns such as auth or session drift and over-broad fallback behavior that become harder to debug when transport rejection is left implicit.

Issue #77 assigns responsibility across design, types, lint, runtime helpers, tests, and observability for the accident patterns that do reach application control paths.

This document covers the earlier boundary where those systems may never run.

## Follow-up issue seeds

The first follow-up work should include:

- a concrete cookie and request-header budget note owned by auth and session transport work
- local tooling or tests that measure serialized cookie and header growth
- a parity-oriented rejection scenario in local infrastructure or CI that proves pre-app rejection behavior
- platform logging and metric requirements for early request rejection
- web-side fallback guidance for transport failures that never produce typed app errors

## Done-state coverage

This policy now makes explicit:

- the boundary between app-level errors and pre-app transport rejection
- the primary transport failure classes that FocusBuddy must design for
- the ownership split across app error design, auth/session transport, platform, and observability
- the prevention rule that cookie and header growth must stay inside measured budgets
- the minimum response, logging, and verification expectations for this failure class
