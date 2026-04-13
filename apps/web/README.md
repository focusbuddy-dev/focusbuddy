# Web App Baseline

This workspace captures the first Next.js web baseline from issue #22.

## Included in this baseline

- a minimal Next.js app-router app under `src/app`
- shared TypeScript, oxlint, and Jest config consumption
- a generated API client wrapper backed by `@focusbuddy/api-contract`
- a Jest plus MSW test setup for web-side contract integration tests

## Notes

- this issue establishes the web baseline only; feature UI stays in follow-up work after issue #22
- issue #22 created the Next.js baseline, while issue #106 wires that baseline into the local Docker Compose `web` service
- the generated contract outputs remain outside git and are rebuilt locally or in CI through the workspace scripts
- issue #62 adds the first repository-owned web baseline measurement path under `apps/web/performance`

## Styling Baseline

- component-scoped styling should live in `.module.css` files under `src`
- `src/app/globals.css` is reserved for reset, design tokens, and page foundation styles only
- style changes should pass `pnpm --filter @focusbuddy/web lint` before merge
