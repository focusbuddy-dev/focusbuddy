# Web App Baseline

This workspace captures the first Next.js web baseline from issue #22.

## Included in this baseline

- a minimal Next.js app-router app under `src/app`
- shared TypeScript, oxlint, and Jest config consumption
- a generated API client wrapper backed by `@focusbuddy/api-contract`
- a Jest plus MSW test setup for web-side contract integration tests

## Commands

- `just dev` is the primary full-stack local workflow
- `pnpm --filter @focusbuddy/web dev` builds the API contract outputs and starts the Next.js dev server for web-only auxiliary work
- `pnpm --filter @focusbuddy/web build` builds the contract outputs and runs `next build`
- `pnpm --filter @focusbuddy/web lint` runs stylelint for web CSS plus the existing oxlint pass
- `pnpm --filter @focusbuddy/web typecheck` rebuilds the contract outputs and runs the workspace TypeScript check
- `pnpm --filter @focusbuddy/web test` rebuilds the contract outputs and runs the Jest plus MSW baseline tests
- `just dev` runs this baseline through the local Docker Compose workflow after the follow-up runtime integration from issue #106

## Notes

- this issue establishes the web baseline only; feature UI stays in follow-up work after issue #22
- issue #22 created the Next.js baseline, while issue #106 wires that baseline into the local Docker Compose `web` service
- the generated contract outputs remain outside git and are rebuilt locally or in CI through the workspace scripts

## Styling Baseline

- component-scoped styling should live in `.module.css` files under `src`
- `src/app/globals.css` is reserved for reset, design tokens, and page foundation styles only
- style changes should pass `pnpm --filter @focusbuddy/web lint` before merge
