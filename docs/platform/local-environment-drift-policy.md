# Local Environment Drift Policy

This document captures the output of issue #108.

Its purpose is to define the repository-level policy for preventing local environment drift from hiding runtime integration failures in FocusBuddy.

This policy is not Redis-specific. It exists to reduce the same class of incident where encryption, auth, protocol, timeout, or runtime-shape differences make local behavior look healthy while deployed behavior fails.

## Scope

This document defines:

- the purpose of the repository's fast versus parity validation lanes
- the must-match runtime categories that parity-oriented validation should preserve
- the differences that fast local development may tolerate and why
- the minimum verification points needed to catch dangerous drift early
- the follow-up guidance for docs, local tooling, and CI checks

This document does not define final production infrastructure, every parity check the repository may ever need, or a requirement to eliminate all local/runtime differences regardless of cost.

## Policy summary

FocusBuddy uses two local validation lanes on purpose.

- `fast compose` is the default implementation lane for day-to-day development
- `parity compose` is the narrower validation lane for runtime-shape confidence

The repository should accept a fast lane only when its differences are explicit, documented, and unlikely to hide the class of failures that matter for deployment confidence.

The repository should treat parity-oriented validation as the reference local lane for must-match runtime behavior.

## Must-match checklist

Parity-oriented validation should preserve or explicitly verify the following categories wherever practical.

### Security and transport

- whether encryption or TLS is required versus disabled
- certificate validation behavior when a real upstream requires it
- the auth and credential flow shape seen by the application
- protocol constraints that can change request or connection behavior

### Connection shape and addressing

- required connection URL shape and parameters
- hostnames and ports that clients are expected to resolve
- same-origin versus cross-origin assumptions that affect browser and API behavior
- proxy or forwarded-header assumptions that can change request handling

### Runtime and dependency behavior

- major runtime versions that can change library or protocol behavior
- major dependency versions for systems such as PostgreSQL or auth integrations when behavior differs materially
- container versus non-container assumptions that affect filesystem, networking, or startup behavior
- built-artifact startup versus watch-mode or dev-server startup

### Data and state behavior

- persistence versus ephemeral state expectations
- migration and schema expectations required at startup
- transactional or consistency assumptions that application behavior relies on

### Failure and readiness behavior

- timeout and retry behavior that changes failure surfaces
- startup readiness and health-check criteria
- integration error surfaces that differ between stubs, emulators, and deployed services

## Tolerated differences in the fast lane

The fast lane exists to optimize for implementation speed, so some differences are acceptable when they are explicit and documented.

The current tolerated differences are:

- development-oriented runtimes such as watch mode and dev servers
- local Docker PostgreSQL instead of the deployed database platform
- the local auth stub instead of the final deployed auth integration
- local bind mounts and related developer ergonomics that are specific to the dev container workflow

These differences are acceptable only because the repository also maintains a parity lane that exercises built runtimes and stricter startup behavior.

The fast lane must not silently redefine required configuration categories, hide startup failures that parity should catch, or blur the boundary between supported full-stack workflow and narrow host-side debugging.

## Minimum verification points

Before environment-sensitive work is considered safe, the repository should be able to answer these questions.

1. Does the application boot from built artifacts under the parity lane rather than only under dev runners?
2. Does the runtime still resolve required supporting services through the expected topology for that lane?
3. Do auth, API, and web all become healthy under the stricter startup path?
4. Are tracked configuration categories stable even when mode-specific derived values differ?
5. Is the remaining drift explicitly documented rather than accidental?

## Current repository coverage

Issue #108 is implemented across the following repository outputs.

- [local-execution-modes.md](./local-execution-modes.md) defines the supported execution lanes, the env contract, and the host-side auxiliary boundary
- [local-development.md](./local-development.md) documents the fast and parity entrypoints and the first parity checks contributors should run
- `just dev` and `just parity` provide separate day-to-day and parity-oriented local entrypoints
- the parity Compose overlay exercises built API and web runtimes and waits for health checks before reporting success

The current first parity checks are intentionally narrow.

- API boots from built output instead of the watch-oriented runner
- web boots from `next build` plus `next start` instead of `next dev`
- the Compose `DATABASE_URL` path remains explicit and must still reach PostgreSQL through the `postgres` hostname
- auth, API, and web must all report healthy startup in the parity lane

This is not a full production clone. It is the first repository-level guardrail against runtime-shape drift that development-only startup paths can hide.

## Follow-up guidance

### Docs

- update this policy whenever a new local or deployed integration introduces a new must-match category
- keep the drift policy, local execution modes note, and local development guide aligned when the supported lanes change
- document any intentionally tolerated fast-lane drift at the same time it is introduced

### Local tooling

- keep `just parity` focused on checks that expose runtime-shape drift rather than day-to-day convenience
- add parity checks when real auth, TLS, proxy, or managed-service assumptions become relevant
- avoid adding host-side shortcuts that look like the primary full-stack contract unless they provision the same runtime shape

### CI

- treat parity-oriented validation as the preferred place for future environment-sensitive smoke checks
- add targeted CI checks when a change affects must-match categories such as auth shape, startup readiness, protocol headers, or connection parameters
- keep fast static checks separate from parity-oriented runtime validation so contributors can see which kind of confidence each gate provides

## Follow-up issue seeds

Likely follow-up work includes:

- extending parity checks when the repository replaces the local auth stub with a more production-like auth path
- adding CI smoke coverage for parity-sensitive startup and health behavior when the runtime surface expands
- documenting additional must-match categories when HTTPS, proxies, or managed cloud integrations become part of the local/deployed contract

## Done-state coverage

This policy now makes explicit:

- why FocusBuddy distinguishes fast and parity validation lanes
- which runtime categories parity validation should preserve or verify
- which fast-lane differences are tolerated and why
- the minimum verification points used to catch environment drift early
- the follow-up guidance that keeps docs, tooling, and CI aligned as the runtime surface grows