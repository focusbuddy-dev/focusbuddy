# Performance Baseline Measurement Policy

This document captures the output of issue #60.

Its purpose is to fix the first repository-owned performance baseline scenarios, saved-result format, and minimum review thresholds before automation spreads across web and API follow-up work.

## Scope

This document defines:

- the first representative web and API scenarios to measure
- the first local measurement environment for comparable reruns
- the saved JSON format for accepted baseline snapshots
- the minimum regression-review thresholds to use before CI enforcement exists

This document does not define production telemetry export, repository-wide merge blocking, or feature-specific optimization work.

## Baseline measurement environment

The first accepted baseline must be captured against the parity runtime lane.

- start the stack with `just parity`
- measure the web app at `http://127.0.0.1:3000`
- measure the API app at `http://127.0.0.1:3001`
- use built runtimes, not watch-mode development servers
- use a clean browser profile with extensions disabled for browser-driven web measurements
- rerun the same scenario at least 3 times and compare medians for threshold review

This keeps the first baseline close to the repository's production-oriented local path without making CI orchestration a prerequisite for the decision itself.

## Representative scenarios

### Web

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

### API

The first API baseline owns one scenario.

#### `api.health.get`

- wait until `just parity` reports healthy services
- send 10 sequential `GET http://127.0.0.1:3001/health` requests
- record status consistency, median latency, p95 latency, and response size in bytes

For this scenario, one accepted baseline rerun still counts as one scenario sample. The 10 sequential requests belong to that rerun's internal measurement detail and should be recorded as a separate request count inside `measurements` rather than by changing the meaning of `sampleSize`.

The current API runtime only exposes `/health`, and that endpoint already exercises the application boot path plus PostgreSQL connectivity through Prisma. The first API baseline should therefore measure the real health path instead of inventing a placeholder feature endpoint.

## Metrics owned by the first baseline

### Web metrics

- Web Vitals: direct browser capture for `TTFB`, `FCP`, and `CLS`
- interaction metric: prefer `INP`, but accept `FID` in the first local automation lane when Chromium emits that metric instead
- Web Vitals metadata: `id`, `navigationType`, `rating`, and `value`
- Lighthouse: `performance` category score plus the selected audit values that explain score drift, including the first comparable `largest-contentful-paint` value
- Bundle size: the first-load JavaScript byte count for the `/` route in the parity build output

`web.home.initial-load` owns `TTFB`, `FCP`, and `CLS` as direct load metrics, while Lighthouse owns the first comparable `LCP` value in the automation lane. `web.home.details-navigation` owns the first interactive metric capture, preferring `INP` and falling back to `FID` when local automation does not emit `INP`.

### API metrics

- response status consistency across the sample set
- median latency in milliseconds
- p95 latency in milliseconds
- serialized response size in bytes

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

### Web Vitals

Regression review is required when any of these happens:

- any metric with a Web Vitals `rating` falls to `poor`
- any millisecond-based metric regresses by more than `max(100ms, 20%)` from the accepted baseline median
- `CLS` regresses by more than `0.02` from the accepted baseline median

When the first interactive baseline records `FID` instead of `INP`, apply the same review rule to that recorded interaction metric until the runtime emits `INP` consistently.

### Lighthouse

Regression review is required when any of these happens:

- the Lighthouse `performance` score falls by more than `0.05`
- any selected explanatory audit regresses by more than `20%`

The first selected explanatory audits should include at least `first-contentful-paint`, `largest-contentful-paint`, `speed-index`, `total-blocking-time`, and `cumulative-layout-shift`.

### Bundle size

Regression review is required when the first-load JavaScript size for `/` grows by more than `max(15360 bytes, 10%)` from the accepted baseline.

### API

Regression review is required when any of these happens:

- any `/health` sample returns a non-`200` response
- p95 latency regresses by more than `max(50ms, 20%)`
- response size grows by more than `10%` without an intentional contract change note

## Handoff to follow-up issues

### For #62

- implement the web measurement path for `web.home.initial-load` and `web.home.details-navigation`
- save accepted frontend baselines under `apps/web/performance/baselines/`
- make Lighthouse and bundle-size outputs conform to the schema in this document
- keep `LCP` comparison owned by Lighthouse in the first local automation lane and record `FID` when `INP` is not emitted

### For later API baseline automation

- add the first repository-owned script for `api.health.get`
- keep the saved JSON shape aligned with schema version 1 instead of inventing an API-only format
- move from review-only thresholds to automated enforcement only after repeatability is proven in CI
