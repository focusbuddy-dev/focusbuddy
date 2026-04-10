# API Contract Package

This package owns the OpenAPI source of truth for FocusBuddy and the generated contract outputs that other workspaces can consume.

## Contents

- `openapi/focusbuddy.openapi.yaml` is the source OpenAPI document
- `generated/types.ts` is generated from that spec with `openapi-typescript`
- `generated/client.ts` is generated from that spec with `openapi-zod-client`

## Commands

- `pnpm --filter @focusbuddy/api-contract generate` regenerates the contract outputs
- `pnpm --filter @focusbuddy/api-contract build` regenerates the contract outputs and emits build artifacts under `dist/generated`
- `pnpm --filter @focusbuddy/api-contract typecheck` regenerates outputs and type-checks the package surface

## Package exports

- `@focusbuddy/api-contract/openapi-path` exposes a filesystem path for Node-based tooling that needs to read the source OpenAPI document
- `@focusbuddy/api-contract/generated/types` exposes the built type contract from `dist/generated/types.*`
- `@focusbuddy/api-contract/generated/client` exposes the built client scaffold from `dist/generated/client.*`

## Compatibility contract

- the runtime contract for `./generated/client` and `./generated/types` is the built ESM artifact under `dist/generated`
- this package does not currently declare a dedicated CommonJS `require` condition or separate CommonJS build for those runtime subpaths
- `./openapi-path` remains a dedicated CommonJS helper entry for Node-side tooling that reads the source OpenAPI document

The current repository consumers import these subpaths through ESM-aware TypeScript and bundler flows. No in-repository consumer currently depends on a dedicated CommonJS export path for `@focusbuddy/api-contract/generated/*`, so dual-publish output is not part of this package contract today.

The generated client scaffold depends on `@zodios/core`, `axios`, and `zod`, and this package declares those runtime dependencies directly so consumers do not need to install them separately.

The generated source files in `generated/` remain build inputs. The package contract that consumers should rely on is the emitted artifact layout under `dist/`.

Generated artifacts stay out of git by default and should be rebuilt locally or in CI through the package scripts.
