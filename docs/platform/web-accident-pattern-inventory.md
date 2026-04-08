# Web Accident Pattern Inventory

This document captures the output of issue #76.

Its purpose is to make the expected web accident patterns, control postures, and follow-up implementation tracks explicit before feature implementation expands on top of issue #22.

This document is the accident inventory. Issue #77 builds on it by assigning prevention, detection, and recovery responsibilities across design, types, lint, runtime helpers, tests, and observability.

## Scope

This document defines:

- the repository-level accident inventory for the FocusBuddy web app
- the trigger, unsafe outcome, and preferred safe outcome for each accident class
- whether each pattern should be treated as prevention-first, detection-first, or mixed-control
- which patterns primarily affect route or navigation, mutation, background fetch, auth or session, multi-step flow, or observability
- the minimum observability signal needed for each pattern
- concrete follow-up issue seeds for web, shared contract, and testing work

This document does not define final helper APIs, final lint rules, or concrete app code.

## Control posture definitions

### Prevention-first

Use prevention-first when the unsafe outcome is easy to trigger and expensive to clean up afterward.

### Mixed-control

Use mixed-control when the product should block the highest-risk path but still needs explicit recovery behavior and telemetry.

### Detection-first

Use detection-first when full prevention is unrealistic or too costly, but the condition must be surfaced quickly enough to debug and improve.

## Priority tiers

The first implementation wave should treat the following eight patterns as primary focus because they are likely to shape shared helpers, route behavior, and product policy across many screens.

- async navigation race
- double submit or rapid re-entry
- concurrent fetch with stale response win
- unsaved-exit during multi-step flow
- destructive mutation versus background refresh
- auth expiry or permission drift mid-flow
- over-broad fallback behavior
- hidden failure due to missing instrumentation

The following patterns stay in the catalog but are second-wave design targets until the single-tab and single-flow rules are stable.

- duplicate intent across tabs or repeated resume
- partial success with missing visible feedback

## Surface coverage map

| Surface | Primary patterns | Why it matters early |
| --- | --- | --- |
| route/navigation | async navigation race, unsaved-exit during multi-step flow, auth expiry or permission drift mid-flow, over-broad fallback behavior | route context changes are where stale work and destructive recovery paths often become user-visible |
| mutation/form | double submit or rapid re-entry, destructive mutation versus background refresh, partial success with missing visible feedback, duplicate intent across tabs or repeated resume | repeated intent and conflicting writes create durable side effects that are expensive to unwind |
| background fetch | concurrent fetch with stale response win, destructive mutation versus background refresh, auth expiry or permission drift mid-flow | background activity can quietly reintroduce stale or contradictory state |
| auth/session | auth expiry or permission drift mid-flow, duplicate intent across tabs or repeated resume | session drift crosses route, mutation, and permission boundaries at once |
| multi-step flow | unsaved-exit during multi-step flow, partial success with missing visible feedback | wizard-like work needs explicit draft-loss and recovery rules |
| observability | hidden failure due to missing instrumentation plus minimum signals on every other pattern | locally recovered accidents still need to be visible enough to debug |

## Accident catalog

| Accident pattern | Control posture | Primary surface | Typical trigger | Unsafe outcome if unmanaged | Preferred safe outcome | Minimum observability | Likely follow-up owner |
| --- | --- | --- | --- | --- | --- | --- | --- |
| async navigation race | prevention-first | route/navigation | route changes while earlier work is still in flight | late result commits into the wrong screen or route state | old work is canceled, ignored, or silently completed without state commit | route context ID, request ID, late-result discard counter | web route/runtime helper work |
| double submit or rapid re-entry | prevention-first | mutation/form | repeated click, Enter repeat, impatient retry, duplicate handler wiring | duplicate mutation or duplicate side effect | second intent is suppressed or merged while busy state stays explicit | duplicate-submit counter, mutation attempt correlation, suppression reason | web mutation helper work plus contract idempotency review |
| concurrent fetch with stale response win | prevention-first | data load/background refresh | competing loads resolve out of order | stale payload overwrites fresher state | stale response is discarded by centralized freshness rules | request sequence marker, stale-result discard counter | web data-loading and background refresh work |
| unsaved-exit during multi-step flow | mixed-control | multi-step flow/navigation | user leaves with draft or staged changes not committed | lost input, abandoned setup, confusing resume experience | high-risk exit is blocked or confirmed, with resumable recovery where appropriate | abandonment warning count, confirm-leave outcome, draft recovery signal | web flow guard and product UX work |
| destructive mutation versus background refresh | prevention-first | mutation + background fetch | delete, archive, publish-like action overlaps with auto-refresh | UI re-enables invalid actions or shows contradictory state | destructive window locks or serializes conflicting refresh work | destructive-window suppression counter, conflicting refresh event | web mutation/background coordination work |
| auth expiry or permission drift mid-flow | mixed-control | auth/session + route/mutation | token expiry, role change, ownership change after render | action fails late, stale privileged affordance remains visible, route becomes invalid | route or action is invalidated safely, user context is preserved where possible, recovery path is explicit | forced re-auth counter, permission drift event, interrupted mutation event | web auth/session policy work with #74 and #73 coordination |
| duplicate intent across tabs or repeated resume | mixed-control | mutation/session | same logical action resumes in another tab or restored flow | hidden conflict, surprising state jump, duplicate effect | conflict is detected and surfaced, with server-backed idempotency where needed | resume conflict event, cross-tab intent collision event | second-wave web session coordination plus contract review |
| partial success with missing visible feedback | detection-first | mutation/flow | server accepts part of a sequence but UI collapses to generic success or failure | user trust loss, repeated retries, support burden | partial outcome is visible and recoverable instead of hidden | partial-success event, missing-feedback error tag, retry-after-partial metric | second-wave web UX plus contract error vocabulary |
| hidden failure due to missing instrumentation | detection-first | observability | fallback or suppression happens without telemetry | safety regressions remain invisible until user reports | recovered and suppressed paths emit structured telemetry by default | required event taxonomy, missing-telemetry CI or review checks | observability and CI work |
| over-broad fallback behavior | prevention-first | route/error handling | generic redirect, route reset, or catch-all error handling used for distinct cases | recoverable states become destructive or confusing | failure class maps to the narrowest safe fallback | fallback reason code, redirect/reset counter, error-class tag | web error policy work with #74 |

## Pattern details

### Async navigation race

- User story or route context: a user starts a route-triggered load or mutation side effect, then navigates before the earlier work completes.
- Trigger sequence: route A starts work, user moves to route B, late result from route A resolves after route context changed.
- Unsafe outcome if unmanaged: stale result commits into route B or mutates shared state as if route A were still active.
- Preferred safe outcome: late work is canceled or ignored at commit time, and route B remains authoritative.
- Whether prevention is realistic at the UI boundary: yes; navigation-aware helpers can own route-context invalidation and result discard.
- Whether server or contract support is required: not strictly required, but correlation IDs and explicit error classes make debugging easier.
- Required observability signal: request ID, route context token, late-result discard count, and route transition timing.
- Likely follow-up implementation owner: web route and navigation safety work.

### Double submit or rapid re-entry

- User story or route context: a user submits a form or presses a primary action multiple times while the first mutation is still pending.
- Trigger sequence: repeated pointer or keyboard activation, delayed response, or duplicated event wiring creates overlapping submissions.
- Unsafe outcome if unmanaged: duplicate records, duplicate side effects, or contradictory pending and success states.
- Preferred safe outcome: the first intent owns the mutation window, later attempts are suppressed or explicitly merged, and the UI shows a locked or busy state.
- Whether prevention is realistic at the UI boundary: yes; mutation helpers and action-state design should prevent the duplicate path by default.
- Whether server or contract support is required: server idempotency and duplicate-intent semantics are useful backup support, especially for durable side effects.
- Required observability signal: duplicate-submit prevention count, mutation correlation ID, and suppressed-intent reason.
- Likely follow-up implementation owner: web mutation guardrails plus contract idempotency review.

### Concurrent fetch with stale response win

- User story or route context: a screen triggers overlapping loads through refetch, filter change, or route transition.
- Trigger sequence: request 1 starts, request 2 starts later, request 2 resolves first, request 1 resolves last and overwrites the newer state.
- Unsafe outcome if unmanaged: stale data wins, causing the UI to regress to an older snapshot.
- Preferred safe outcome: centralized freshness policy discards stale results and commits only the currently authoritative response.
- Whether prevention is realistic at the UI boundary: yes; request sequencing and freshness ownership belong in shared loading primitives.
- Whether server or contract support is required: optional but helpful for cache validators, timestamps, or version markers.
- Required observability signal: request sequence metadata, stale-result discard counter, and overlap timing diagnostics.
- Likely follow-up implementation owner: web data-loading and background fetch work.

### Unsaved-exit during multi-step flow

- User story or route context: a user partially completes a wizard, setup flow, or multi-step editor and leaves before commit.
- Trigger sequence: route change, browser back, close, refresh, or auth interruption happens while draft state is still local.
- Unsafe outcome if unmanaged: meaningful input disappears and the user cannot tell whether progress was saved or lost.
- Preferred safe outcome: high-risk exits trigger confirmation or draft preservation, while low-risk exits remain silent.
- Whether prevention is realistic at the UI boundary: partially; the UI can guard obvious exits, but recovery and resume policy still matter.
- Whether server or contract support is required: optional for autosave or resumable drafts, but not required for the first warning policy.
- Required observability signal: confirm-leave display count, confirm outcome, draft-resume usage, and abandonment rate.
- Likely follow-up implementation owner: web flow guard design and product UX work.

### Destructive mutation versus background refresh

- User story or route context: a user deletes, archives, publishes, or changes visibility while background refresh continues.
- Trigger sequence: destructive mutation opens a pending window, then refetch or automatic refresh commits conflicting state before the mutation settles.
- Unsafe outcome if unmanaged: stale controls reappear, invalid actions are re-enabled, or the screen shows contradictory server truth.
- Preferred safe outcome: destructive windows lock or serialize conflicting refresh work, followed by explicit reconciliation after mutation completion.
- Whether prevention is realistic at the UI boundary: yes; coordination should live in shared mutation and refresh helpers.
- Whether server or contract support is required: useful for explicit version conflict or post-mutation state markers.
- Required observability signal: destructive-window refresh suppression count, conflict event, and post-mutation reconciliation result.
- Likely follow-up implementation owner: web mutation and background-fetch coordination work.

### Auth expiry or permission drift mid-flow

- User story or route context: a user is active on a screen when the session expires or their authorization changes.
- Trigger sequence: token expiration, sign-out in another context, role change, ownership transfer, or server-side permission update occurs after render.
- Unsafe outcome if unmanaged: privileged actions remain visible, late mutations fail opaquely, or the user is dumped to a generic fallback route.
- Preferred safe outcome: the route or action invalidates safely, the user context is preserved where possible, and recovery is explicit rather than generic.
- Whether prevention is realistic at the UI boundary: only partially; stale affordances can be narrowed in the UI, but runtime interruption handling is still required.
- Whether server or contract support is required: yes; shared error categories from #73 and response policy from #74 are part of the safe path.
- Required observability signal: forced re-auth event, permission-drift event, interrupted mutation or route-load event, and preserved-context flag.
- Likely follow-up implementation owner: web auth and session policy work with #73 and #74 coordination.

### Duplicate intent across tabs or repeated resume

- User story or route context: the same logical draft, publish action, or resume flow is reopened from another tab or restored after interruption.
- Trigger sequence: second tab continues the same intent, a restored session replays stale draft state, or a pending action resumes without fresh context.
- Unsafe outcome if unmanaged: duplicate writes, surprising state jumps, or invisible conflicts between current and restored intent.
- Preferred safe outcome: collisions are detected, conflicting state is surfaced clearly, and server-backed idempotency or revision checks arbitrate final state.
- Whether prevention is realistic at the UI boundary: partially; some collisions can be blocked locally, but cross-tab and resume cases need shared identifiers or revision support.
- Whether server or contract support is required: usually yes for robust idempotency keys, revision markers, or resume tokens.
- Required observability signal: cross-tab collision event, resume-conflict event, and duplicate-intent correlation data.
- Likely follow-up implementation owner: second-wave web session coordination plus shared contract review.

### Partial success with missing visible feedback

- User story or route context: a multi-step action partially succeeds but the UI presents only generic success or failure.
- Trigger sequence: one step of a compound mutation succeeds while later steps fail or are skipped, and the UI collapses the result.
- Unsafe outcome if unmanaged: the user retries a partially completed action, loses trust in the UI, or creates support-heavy ambiguity.
- Preferred safe outcome: partial completion is visible, distinguishable from full success and full failure, and paired with clear next steps.
- Whether prevention is realistic at the UI boundary: not fully; the UI mostly needs enough signal to detect and display the partial outcome correctly.
- Whether server or contract support is required: yes for typed partial-success outcomes or error categories that distinguish incomplete completion.
- Required observability signal: partial-success event, retry-after-partial counter, and missing-feedback error tag.
- Likely follow-up implementation owner: second-wave web UX work with shared contract vocabulary from #73.

### Hidden failure due to missing instrumentation

- User story or route context: a control suppresses or recovers from a failure locally, but no one can observe it later.
- Trigger sequence: stale result is discarded, duplicate submit is suppressed, fallback path activates, or forced recovery succeeds silently.
- Unsafe outcome if unmanaged: regressions remain invisible until users report them and the team lacks enough data to reproduce the problem.
- Preferred safe outcome: recovered and suppressed paths emit structured telemetry by default, not only fatal failures.
- Whether prevention is realistic at the UI boundary: no; this is mainly a detection requirement.
- Whether server or contract support is required: not necessarily, but shared event fields and correlation IDs improve traceability.
- Required observability signal: required event taxonomy, correlation IDs, and coverage checks for suppression and recovery paths.
- Likely follow-up implementation owner: observability and CI work.

### Over-broad fallback behavior

- User story or route context: the app handles many distinct failures by redirecting away, resetting the route, or showing a generic error shell.
- Trigger sequence: an error boundary, route loader, or mutation handler maps multiple failure classes into one destructive fallback.
- Unsafe outcome if unmanaged: recoverable work is discarded, user context is lost, and route behavior becomes confusing and inconsistent.
- Preferred safe outcome: each failure class maps to the narrowest safe fallback, preserving context whenever possible.
- Whether prevention is realistic at the UI boundary: yes; error policy and helper boundaries can prevent generic fallbacks from becoming the default.
- Whether server or contract support is required: yes for distinguishing error classes through #73, and #74 defines the web-specific response policy.
- Required observability signal: fallback reason code, redirect or reset counter, error-class tag, and preserved-context flag.
- Likely follow-up implementation owner: web error-handling policy work with #74.

## Coordination with #73, #74, and #77

Issue #73 owns the shared error vocabulary and typed error surfaces needed by patterns such as auth drift, partial success, and over-broad fallback behavior.

Issue #74 owns the web-specific response policy for those error classes, including when to keep route context, when to redirect, and when inline recovery is required.

Issue #77 builds on this document by assigning responsibility for the primary patterns across design, types, lint, runtime helpers, tests, and observability.

The boundary is intentional:

- this document answers what can go wrong and what safe outcome is expected
- #77 answers which layer owns the control
- #73 answers which error categories and typed surfaces are shared
- #74 answers how the web product should react when those error categories appear

## Patterns that need API or contract coordination

The strongest contract touchpoints are:

- auth expiry or permission drift mid-flow
- double submit or rapid re-entry when durable idempotency matters
- duplicate intent across tabs or repeated resume
- partial success with missing visible feedback
- over-broad fallback behavior through typed error categories

The strongest web-boundary-first patterns are:

- async navigation race
- concurrent fetch with stale response win
- unsaved-exit during multi-step flow
- destructive mutation versus background refresh
- hidden failure due to missing instrumentation

## Follow-up issue seeds

The first follow-up seeds that should be split after this catalog are:

- route and navigation safety rules for async work, including route-context invalidation and late-result discard
- mutation submission guardrails, busy locking, and duplicate-intent suppression defaults
- stale-response and background refresh coordination rules, especially around destructive mutation windows
- unsaved-exit policy for multi-step flows, including confirm-leave and draft recovery boundaries
- auth and permission drift handling, aligned with #73 and #74
- observability requirements for recovered, suppressed, and fallback paths

The second-wave seeds can stay behind the first safety wave:

- cross-tab or resume conflict handling with shared identifiers or revision checks
- partial-success display policy and contract vocabulary for incomplete completion states

## Exit criteria coverage

This catalog now provides:

- the main web accident patterns with explicit trigger, impact, and preferred safe outcome
- posture classification for all ten patterns
- explicit coverage across route/navigation, mutation, background fetch, auth/session, multi-step flow, and observability
- a primary-focus shortlist for design constraints before #22 follow-up implementation expands
- clear handoff boundaries to #73, #74, and #77
- concrete issue seeds for later implementation and design work