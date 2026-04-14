# API Performance Baselines

This directory contains the first repository-owned performance snapshot and supporting config for the API app.

## Commands

1. Start the parity stack with `just parity` from the repository root.
2. Capture and save the baseline snapshot with `pnpm --filter @focusbuddy/api measure:baseline`.

Implementation notes for the baseline capture script live in `apps/api/scripts/measure-api-baseline/README.md`.

The baseline script writes accepted snapshots to `apps/api/performance/baselines/` using schema version 1 from `docs/platform/performance-baseline-policy.md`.

## Committed Baselines

The JSON files under `apps/api/performance/baselines/` are intentional repository-owned baseline snapshots, not temporary local artifacts.

- `api.health.get.json` is the accepted reference for the `/health` scenario on the parity runtime

These files are committed so later measurement runs can compare against a stable, reviewable reference in git. They are used as baseline evidence during implementation and review, not served by the runtime and not treated as production assets.

The first API baseline command is intentionally local-first in this issue. CI wiring, k6 execution, and PR summary posting stay in follow-up workflow work.

You can override the target URL, rerun count, and sequential request count with these environment variables:

- `FOCUSBUDDY_API_BASELINE_BASE_URL`
- `FOCUSBUDDY_API_BASELINE_RUNS`
- `FOCUSBUDDY_API_BASELINE_REQUESTS`