# Jest Config Package

This package provides the shared Jest baselines for the FocusBuddy monorepo.

Available configs:

- `base.ts` for shared defaults
- `api.ts` for the Node-based API runtime
- `web.ts` for the jsdom-based web runtime

Current consumers:

- `apps/api/jest.config.ts`
- `apps/web/jest.config.ts`

Typing rule:

- `@focusbuddy/config-jest` owns the Jest config type contract for the repo
- app-level Jest config files should use `defineJestConfig` from this package instead of importing `@jest/types` directly
- this keeps Jest config typing deterministic without making each app workspace own the low-level Jest type package

The repository uses `ts-node` to load TypeScript-based Jest config files.

The shared Jest baselines do not require `src` or `test` directories yet. Follow-up app issues can add tighter roots when real source trees exist.

The shared Jest baselines do not claim TypeScript test execution yet. Follow-up app issues should add a real TypeScript transform before `ts` or `tsx` test files are enabled.
