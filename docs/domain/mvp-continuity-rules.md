# MVP Continuity Rules

This document captures the output of issue #38.

Its purpose is to define how FocusBuddy records target continuity through resume actions and how later correction should work in the MVP.

This document builds on [mvp-domain-model.md](mvp-domain-model.md).

## Scope

This document defines:

- what continuity means in the MVP
- what user action increases continuity
- what should be stored as source data
- what should be derived from source data
- how accidental resume actions can be corrected later

This document does not define daily streaks, ranking, or other gamification logic.

## Continuity principles

The MVP should treat continuity as target-based progress, not as a calendar streak.

- continuity is tied to a focus target
- continuity is not broken by time gaps between sessions
- continuity grows only when the user explicitly continues from previous work
- continuity must be correctable after accidental taps or later editing

This keeps continuity aligned with the product goal of returning to the same work over time.

## What counts as continuity

The first MVP should count continuity only when a user explicitly chooses the product action that means continue from previous work.

This means:

- starting a new session normally does not increase continuity
- starting a session from resume previous work does increase continuity
- continuity is measured per target, not globally across all user activity

## What continuity is not

The MVP should not treat these as the same thing as continuity:

- daily activity streaks
- total session count
- total focus time
- repeated work on the same target without an explicit resume action

These values may still be useful later, but they are not the source of truth for continuity.

## Source of truth

The source of truth should preserve the fact that a resume action happened.

The important fact is not only that a session exists, but that the session started as a continuation of earlier work on the same target.

The first MVP should preserve enough source data to answer these questions:

- which target was resumed
- which session was started from that resume action
- when the resume action happened
- whether that resume action is still considered valid after later correction

## Recommended storage direction

The first schema should use event-style source data for continuity instead of a hard-coded counter with no history.

That means the continuity count shown to users should be derived from stored resume facts.

The exact storage shape can be decided in issue #40, but the model should support one of these patterns:

- a dedicated resume event record, or
- session-level fields that preserve start mode and resume origin

Either way, the system should keep an auditable source for why continuity increased.

## Derived values

The following values should be derived rather than treated as the only source of truth:

- current continuity count for a target
- continuity count shown on a target summary or user-facing screen
- historical continuity totals used in reports or aggregates

This avoids locking the system into irreversible counters that cannot be corrected later.

## Correction rules

The MVP must support correction after accidental resume actions or later editing.

Examples:

- the user tapped resume by mistake
- the session should have been treated as a new start instead
- the session was edited later and no longer represents resumed work

### Correction principle

The system should support correction without losing the meaning of the original source records.

This means the data model should support at least one of these approaches:

- editing the resume source record directly
- invalidating the resume source record
- keeping a compensating record that cancels the original continuity effect

The exact mechanism is a schema decision for #40, but the domain rule is clear: continuity must remain correctable.

## Relationship between continuity and sessions

Continuity is created through a session start, but continuity is not the same thing as the session itself.

- a session is the durable record of focus work
- a resume fact explains why that session counts as continued work
- continuity is a derived interpretation over those resume facts for a target

This separation is important because not every session should increase continuity.

## Relationship between continuity and targets

Continuity belongs to the target-level work stream.

- one target can have many sessions
- some of those sessions may start from resume previous work
- only those resumed sessions contribute to target continuity

This means continuity is anchored to FocusTarget, even if the source facts are attached to sessions.

## Relationship between continuity and visibility

Continuity should be defined independently from public visibility.

- a private resumed session may still count for the owner's continuity
- any public display of continuity must respect the visibility rules defined in issue #37

This keeps ownership logic separate from public presentation logic.

## First API and schema implications

This document implies the following for later work:

- a session start needs a way to express whether it is a new start or a resume action
- the schema needs a way to preserve resume origin or resume status
- continuity shown to users should be derived from stored source data
- the schema must support later correction

This document does not force final field names or final table shapes.

## Suggested MVP interpretation

The simplest acceptable MVP interpretation is:

- a target has a continuity count
- that count increases only when the user chooses resume previous work
- the displayed count is computed from valid resume records for that target
- invalid or corrected resume records stop contributing to that count

This gives the product a clear and explainable continuity model.

## Hand-off to follow-up issues

### For #39

Any later public display that combines continuity with stamps or target summaries should keep continuity derived from valid source data rather than storing unrelated aggregate counters together.

### For #40

The next step is to translate these rules into schema decisions.

Questions that move to #40:

- whether resume is stored as its own model or as fields on FocusSession
- how correction is represented in persisted data
- whether continuity displays need cached values or can be computed directly in the MVP
- whether resume origin should point to a previous session, a target, or both