# Local Execution Modes

This document captures the output of issue #109.

Its purpose is to define the local execution lane policy for FocusBuddy, describe the currently implemented default path, and explain why host-side direct app startup is not the primary full-stack development path.

## Scope

This document defines:

- the current full-stack local development path and the planned parity-oriented path
- the role of host-side direct app startup as an auxiliary path
- the local env contract at the configuration-category level
- a short decision guide for choosing a mode

This document does not define detailed runtime implementation changes, final production deployment, or every low-level developer command.

## Execution lanes

FocusBuddy distinguishes two full-stack local execution lanes.

Today, `fast compose` is the implemented default lane.

`parity compose` is the planned production-oriented lane that this repository intends to add in follow-up work.

The repository needs both lanes because they optimize for different kinds of confidence.

- `fast compose` exists for routine feature work and fast feedback while still keeping the app and supporting services in one Compose-managed topology
- `parity compose` is needed because the fast lane can still hide failures behind dev servers, watch mode, or looser startup behavior
- the host-side path remains auxiliary because it requires separately started supporting services and therefore does not preserve the repository's default full-stack runtime shape

### `fast compose`

- is the default day-to-day local development path
- is started through the primary task runner entrypoint `just dev`
- runs the local stack through `docker compose`
- uses development-oriented runtimes such as watch mode or dev servers
- keeps supporting services and application processes in one explicit runtime topology

### `parity compose`

- is the planned production-oriented local validation path
- is expected to run through `docker compose`
- is intended to run built artifacts with stricter startup assumptions than the fast lane
- exists to catch drift that should also fail in deployed environments once implemented

## Auxiliary path

Host-side direct app startup remains available as an auxiliary escape hatch, not a first-class full-stack mode.

Examples include running `pnpm dev` from the repository root or starting `apps/api` and `apps/web` directly outside Compose.

This path is not documented as the default full-stack workflow because supporting services such as PostgreSQL and local auth must be provided separately. That changes the runtime shape from the Compose path and makes it easier to hide environment drift.

## Lane comparison

| Lane | Primary purpose | Runtime shape | Why it is not enough by itself |
| --- | --- | --- | --- |
| `fast compose` | day-to-day implementation speed | Compose-managed stack with development runtimes | can hide failures that only appear with built artifacts or stricter startup assumptions |
| `parity compose` | production-oriented local validation | planned Compose-managed stack with built artifacts and stricter startup | too heavy for routine editing and not yet implemented |
| host-side direct startup | narrow debugging escape hatch | web and api started from the dev container, with PostgreSQL and auth started separately | diverges from the repository's default full-stack topology |

## Execution lane diagram

```mermaid
flowchart TB
    subgraph FC[fast compose: implemented default lane]
        FC_ENTRY[just dev]
        FC_WEB[web dev server container]
        FC_API[api dev runtime container]
        FC_DB[(postgres container)]
        FC_AUTH[(auth stub container)]
        FC_ENTRY --> FC_WEB
        FC_ENTRY --> FC_API
        FC_ENTRY --> FC_DB
        FC_ENTRY --> FC_AUTH
        FC_WEB --> FC_API
        FC_API --> FC_DB
        FC_WEB --> FC_AUTH
        FC_API --> FC_AUTH
        FC_NOTE[fast feedback for feature work, but still uses dev-oriented runtimes]
    end

    FC --> GAP

    GAP[Need a second compose lane because dev servers and watch mode can hide failures that only appear with built artifacts or stricter startup]

    GAP --> PC

    subgraph PC[parity compose: planned validation lane]
        PC_ENTRY[planned parity compose entrypoint]
        PC_WEB[planned web built runtime container]
        PC_API[planned api built runtime container]
        PC_DB[(postgres container)]
        PC_AUTH[(planned auth runtime)]
        PC_ENTRY --> PC_WEB
        PC_ENTRY --> PC_API
        PC_ENTRY --> PC_DB
        PC_ENTRY --> PC_AUTH
        PC_WEB --> PC_API
        PC_API --> PC_DB
        PC_WEB --> PC_AUTH
        PC_API --> PC_AUTH
        PC_NOTE[production-oriented validation for startup, artifact, and runtime-shape failures]
    end

    PC --> HS

    subgraph HS[host-side direct startup: auxiliary path only]
        HS_ENTRY[pnpm dev or per-app dev command]
        subgraph HS_DEV[inside the dev container]
            HS_WEB[web process started directly]
            HS_API[api process started directly]
        end
        HS_DB[(postgres started separately as another container)]
        HS_AUTH[(auth started separately from its own script or container)]
        HS_ENTRY --> HS_WEB
        HS_ENTRY --> HS_API
        HS_API --> HS_DB
        HS_WEB --> HS_AUTH
        HS_API --> HS_AUTH
        HS_NOTE[web and api may run in the dev container, but postgres and auth must be added separately, so this path is not the default full-stack contract]
    end
```

The important difference is not only where the processes run.

- in `fast compose`, supporting services and application runtimes come up together in one Compose-managed lane
- in `parity compose`, the repository can validate failures that the fast lane may miss because of dev-oriented runtime behavior
- in the host-side path, web and api may run directly from the dev container, but PostgreSQL must still be started as another container and auth must still be started separately, which is why the repository does not treat that path as the default full-stack contract

The parity lane is shown as planned because the repository does not yet provide a dedicated parity Compose entrypoint.

## Env contract

The tracked local example file is [.env.example](../../.env.example).

FocusBuddy treats the tracked env file as the source of truth for developer-supplied configuration categories, not as a promise that every final runtime value is identical in every mode.

### Tracked input categories

The tracked local inputs currently cover categories such as:

- PostgreSQL database name, user, password, and exposed host port
- host port mappings for API, web, and auth
- local auth mode
- optional bind mount source override for Docker-from-dev-container workflows

These categories should stay aligned across the current fast lane and the planned parity lane.

### Mode-specific derived values

Some runtime values are derived differently per mode because network topology differs.

Examples:

- in Compose, API can reach PostgreSQL through the service hostname `postgres`
- in a host-side auxiliary path, API would need a separately provided PostgreSQL endpoint such as `localhost`
- browser-visible URLs may differ from container-internal service URLs even within the same mode

This means the repository should align required settings and naming across modes, while still allowing the final resolved runtime addresses to differ when the network boundary is different.

## Why host-side direct startup is auxiliary

Host-side direct app startup is useful for narrow debugging or single-app iteration, but it is not the primary full-stack path for FocusBuddy.

Reasons:

- it does not provision PostgreSQL, auth, or other supporting services by itself
- it requires the developer to assemble external dependencies separately even when web and api themselves are started from the dev container
- it increases the chance that env wiring and startup behavior drift away from the Compose stack
- it is easier to confuse static checks with runtime validation when the stack is not started as one explicit topology

Static checks such as lint, typecheck, and similar repository analysis can still run outside the Compose stack. GitHub Actions and the repository root scripts already provide that separate verification lane.

## Decision guide

Use `fast compose` when:

- you want the default local full-stack workflow
- you want the primary repository entrypoint, `just dev`
- you are doing day-to-day feature development
- you need the app and supporting services started together

Use `parity compose` after it is implemented when:

- you want a production-oriented local validation path
- you need to check startup assumptions that should also hold in deployed environments
- you want to catch drift hidden by development servers or looser startup behavior

Use host-side direct app startup only when:

- you are doing targeted debugging or narrow app-only work
- you intentionally accept that supporting services must be provided separately
- you do not treat that path as the repository's primary full-stack contract