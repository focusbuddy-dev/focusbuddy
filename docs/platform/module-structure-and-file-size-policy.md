# Module Structure And File Size Policy

This document captures the output of issue #62.

Its purpose is to define a repository default for splitting hand-written code by responsibility, using directory-shaped modules where that improves readability, and treating per-file line count as a soft review signal rather than a hard enforcement rule.

## Scope

This document defines:

- the current default for splitting new hand-written code by responsibility
- when a directory with `index.ts` or `index.tsx` should be preferred over one growing file
- how the repository should treat per-file line count during implementation and review
- what kinds of splits are considered good architectural separation versus noisy fragmentation
- whether this guidance should become a hard lint or CI rule

This document does not define import-path aliases, function declaration style, module format strategy, or a mandatory refactor campaign for every existing large file.

## Decision summary

- new hand-written code should prefer responsibility-oriented modules over large mixed-purpose files
- when one feature naturally contains config parsing, runtime orchestration, summaries, types, or file IO as separate concerns, a directory module with an `index.ts` facade is the preferred default
- per-file line count should be treated as a soft limit and review signal, not a hard cap
- around 150 lines is a good default threshold for asking whether a file still represents one coherent concept
- a file may exceed that threshold when the code is still cohesive and splitting it would create lower-signal wrappers
- splits should be driven by responsibility boundaries, not by mechanical line-count shaving
- the repository should stay documentation-first for this rule and should not add strict lint or CI enforcement for file length today

## Default module-structure rule

For new hand-written code, the repository should prefer small modules with clear responsibility boundaries.

In practice, that means:

- if one file starts owning multiple kinds of behavior, split by responsibility before it turns into a mixed-purpose grab bag
- if a feature has a natural public entrypoint plus several internal concerns, prefer a feature directory with `index.ts` or `index.tsx` as the entrypoint
- keep the entrypoint thin so a reader can understand the feature flow quickly, then drop into narrower files for details
- name internal files after responsibilities such as `config`, `runtime`, `summary`, `types`, `io`, `schema`, or similarly concrete concepts

This is the preferred pattern for feature-local modules, repository scripts that have grown beyond a single concern, and app-level logic that would otherwise keep accumulating unrelated helpers in one file.

## Line-count guidance

The repository treats per-file line count as a loose design signal.

The practical rule is:

- use roughly 150 lines as a soft limit for hand-written files
- once a file moves materially past that range, review whether it still expresses one concept or has started mixing responsibilities
- do not split a file only to satisfy a number when the existing file is still cohesive and easier to scan as one unit
- do not defend a large file merely because it still compiles; if it now mixes orchestration, domain shaping, runtime execution, and serialization, it should probably be split

The goal is not numeric purity. The goal is keeping files readable enough that a reviewer can understand one concept at a time.

## What counts as a good split

A good split usually has these properties:

- each file owns one main reason to change
- the entrypoint mainly wires responsibilities together instead of containing all details itself
- names describe the role of the file rather than the implementation accident that created it
- moving between files reduces cognitive load instead of increasing it

Examples of good boundaries include:

- config parsing versus runtime execution
- browser capture versus summary aggregation
- schema or validation versus orchestration
- public facade versus internal helpers

A split is usually too granular when:

- multiple files exist only to forward one function each without adding a clearer boundary
- the reader must jump through many tiny wrappers just to follow one simple flow
- line-count reduction is the only reason the split happened

## Directory-module preference

When a feature has one public entrypoint and multiple internal responsibilities, prefer a directory-shaped module.

The default shape is:

- `index.ts` or `index.tsx` for the public entrypoint
- responsibility-specific sibling files for the internal implementation

This pattern is preferred because it:

- makes the public surface obvious
- keeps feature-local internals grouped together
- scales more cleanly than adding `feature-name-*.ts` files at the parent directory root
- gives follow-up changes an obvious place to land without turning one file into the permanent dumping ground

The recent `measure-web-baseline` layout is an example of the intended direction: one feature directory with a thin `index.ts` and separate files for config, runtime, summary, and types.

## Enforcement stance

This repository should keep this rule documentation-first for now.

That means:

- no hard maximum line-count rule in lint or CI
- no mandatory broad refactor campaign for older files based only on size
- reviewers may still ask for responsibility-based splitting when a file clearly exceeds the policy intent
- teams should use judgment rather than forcing suppressions or exception-heavy tooling around a soft design rule

The repository already gets more value from boundary, runtime, and verification rules than it would from strict style-only file-length enforcement.

## Review triggers

This document should be revisited when one of the following becomes true:

- repeated review churn shows that documentation-only guidance is not strong enough
- one workspace needs a narrower enforcement rule that can express useful boundaries without rewarding wrapper sprawl
- the repository wants a codemod or generator pattern that standardizes feature-directory structure for a specific surface

Until then, the practical rule is simple: split by responsibility, prefer a thin directory entrypoint for multi-part features, and treat file length as a soft signal instead of a hard gate.