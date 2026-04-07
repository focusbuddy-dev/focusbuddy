# API Contract Package

This package owns the OpenAPI source of truth for FocusBuddy and the generated contract outputs that other workspaces can consume.

## Contents

- `openapi/focusbuddy.openapi.yaml` is the source OpenAPI document
- `generated/types.ts` is generated from that spec with `openapi-typescript`
- `generated/client.ts` is generated from that spec with `openapi-zod-client`

## Commands

- `pnpm --filter @focusbuddy/api-contract generate` regenerates the contract outputs
- `pnpm --filter @focusbuddy/api-contract build` runs the same generation flow for Turbo build dependencies
- `pnpm --filter @focusbuddy/api-contract typecheck` regenerates outputs and type-checks the package surface

## Package exports

- `@focusbuddy/api-contract/openapi` exposes the source OpenAPI document
- `@focusbuddy/api-contract/generated/types` exposes generated contract types
- `@focusbuddy/api-contract/generated/client` exposes generated Zod schemas and the typed client scaffold

Generated artifacts stay out of git by default and should be rebuilt locally or in CI through the package scripts.
