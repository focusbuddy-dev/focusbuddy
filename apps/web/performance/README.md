# Web Performance Baselines

This directory contains the first repository-owned performance snapshots and supporting config for the web app.

## Commands

1. Start the parity stack with `just parity` from the repository root.
2. Install the local Chromium binary once with `pnpm --filter @focusbuddy/web measure:browser`.
3. Capture and save the baseline snapshots with `pnpm --filter @focusbuddy/web measure:baseline`.
4. Run the first LHCI-compatible initial-load lane with `pnpm --filter @focusbuddy/web measure:lhci`.

Implementation notes for the baseline capture script live in `apps/web/scripts/measure-web-baseline/README.md`.

The baseline script writes accepted snapshots to `apps/web/performance/baselines/` using schema version 1 from `docs/platform/performance-baseline-policy.md`.

## Committed Baselines

The JSON files under `apps/web/performance/baselines/` are intentional repository-owned baseline snapshots, not temporary local artifacts.

- `web.home.initial-load.json` is the accepted reference for the initial-load scenario on `/`
- `web.home.details-navigation.json` is the accepted reference for the details-navigation scenario after the `Navigate to details demo` transition

These files are committed so later measurement runs can compare against a stable, reviewable reference in git. They are used as baseline evidence during implementation and review, not served by the runtime and not treated as production assets.

The first automation lane captures direct browser `TTFB`, `FCP`, and `CLS`, compares `LCP` through Lighthouse, and records `INP` when available or `FID` when Chromium only emits the first-input metric in local headless runs. When neither interaction Web Vital is emitted in this local automation environment, the saved navigation snapshot falls back to a custom `ROUTE_CHANGE_DURATION` metric so the scenario remains comparable.

The LHCI command is intentionally local-first in this issue. CI wiring, artifact publication, and PR summary posting stay in follow-up workflow work.

The LHCI wrapper checks the target URL before launch so host and port mistakes fail fast with a direct reachability error instead of a later Chrome interstitial.

Browser-side Web Vitals capture is disabled by default. Enable it only for measurement runs, and only in explicit measurement contexts such as parity, preview, or a dedicated benchmark environment.

You can override the target URL and run count with these environment variables:

- `FOCUSBUDDY_WEB_BASELINE_BASE_URL`
- `FOCUSBUDDY_WEB_BASELINE_RUNS`
- `NEXT_PUBLIC_FOCUSBUDDY_WEB_BASELINE_CAPTURE_ENABLED`
- `NEXT_PUBLIC_FOCUSBUDDY_WEB_BASELINE_CAPTURE_CONTEXT`

Valid capture contexts are `parity`, `preview`, and `dedicated`. `production` is intentionally unsupported for this baseline-capture path.

Inside the repository dev container, use `NEXT_PUBLIC_FOCUSBUDDY_WEB_BASELINE_CAPTURE_ENABLED=true NEXT_PUBLIC_FOCUSBUDDY_WEB_BASELINE_CAPTURE_CONTEXT=parity FOCUSBUDDY_WEB_BASELINE_BASE_URL=http://host.docker.internal:3000` when the parity stack is published on the Docker host. The LHCI command stays ESM-only by using a small `.mjs` wrapper that injects the runtime URL and Playwright Chromium path into the JSON LHCI config.