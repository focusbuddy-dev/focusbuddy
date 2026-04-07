# MVP Visibility Rules

This document captures the output of issue #37.

Its purpose is to define how visibility works for focus sessions, notes, and public target summaries in the MVP.

This document builds on [mvp-domain-model.md](mvp-domain-model.md).

## Scope

This document defines:

- session visibility rules
- note visibility rules
- public summary creation rules
- how public sessions appear in public summaries
- what happens when session visibility changes later

This document does not define ranking, search, discovery, or AI-generated content.

## Visibility principles

The first MVP should use simple rules.

- ownership and visibility are separate
- users own their targets and sessions whether those records are public or private
- public views are derived from source data that passes the applicable visibility rules
- making data private later should remove it from public-facing derived views

## Session visibility

Each focus session has a visibility state.

The first MVP states are:

- private
- public

### Private session

A private session:

- belongs only to its owner in normal product use
- does not appear in public feeds
- does not appear in public target summaries
- does not contribute public note content to a public target summary

### Public session

A public session:

- may appear in public views
- may appear in a public target summary if the related target has its public summary enabled
- may contribute note content only when the note itself is visible under the note rules below

## Note visibility

Notes are optional and owned by a focus session.

The first MVP should treat note visibility as more restrictive than session visibility.

This means:

- a note can never be public if its session is private
- a public session does not automatically require its note content to be public
- note content appears in public views only when both session visibility and note visibility allow it

### First MVP rule

The first MVP should support an explicit note visibility decision when note content exists.

The practical rule is:

- if a session is private, the note is private
- if a session is public and the note is marked public, the note may appear in public views
- if a session is public and the note is not marked public, the session may still be public but the note content stays hidden

This keeps public work logs possible without forcing all session notes to become public.

## Public summary creation

A public summary is not created automatically.

The first MVP rule is:

- a user must explicitly choose to make a focus target public as a summary

This means a target can exist in three practical states:

- private target with only private sessions
- target with public sessions but no public summary
- target with a public summary that can show its public session history

The public summary is a derived view, not the source of truth.

## What appears in a public summary

When a target has a public summary, the public summary may show:

- target-level public metadata allowed by later schema and API design
- public sessions linked to that target
- public note content from those sessions when note visibility allows it
- stamp information linked to that target only when it is visible under the applicable stamp rules

The public summary must not show:

- private sessions
- note content from private sessions
- note content hidden by note visibility settings

## Relationship between sessions and summaries

Session visibility and summary visibility interact as follows.

### Public target summary plus public session

- the session may appear in the summary
- the session note may appear only if the note is public

### Public target summary plus private session

- the session does not appear in the summary
- its note content does not appear in the summary

### No public target summary plus public session

- the session may still be considered public session data for other public-facing views
- the target does not yet expose a public summary page

This keeps summary publication as an explicit user action.

## Visibility changes over time

The MVP must support later visibility changes.

### When a public session becomes private

The system should:

- remove the session from public summary views
- remove its public note content from public summary views
- exclude that session from public summary aggregates that are based on visible sessions

### When a private session becomes public

The system should:

- allow the session to appear in eligible public views
- allow its note content to appear only if note visibility also allows it
- include that session in public summary views when the related target has a public summary

### When a public summary is disabled

The system should:

- stop showing the target summary publicly
- stop exposing the target-level public summary view
- keep ownership and source session records unchanged

## Source-of-truth rules

The source of truth for visibility should stay close to the owned records.

- session visibility is decided at the session level
- note visibility is decided at the note level but cannot exceed session visibility
- target summary publication is decided at the target level

This keeps derived views rebuildable from source records.

## First API and schema implications

This document implies the following for later work:

- FocusSession needs a visibility field
- session-owned note data needs a visibility decision when note content exists
- FocusTarget needs a publication decision for its public summary
- public summary aggregates must be based only on visible source data

This document does not force final field names or final model shapes.

## Hand-off to follow-up issues

### For #38

Continuity should be counted only from resume actions, but any public continuity display must still respect the visibility rules above.

### For #39

Stamps belong to the public-facing target concept, but any aggregate display should remain consistent with target publication and visible summary state.

### For #40

The next step is to translate these rules into schema decisions.

Questions that move to #40:

- whether note visibility is stored as a separate field or modeled through the presence of a public note payload
- whether public summary publication is stored directly on FocusTarget or in a dedicated summary record
- whether public session feeds and public target summaries need separate cached views