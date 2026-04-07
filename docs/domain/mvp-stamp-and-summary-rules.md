# MVP Stamp and Summary Rules

This document captures the output of issue #39.

Its purpose is to define the first helpful stamp model and the first public summary aggregate rules for FocusBuddy.

This document builds on [mvp-domain-model.md](mvp-domain-model.md), [mvp-visibility-rules.md](mvp-visibility-rules.md), and [mvp-continuity-rules.md](mvp-continuity-rules.md).

## Scope

This document defines:

- the first stamp type
- which concept receives stamps
- how duplicate stamping should work in the MVP
- which public summary values are derived from public sessions
- how summary values change when public session visibility changes

This document does not define paid reactions, reputation scoring, ranking, or monetization features.

## Stamp principles

The first MVP should keep reactions simple.

- there is only one stamp type: helpful
- stamps belong to the target-level public concept, not to individual sessions
- stamp counts shown in public views should be derived from valid stamp records
- stamp rules should be simple enough to explain to users and easy to correct later

## What receives a stamp

The underlying anchor for a stamp is FocusTarget.

This means:

- a stamp is attached to a target
- that stamp may be rendered in the target's public summary view
- a stamp is not attached to a single focus session

This keeps stamp behavior stable even when the target has many sessions over time.

## Stamp actor model

The MVP should allow helpful stamps from the people who view public target summaries.

This includes:

- authenticated users
- unauthenticated visitors, if the product exposes public target summaries to them

The exact actor identity mechanism can be finalized in issue #40, but the domain rule should support identifying whether two stamp attempts came from the same actor for the same target.

## Duplicate stamp rule

The first MVP should use one effective helpful stamp per actor per target.

This means:

- the same actor should not increase the helpful count multiple times for the same target at the same time
- a repeated stamp attempt from the same actor should be treated as a no-op or an update to the existing stamp state

This rule keeps the public summary count meaningful and reduces accidental inflation.

## Minimum stamp source data

The first schema should preserve enough stamp source data to answer these questions:

- which actor created the stamp
- which target received the stamp
- which stamp type was used
- whether the stamp is currently effective
- when the stamp was created or last changed

This supports correct counting and future correction if needed.

## Public summary aggregate principles

The public summary is a derived view.

Its aggregate values should be based only on source data that is currently visible and valid.

This means:

- public session-based values come only from sessions that are currently public
- note-derived public content comes only from notes that are public under the applicable visibility rules
- helpful stamp counts come only from effective helpful stamps linked to the target

## First public summary aggregate set

The first MVP summary should strongly consider these target-level aggregate values:

- public session count
- total public focus duration
- last public session timestamp
- helpful stamp count

These values are enough to support a useful public summary without creating a large reporting model too early.

## What is derived from public sessions

The following values should be derived from public sessions rather than treated as their own source of truth:

- how many public sessions are linked to the target
- how much public focus time is linked to the target
- which public session is the latest visible one

This keeps summary data consistent with later visibility changes.

## What changes when session visibility changes

The summary must react to visibility changes.

### When a private session becomes public

The system should:

- include the session in public session count
- add its duration to total public focus duration
- update the latest public session timestamp if needed
- include its note content only when the note is also public

### When a public session becomes private

The system should:

- remove the session from public session count
- remove its duration from total public focus duration
- recompute the latest public session timestamp if that session was the latest one
- remove its note content from public summary views

## Relationship between stamps and summary visibility

Stamp display depends on the target's public summary state.

- stamps are anchored to the target
- helpful stamp totals are only shown when the target's public summary is enabled
- disabling the public summary hides the public stamp display but does not need to destroy the underlying stamp source data

This keeps public presentation separate from underlying records.

## Source of truth and caching

The source of truth for public summary aggregates should remain the underlying records.

- sessions are the source for session-based aggregates
- stamps are the source for helpful stamp counts
- the public summary view is derived from those records

The MVP may later choose to cache aggregate values for performance, but cached values must remain rebuildable from the source of truth.

## Relationship to continuity

Continuity should not be mixed into the helpful stamp model.

- continuity describes resumed work over time
- helpful stamps describe audience reaction to a target's public summary

These concepts may be shown together in the future, but they should remain separate in the domain model.

## First API and schema implications

This document implies the following for later work:

- Stamp needs a target anchor
- Stamp needs actor identity and effective-state handling
- public summary aggregates must be derived from visible public sessions and effective helpful stamps
- the schema should support recomputing public summary aggregates after visibility changes

This document does not force final field names, final actor identification fields, or final cache strategy.

## Hand-off to follow-up issues

### For #40

The next step is to translate these rules into schema decisions.

Questions that move to #40:

- how authenticated and unauthenticated stamp actors are represented in persisted data
- whether duplicate stamps are prevented by a unique constraint, an effective-state flag, or both
- whether helpful stamp counts are always computed live or cached for read performance
- which summary aggregate fields should remain derived only versus persisted as cache fields
