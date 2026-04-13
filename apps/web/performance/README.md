# Web Performance Baselines

This directory contains the first repository-owned performance snapshots for the web app.

## Commands

1. Start the parity stack with `just parity` from the repository root.
2. Install the local Chromium binary once with `pnpm --filter @focusbuddy/web measure:browser`.
3. Capture and save the baseline snapshots with `pnpm --filter @focusbuddy/web measure:baseline`.

The measurement script writes accepted snapshots to `apps/web/performance/baselines/` using schema version 1 from `docs/platform/performance-baseline-policy.md`.

The first automation lane captures direct browser `TTFB`, `FCP`, and `CLS`, compares `LCP` through Lighthouse, and records `INP` when available or `FID` when Chromium does not emit `INP` in local headless runs.

You can override the target URL and run count with these environment variables:

- `FOCUSBUDDY_WEB_BASELINE_BASE_URL`
- `FOCUSBUDDY_WEB_BASELINE_RUNS`