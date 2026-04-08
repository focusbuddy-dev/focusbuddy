# Web App Baseline

This workspace captures the first Next.js web baseline from issue #22.

## Included in this baseline

- a minimal Next.js app-router app under `src/app`
- shared TypeScript, oxlint, and Jest config consumption
- a generated API client wrapper backed by `@focusbuddy/api-contract`
- a Jest plus MSW test setup for web-side contract integration tests

## Commands

- `pnpm --filter @focusbuddy/web dev` builds the API contract outputs and starts the Next.js dev server
- `pnpm --filter @focusbuddy/web build` builds the contract outputs and runs `next build`
- `pnpm --filter @focusbuddy/web typecheck` rebuilds the contract outputs and runs the workspace TypeScript check
- `pnpm --filter @focusbuddy/web test` rebuilds the contract outputs and runs the Jest plus MSW baseline tests

## Notes

- this issue establishes the web baseline only; feature UI stays in follow-up work after issue #22
- the generated contract outputs remain outside git and are rebuilt locally or in CI through the workspace scripts
