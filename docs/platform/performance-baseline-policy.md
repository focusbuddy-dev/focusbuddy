# Performance Baseline Measurement Policy

This document captures the output of issue #60.

Its purpose is to define the first repository-owned performance policy in a way that makes the roles of web and API obviously different, keeps accepted baselines comparable in git, and gives follow-up automation a minimal adoption path.

## Why this exists

Performance work in this repository is not primarily about chasing the highest synthetic score. It exists to shorten the time between a harmful change landing and the moment that change is noticed, understood, and fixed.

For a solo-maintained product, that means the policy must optimize for these outcomes:

- catch regressions before they turn into user-visible pain or incident-like behavior
- separate signal from noise so performance checks do not become a manual ritual on every PR
- keep the evidence close to the code review so regressions are easier to explain and revert
- introduce automation in the smallest order that improves detection speed without creating a new maintenance burden

That is why this policy deliberately splits web and API into different operational roles instead of treating them as one generic performance lane.

## Scope

This document defines:

- the role split between web and API performance checks
- the execution split between local accepted baseline capture and CI regression checks
- the first representative scenarios to measure
- the local parity environment used for comparable reruns
- the saved JSON format for accepted baseline snapshots
- the first review thresholds before CI enforcement becomes mature
- the minimum tool-adoption roadmap, assuming LHCI for web and k6 for API

This document does not define production telemetry export, repository-wide hard merge blocking, or full historical monitoring infrastructure.

## Role split at a glance

| Area | Main purpose | Primary failure to catch early | Primary tool direction | Main review output |
| --- | --- | --- | --- | --- |
| Web | prevent user-experience regressions on real page loads and navigations | slower paint, layout instability, worse interaction feel, bundle drift | LHCI for initial-load, custom capture only where LHCI does not cover the scenario well | PR-level baseline comparison and explanatory audits |
| API | detect response-quality regressions before they become reliability or latency incidents | slower responses, unstable status codes, heavier payloads, boot-path drift | k6 for repeatable HTTP scenario execution and threshold evaluation | PR-level latency and status summary for owned endpoints |

The important distinction is operational.

- Web performance is a UX regression policy.
- API performance is a service-response quality policy.

They use different tools because they are trying to surface different kinds of failure.

## Execution model

### Local accepted baseline capture

The first accepted baseline must be captured against the parity runtime lane.

- start the stack with `just parity`
- measure the web app at `http://127.0.0.1:3000`
- measure the API app at `http://127.0.0.1:3001`
- use built runtimes, not watch-mode development servers
- use a clean browser profile with extensions disabled for browser-driven web measurements
- rerun the same scenario at least 3 times and compare medians for threshold review

This keeps the first baseline close to the repository's production-oriented local path without making CI orchestration a prerequisite for the initial policy decision.

### CI regression execution

CI should treat runtime startup and measurement as separate steps.

- start the target runtime first
- wait for health before measurement starts
- run the measurement tool against the already-running service URL
- tear the runtime down after measurement completes

For this repository, that means `just parity` is the clearest first setup step when the goal is a full-stack comparable CI lane. LHCI and k6 then run against the resulting URLs. They do not replace the stack startup step.

In other words, LHCI in CI is not "run `just parity` inside LHCI". The workflow should start parity first, then run LHCI against `http://127.0.0.1:3000`. The same separation applies to k6 for `http://127.0.0.1:3001`.

If a faster web-only CI lane is added later, it may use LHCI's own server startup support for the web app alone. That must be treated as a separate run mode from the full-stack parity lane until the repository explicitly adopts it as the new comparison reference.

### Database handling

Database preparation is part of runtime setup, not part of LHCI or k6 themselves.

For the current first API scenario, `api.health.get`, the owned check only requires PostgreSQL reachability. The current `/health` handler executes `SELECT 1`, so an empty PostgreSQL instance started by parity is acceptable for this specific scenario. No schema migration or seed step is required to make that health check meaningful today.

That exemption is specific to `api.health.get`. It should not be generalized to later API performance scenarios.

When a future API scenario touches Prisma-managed tables or depends on row shape, row count, or relational joins, the workflow must add an explicit database preparation step before measurement:

- create or reset the database to a known state for the run mode
- apply the repository-approved schema bootstrap step before the app is measured
- seed deterministic fixture data only when the scenario depends on specific records or cardinality
- start measurement only after schema and fixture preparation completes

Once repository-owned migrations exist for those scenarios, CI should prefer a migration-based bootstrap such as `prisma migrate deploy` over ad hoc schema setup. Until then, any temporary bootstrap step must be documented as a bootstrap-only choice for comparability, not as the long-term contract.

The important operational rule is that LHCI and k6 measure an already-prepared runtime. They are not the mechanism that defines database state.

## Web policy

### Role

The web lane exists to answer one question quickly: did this change make the user-facing experience of the measured route meaningfully worse?

The owned signal is not backend throughput in isolation. The owned signal is what the browser and the user feel on the measured route.

### Owned scenarios

The first web baseline owns two scenarios.

#### `web.home.initial-load`

- start from a fresh browser profile with cleared storage
- open `http://127.0.0.1:3000/`
- wait until the baseline page hero and logging demo are visible
- capture load-oriented Web Vitals from that visit
- run Lighthouse against the same URL under the same parity conditions

This is the repository-owned baseline for first-view performance on the current Next.js app.

#### `web.home.details-navigation`

- begin from the loaded home page in the same clean session
- click the `Navigate to details demo` control
- wait until the URL becomes `/?view=details` and the client logging status returns to idle
- capture interaction-oriented Web Vitals for that navigation step

This keeps the first interactive baseline tied to a real, already-implemented route-state transition instead of an invented synthetic flow.

### Owned metrics

- direct browser capture for `TTFB`, `FCP`, and `CLS`
- interaction metric: prefer `INP`, but accept `FID` in the first local automation lane when Chromium emits that metric instead
- Web Vitals metadata: `id`, `navigationType`, `rating`, and `value`
- Lighthouse `performance` score and the selected audits that explain score drift, including the first comparable `largest-contentful-paint` value
- first-load JavaScript byte count for the `/` route in the parity build output

`web.home.initial-load` owns `TTFB`, `FCP`, and `CLS` as direct load metrics, while Lighthouse owns the first comparable `LCP` value in the automation lane. `web.home.details-navigation` owns the first interactive metric capture, preferring `INP` and falling back to `FID` when local automation does not emit `INP`.

### Tool ownership by case

| Case | Goal | Primary tool | Runtime expectation | Notes |
| --- | --- | --- | --- | --- |
| `web.home.initial-load` local accepted baseline capture | refresh the repository-owned comparison reference | temporary local browser plus Lighthouse capture under parity | full-stack parity | bootstrap path until the CI lane becomes the stable source of truth |
| `web.home.initial-load` PR regression check in CI | detect initial-load regressions on review | LHCI | start runtime first, then measure `http://127.0.0.1:3000` | the first comparable CI lane should prefer parity startup as a workflow step |
| `web.home.details-navigation` route-transition check | detect regressions in app navigation behavior | narrow custom capture or Playwright-assisted browser flow | start runtime first, then drive the navigation scenario | this scenario is not owned by LHCI unless the repository later decides otherwise |

### Why LHCI is the primary tool direction

LHCI is the intended primary tool for the web initial-load lane because it already solves the parts that matter most for fast regression detection on PRs:

- repeatable Lighthouse collection under CI
- assertion and budget support
- PR-visible results
- optional historical storage later without redefining the measurement model

Custom browser capture still has a place for route-transition metrics that LHCI does not represent cleanly, but that capture should stay narrow and scenario-specific instead of becoming a second full platform.

## API policy

### Role

The API lane exists to answer a different question: did this change make a repository-owned request path slower, less stable, or heavier in a way that could become an operational problem?

The owned signal is not browser UX. The owned signal is response quality on a real endpoint that already exercises important runtime dependencies.

### Owned scenario

The first API baseline owns one scenario.

#### `api.health.get`

- wait until `just parity` reports healthy services
- send 10 sequential `GET http://127.0.0.1:3001/health` requests
- record status consistency, median latency, p95 latency, and response size in bytes

For this scenario, one accepted baseline rerun still counts as one scenario sample. The 10 sequential requests belong to that rerun's internal measurement detail and should be recorded as a separate request count inside `measurements` rather than by changing the meaning of `sampleSize`.

The current API runtime only exposes `/health`, and that endpoint already exercises the application boot path plus PostgreSQL connectivity through Prisma. The first API baseline should therefore measure the real health path instead of inventing a placeholder feature endpoint.

### Owned metrics

- response status consistency across the sample set
- median latency in milliseconds
- p95 latency in milliseconds
- serialized response size in bytes

### Tool ownership by case

| Case | Goal | Primary tool | Runtime expectation | Notes |
| --- | --- | --- | --- | --- |
| `api.health.get` local accepted baseline capture | refresh the repository-owned comparison reference | the same scenario definition used for automation, executed against parity | full-stack parity | keep the saved output aligned with schema version 1 |
| `api.health.get` PR regression check in CI | detect endpoint latency or status drift during review | k6 | start runtime first, then measure `http://127.0.0.1:3001/health` | parity startup is the clearest first lane while only `/health` is owned; empty DB is acceptable because `/health` only checks connectivity |

### Why k6 is the primary tool direction

k6 is the intended primary tool for the API lane because it fits the job that this policy is actually trying to do:

- run repeatable HTTP scenarios with explicit thresholds
- produce clear latency and status summaries in CI
- scale from simple PR reruns to later scheduled monitoring without replacing the scenario language
- keep API performance discussion centered on endpoint behavior instead of browser-centric metrics

This makes k6 a better default direction for API response-quality checks than trying to extend LHCI beyond its natural browser-first scope.

## Saved result format

Accepted baseline snapshots must be committed as JSON under an app-owned `performance/baselines` directory.

- web baseline snapshots live under `apps/web/performance/baselines/`
- API baseline snapshots live under `apps/api/performance/baselines/`

Each accepted snapshot must use schema version 1 and keep the top-level shape stable:

```json
{
  "schemaVersion": 1,
  "app": "web",
  "scenarioId": "web.home.initial-load",
  "runMode": "local-parity",
  "capturedAt": "2026-04-13T00:00:00.000Z",
  "sampleSize": 3,
  "environment": {
    "runtime": "parity",
    "baseUrl": "http://127.0.0.1:3000",
    "browser": "chromium"
  },
  "summary": {},
  "measurements": {}
}
```

Required rules for this format:

- `schemaVersion`, `app`, `scenarioId`, `runMode`, `capturedAt`, and `sampleSize` are mandatory for every saved snapshot
- `sampleSize` always means the number of full scenario reruns aggregated into the saved summary
- `environment` must describe enough runtime context to rerun the same scenario without guessing
- `summary` must contain the comparison-ready metric values used for regression review
- `measurements` may contain raw per-run detail such as individual Web Vitals, Lighthouse audit values, HTTP timings, and scenario-internal counts such as `requestCount`
- one JSON file maps to one accepted scenario baseline

This keeps accepted baseline outputs diffable in git while still allowing raw detail to stay close to the summary numbers reviewers will actually compare.

## Accepted baseline lifecycle

An accepted baseline is the repository-owned comparison reference for a scenario and run mode. It is not a feature acceptance criterion and it is not a permanent performance promise. Its job is to give later measurements a stable point of comparison.

Do not replace an accepted baseline on every measurement run. Replace it only when one of these is true:

- the scenario is being accepted for the first time
- an intentional product or architecture change shifts the expected steady-state performance envelope
- a dependency, framework, build, or runtime upgrade intentionally changes the expected baseline
- the measurement lane itself changes enough that older results are no longer comparable

Do not replace an accepted baseline when the measurement shows an unexplained regression or when the team still expects to optimize further before adopting the new number.

When a PR replaces an accepted baseline, that same PR must include:

- the regenerated baseline JSON for the affected scenario
- a short note explaining why the new result is being adopted
- an explicit statement that the change is intentional, accepted, or required by the new runtime lane

This keeps accepted baselines stable enough to be useful while still allowing intentional platform shifts to become the new comparison point.

## When to measure

Do not require baseline measurement for every pull request. Measure only when a PR is likely to change the owned scenario in a way that can materially affect performance, or when a reviewer explicitly asks for a rerun.

Typical web PRs that should rerun the baseline include:

- changes to the render path, data fetching, caching, prefetching, or navigation behavior used by the measured route
- dependency or framework updates that can affect bundle size, hydration, routing, or browser runtime behavior
- changes to assets, styling, fonts, scripts, or layout on the measured route that can affect paint, layout shift, or interaction timing
- changes to build configuration, chunking, or runtime flags that can affect the parity output

Typical API PRs that should rerun the baseline include:

- changes to the `/health` path, Prisma boot path, database connectivity, or startup work that the health check exercises
- dependency or runtime changes that can affect request latency or response size on the measured path

PRs that usually do not need reruns include documentation-only changes, test-only changes, copy edits, and refactors that do not change shipped runtime behavior for the owned scenario.

## Minimum threshold rules

The first threshold policy is review-oriented, not CI-enforced.

Compare only runs that match both `scenarioId` and `runMode`. Threshold hits mean the baseline must be explained or intentionally replaced during review; they do not create a repository-wide hard merge gate yet.

### Web thresholds

Regression review is required when any of these happens:

- any metric with a Web Vitals `rating` falls to `poor`
- any millisecond-based metric regresses by more than `max(100ms, 20%)` from the accepted baseline median
- `CLS` regresses by more than `0.02` from the accepted baseline median
- the Lighthouse `performance` score falls by more than `0.05`
- any selected explanatory audit regresses by more than `20%`
- the first-load JavaScript size for `/` grows by more than `max(15360 bytes, 10%)` from the accepted baseline

The first selected explanatory audits should include at least `first-contentful-paint`, `largest-contentful-paint`, `speed-index`, `total-blocking-time`, and `cumulative-layout-shift`.

When the first interactive baseline records `FID` instead of `INP`, apply the same review rule to that recorded interaction metric until the runtime emits `INP` consistently.

### API thresholds

Regression review is required when any of these happens:

- any `/health` sample returns a non-`200` response
- p95 latency regresses by more than `max(50ms, 20%)`
- response size grows by more than `10%` without an intentional contract change note

## Minimal adoption roadmap

The roadmap is intentionally small. Each step should improve detection speed or review clarity on its own.

### Web roadmap: LHCI-centered

1. Keep local parity capture only as the bootstrap path for accepted baseline refresh.
2. Add an on-demand CI workflow that starts parity, then runs LHCI for `web.home.initial-load`, then publishes a PR-visible summary.
3. Keep `web.home.details-navigation` on the narrow custom path until the repository decides on a better standard tool for route transitions.
4. Add stronger assertions or history storage only after the LHCI lane proves repeatable enough to trust.

### API roadmap: k6-centered

1. Add the first repository-owned k6 scenario for `api.health.get`, aligned with schema version 1 summary fields.
2. Add an on-demand CI workflow that starts parity, then runs the k6 scenario, then posts latency and status results into PR review.
3. Expand beyond `/health` only after the first lane is stable and useful in review.
4. Add scheduled runs or longer-term history only after the PR-triggered lane has shown real debugging value.

This ordering keeps the first automation focused on review-time detection instead of jumping immediately to full monitoring infrastructure.

## Follow-up issue split

This document intentionally stops at policy. Implementation should restart from fresh follow-up issues instead of inheriting the older custom-measurement branch structure.

### Web follow-up issue

- adopt LHCI as the default implementation path for `web.home.initial-load`
- publish PR-visible summaries from an on-demand CI workflow before adding stronger gates
- keep `web.home.details-navigation` separate from the initial-load lane and only retain custom capture if the route-transition scenario still needs it after LHCI adoption

### API follow-up issue

- add the first repository-owned k6 scenario for `api.health.get`
- keep the saved JSON shape aligned with schema version 1 instead of inventing an API-only format
- publish latency and status summaries from an on-demand CI workflow before adding stronger gates
- expand beyond `/health` only after the first lane proves useful in review