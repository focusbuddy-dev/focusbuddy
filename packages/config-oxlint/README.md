# Oxlint Config Package

This package provides the shared oxlint baselines for the FocusBuddy monorepo.

Available configs:

- `base.json` for shared lint defaults
- `repository.json` for the repository root
- `api.json` for Node-oriented API code
- `web.json` for browser-oriented web code

Current consumers:

- `.oxlintrc.json` at the repository root
- `apps/api/.oxlintrc.json`
- `apps/web/.oxlintrc.json`
