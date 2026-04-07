# Jest Config Package

This package provides the shared Jest baselines for the FocusBuddy monorepo.

Available configs:

- `base.cjs` for shared defaults
- `api.cjs` for the Node-based API runtime
- `web.cjs` for the jsdom-based web runtime

Current consumers:

- `apps/api/jest.config.cjs`
- `apps/web/jest.config.cjs`
