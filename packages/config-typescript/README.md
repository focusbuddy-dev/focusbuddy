# TypeScript Config Package

This package provides the shared TypeScript baselines for the FocusBuddy monorepo.

Available configs:

- `base.json` for strict shared defaults
- `api.json` for Node-oriented API code
- `web.json` for browser and bundler-oriented web code without shared Node globals

Current consumers:

- `apps/api/tsconfig.json`
- `apps/web/tsconfig.json`
