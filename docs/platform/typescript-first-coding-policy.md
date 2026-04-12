# TypeScript-first Coding Policy

This document captures the output of issue #148.

Its purpose is to define TypeScript as the repository default for new hand-written application, package, and test code, while allowing JavaScript only as an explicit exception when the current tool or runtime contract makes JavaScript the lower-friction and better-verified choice.

## Scope

This document defines:

- the default language for new hand-written code in apps, packages, and tests
- what kinds of current constraints justify keeping a file in JavaScript
- the current JavaScript exception categories for this repository
- how existing JavaScript files should be treated over time
- where follow-up implementation and enforcement work should reference the rule

This document does not define the repository ESM versus CommonJS strategy, import-path style, function-declaration style, or a mandatory repository-wide migration schedule for all existing JavaScript files.

## Decision summary

- hand-written application code should default to `.ts` and `.tsx`
- hand-written package code should default to `.ts` and `.tsx`
- hand-written test code should default to TypeScript when the current runner and transform path already support it without adding one-off loader or build wiring
- JavaScript is allowed only when there is a concrete current tooling, runtime, loader, or compatibility reason to keep the file as JavaScript
- existing JavaScript files are documented exceptions, not an equal alternative baseline for new hand-written code
- new JavaScript files should stay rare and should point to the exact current constraint that justifies the exception
- existing JavaScript exceptions should be revisited when the file is already being touched for related work and the current execution path can be verified under TypeScript with reasonable churn
- this repository rule lives in `docs/platform/typescript-first-coding-policy.md` so future tooling, lint, and migration issues can reference one stable policy instead of re-deciding the language baseline

## Default language rule

### Application and package code

For new hand-written code under application and package source trees, the repository default is TypeScript.

That means:

- use `.ts` for non-React or non-JSX source files by default
- use `.tsx` where JSX is part of the hand-written source contract
- do not introduce new `.js` or `.jsx` files in app or package source trees merely because JavaScript would also run there
- do not treat a nearby JavaScript helper, script, or legacy test as permission to author new app or package code in JavaScript

Generated outputs are outside this policy's hand-written default. Generated code should follow the tool-specific contract that produces it.

### Test code

Test code should also default to TypeScript when the current runner path already supports it in a stable way.

For this repository, the practical rule is:

- prefer `.ts` or `.tsx` tests when the workspace already has an approved transform and execution path for that test class
- keep a test in JavaScript only when the current test runner or direct Node invocation would otherwise need disproportionate extra loader or compile wiring
- do not force a repository-wide test migration just to satisfy the baseline language preference

## What counts as a valid JavaScript exception

JavaScript is allowed only when the file has a concrete current reason such as one of the following:

- the file is executed directly by an external tool or runtime path that is already verified in JavaScript and not yet verified in TypeScript
- the file is a small repository automation or local-development helper where TypeScript would add extra compile or loader setup with little maintenance benefit
- the file is a direct Node-executed test or tiny test helper whose current execution model intentionally avoids a TypeScript transform
- the file belongs to a tool-owned config or hook entrypoint where the repository benefits more from a simple direct-execution contract than from TypeScript authoring for that path

These are exceptions, not a second default. A JavaScript file should be able to answer two questions clearly:

1. Why is JavaScript still needed for this exact current path?
2. What future verification or tooling change would make a TypeScript migration reasonable?

## Current repository exception categories

The current repository has a small set of JavaScript-by-exception areas.

| Category | Current paths | Why JavaScript remains allowed now | Current migration decision in issue #148 | Revisit when |
| --- | --- | --- | --- | --- |
| Tool-owned direct ESM config entrypoints | `prettier.config.mjs`, `stylelint.config.mjs`, `packages/config-prettier/index.mjs` | these files are consumed directly by tool entrypoints and already have a simple ESM execution contract without extra TypeScript loader wiring | keep as valid long-term JavaScript exceptions by default; do not target for proactive TypeScript migration | the exact tool invocation path is verified to accept TypeScript with clear repository benefit |
| GitHub hook and request-guard entrypoints | `.github/hooks/scripts/request-guard.mjs`, `.github/hooks/scripts/request-guard/*.mjs` | these scripts are direct Node-owned hook helpers where keeping execution simple matters more than authoring them in TypeScript today | keep as JavaScript for now; do not migrate unless the repository adopts one stable TypeScript hook execution contract | the repository adopts a verified TypeScript execution contract for hook scripts without adding brittle bootstrap overhead |
| Repository automation scripts | `scripts/check-workspace-boundaries.mjs`, `scripts/demo-commitlint.mjs`, `scripts/enforce-pnpm.mjs`, `scripts/verify-setup.mjs`, `scripts/workspace-task.mjs` | these are small direct-run repository scripts whose maintenance value currently comes from low-friction execution rather than TypeScript-specific authoring features | treat as selective migration candidates, not a blanket migration target; convert only when a script grows, shares typed logic, or the TypeScript path is already verified | the script grows enough, shares enough typed logic, or gains a verified TypeScript execution path that makes migration clearly worthwhile |
| Local-development helper scripts | `scripts/local-dev/*.mjs` | these helpers are lightweight local stubs and placeholder processes where direct execution is currently the simpler contract | keep as JavaScript for now; reconsider only if the local-dev stack standardizes a TypeScript runtime path | the local-dev stack gains a stable TypeScript runtime path that removes the current friction |
| Direct Node-executed tests | `test/*.mjs`, `packages/logger/test/logger.test.mjs`, `packages/api-contract/test/public-contract.test.mjs` | these tests currently rely on direct JavaScript execution paths, and the repository does not treat that as sufficient reason to widen TypeScript test transforms everywhere immediately | treat as eventual TypeScript candidates only after a stable runner path exists for that exact test surface; no immediate migration is required by this issue | the relevant test path gets a verified TypeScript runner or transform and the file is being touched for related work |

The presence of these exceptions does not change the baseline for new hand-written app, package, or test code elsewhere in the repository.

## Current migration conclusions

Issue #148 resolves the language-baseline question and also records the current migration posture for the known JavaScript exceptions so the repository does not need a second decision issue just to restate the same tradeoff.

The current conclusions are:

- direct tool-owned ESM config entrypoints are legitimate long-term JavaScript exceptions unless a concrete tool-path benefit for TypeScript is verified later
- GitHub hook helpers and lightweight local-development helpers should stay JavaScript until the repository has one stable TypeScript execution contract for those paths
- repository automation scripts are not approved for a broad conversion campaign, but an individual script may move to TypeScript when its maintenance needs justify that change
- direct Node-run tests are future TypeScript candidates only when the exact runner path is ready; the repository should not widen test transforms just to satisfy a style preference

In other words, this issue does not approve a repository-wide JavaScript cleanup campaign. It approves a TypeScript-first default while explicitly deciding that the current JavaScript exceptions are mostly intentional execution-path exceptions, with only selective future migration where the maintenance case is real.

## Migration stance for existing JavaScript files

The repository should treat current JavaScript files as explicit exceptions that stay on a short leash.

That means:

- no broad style-only migration is required immediately
- existing JavaScript files may remain in place while their current execution path still makes JavaScript the simpler verified contract
- when an exception file is touched for related work, the change should re-evaluate whether TypeScript is now practical for that exact path
- if the blocker still exists, the file may stay JavaScript without apology, because the exception is documented and intentional
- new feature work should not choose JavaScript just to match an older exception file nearby

This keeps the policy practical: TypeScript is the repository default, while JavaScript remains available for narrow cases that are still genuinely tool-driven.

## Relationship to adjacent policies

This policy is intentionally separate from neighboring repository decisions:

- `docs/platform/esm-migration-strategy.md` defines module format expectations such as ESM-first and file-level CommonJS exceptions
- `docs/platform/import-and-function-style-policy.md` defines app-local import and function-style defaults
- `docs/platform/shared-tooling.md` defines the shared tooling baseline and should reference this document rather than restating the language decision ad hoc

This separation matters because language choice is not the same decision as module format or lint style.

## Review triggers

This document should be revisited when one of the following becomes true:

- a current JavaScript exception path gains a verified TypeScript execution contract with low enough churn to justify migration
- the repository standardizes a stronger TypeScript test execution path for the direct Node-run test areas that still use `.mjs`
- a future enforcement issue can show that narrow lint or repository checks would prevent real drift without forcing exception-heavy configuration

Until then, the repository should keep the simple rule: TypeScript by default for hand-written code, JavaScript only by explicit and concrete exception.