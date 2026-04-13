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

The current API runtime only exposes `/health`, and that endpoint already exercises the application boot path plus PostgreSQL connectivity through Prisma. The first API baseline should therefore measure the real health path instead of inventing a placeholder feature endpoint.

## Metrics owned by the first baseline

### Web metrics

- Web Vitals: `TTFB`, `FCP`, `LCP`, `CLS`, and `INP`
- Web Vitals metadata: `id`, `navigationType`, `rating`, and `value`
- Lighthouse: `performance` category score plus the selected audit values that explain score drift
- Bundle size: the first-load JavaScript byte count for the `/` route in the parity build output

`web.home.initial-load` owns `TTFB`, `FCP`, `LCP`, and `CLS` as required load metrics. `web.home.details-navigation` owns the first interactive `INP` capture and any navigation-start markers needed to correlate the interaction.

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
- `environment` must describe enough runtime context to rerun the same scenario without guessing
- `summary` must contain the comparison-ready metric values used for regression review
- `measurements` may contain raw per-run detail such as individual Web Vitals, Lighthouse audit values, or HTTP timings
- one JSON file maps to one accepted scenario baseline

This keeps accepted baseline outputs diffable in git while still allowing raw detail to stay close to the summary numbers reviewers will actually compare.

## Minimum threshold rules

The first threshold policy is review-oriented, not CI-enforced.

Compare only runs that match both `scenarioId` and `runMode`. Threshold hits mean the baseline must be explained or intentionally replaced during review; they do not create a repository-wide hard merge gate yet.

### Web Vitals

Regression review is required when either of these happens:

- any metric with a Web Vitals `rating` falls to `poor`
- any millisecond-based metric regresses by more than `max(100ms, 20%)` from the accepted baseline median
- `CLS` regresses by more than `0.02` from the accepted baseline median

### Lighthouse

Regression review is required when either of these happens:

- the Lighthouse `performance` score falls by more than `0.05`
- any selected explanatory audit regresses by more than `20%`

The first selected explanatory audits should include at least `first-contentful-paint`, `largest-contentful-paint`, `speed-index`, `total-blocking-time`, and `cumulative-layout-shift`.

### Bundle size

Regression review is required when the first-load JavaScript size for `/` grows by more than `max(15360 bytes, 10%)` from the accepted baseline.

### API

Regression review is required when either of these happens:

- any `/health` sample returns a non-`200` response
- p95 latency regresses by more than `max(50ms, 20%)`
- response size grows by more than `10%` without an intentional contract change note

## Handoff to follow-up issues

### For #62

- implement the web measurement path for `web.home.initial-load` and `web.home.details-navigation`
- save accepted frontend baselines under `apps/web/performance/baselines/`
- make Lighthouse and bundle-size outputs conform to the schema in this document

### For later API baseline automation

- add the first repository-owned script for `api.health.get`
- keep the saved JSON shape aligned with schema version 1 instead of inventing an API-only format
- move from review-only thresholds to automated enforcement only after repeatability is proven in CI