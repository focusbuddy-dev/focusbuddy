# Oxlint Config Package

This package provides the shared oxlint baselines for the FocusBuddy monorepo.

The shared base config is strict by default for hand-written application and package code.

Current repository-wide design rules include:

- prefer `undefined` over `null` in hand-written code
- forbid non-null assertions
- forbid loose equality around `null`
- forbid `any` in shared baseline code

Repository-root script and GitHub helper paths may use narrow overrides when tool-oriented code needs different tradeoffs.

Available configs:

- `base/oxlint.config.ts` for shared lint defaults
- `repository/oxlint.config.ts` for the repository root
- `api/oxlint.config.ts` for Node-oriented API code
- `web/oxlint.config.ts` for browser-oriented web code

Current consumers:

- `oxlint.config.ts` at the repository root
- `apps/api/oxlint.config.ts`
- `apps/web/oxlint.config.ts`

The shared oxlint baselines are written in TypeScript so the repository can keep lint configuration in code as it grows.
