# MVP Domain Model

This document captures the output of issue #36.

Its purpose is to define the first domain model for FocusBuddy before visibility rules, continuity rules, stamp rules, and Prisma schema design are finalized.

## Scope

This document focuses on:

- the first set of MVP domain concepts
- the classification of each concept
- the core relationships between those concepts
- ownership rules
- open questions that should move to follow-up issues

This document does not define final Prisma models or full field-level schema details.

## Classification

The main classification used here is:

- entity: an independent concept with identity and relationships
- attribute: data owned by another concept
- derived view: a concept that is shown to users but can be built from source data
- event: a recorded action or fact that happens at a point in time

| Candidate | Classification | Why it exists | First schema direction |
| --- | --- | --- | --- |
| User | entity | Owns targets and sessions, controls visibility, signs in with Firebase | separate model |
| FocusTarget | entity | Represents what the user works on across multiple sessions | separate model |
| FocusSession | entity | Represents one focus attempt with timing and visibility | separate model |
| Stamp | entity | Stores who reacted to which focus target; it may be rendered in that target's public summary when visible | separate model anchored to FocusTarget |
| PublicSummary | derived view | Represents the public-facing summary view for a focus target, including target-linked data such as stamps | start as target-driven public view, not a required separate model or stamp attachment point |
| Resume action | event | Records that a session started from previous work | event-style data, final storage shape decided later |
| Genre | attribute, later candidate entity | Classifies a target for browsing and filtering | start simple, likely enum or text field |
| Note | attribute, later candidate entity | Optional free text attached to a focus session | start as session-owned text |
| Completion flag | attribute | Stores whether the user decided the work was complete | start as session- or target-level attribute |

## Core entities

### User

The authenticated actor in the system.

Responsibilities:

- owns focus targets
- creates focus sessions
- chooses public or private visibility
- creates public summaries by explicit action
- receives value from public engagement around owned targets

Notes:

- the system should treat Firebase identity as authentication identity
- application-level user data should still exist separately from Firebase

### FocusTarget

The thing a user works on over time.

Examples:

- a book
- a YouTube video
- a Udemy course
- an Amazon listing
- a free-form target without a URL

Responsibilities:

- groups multiple focus sessions
- may have an optional genre
- may be chosen for a public summary
- may receive public stamps through its public summary view

Why it is separate from FocusSession:

- users can return to the same target many times
- summaries and continuity are anchored to the target, not to a single session

### FocusSession

One recorded focus attempt.

Responsibilities:

- stores timing and measured work duration
- stores public or private visibility
- may store an optional note
- may mark whether the user considered the work complete
- belongs to one user and one focus target

Why it is an entity:

- it is the smallest durable record of work
- later public views depend on the visibility of each session

### Stamp

The first public reaction model.

Responsibilities:

- stores a helpful reaction
- links a reacting actor to a focus target that may be shown through a public summary view
- supports future counting rules and duplicate-prevention rules

Why it is separate:

- a simple counter is not enough if the system needs ownership, deduplication, or removal rules later

## Derived view

### PublicSummary

PublicSummary is a domain concept, but it does not need to start as a fully separate stored model.

Current design direction:

- a target becomes publicly summarized only by explicit user choice
- the summary view should show only public sessions linked to that target
- if a session becomes private later, it should disappear from the public summary view

This means the summary content is derived from source data.

At the MVP stage, the source data is:

- target-level publication choice
- public sessions linked to the target
- optional note content attached to those sessions, but only when that note content is public under the applicable visibility rule
- public stamp records linked to that target

## Event

### Resume action

Continuity should not start as a hard-coded counter with no source history.

The important fact is that a user chose to continue from previous work.

Current design direction:

- continuity grows only when the user explicitly resumes previous work
- the system should allow later correction for accidental taps or editing mistakes
- the source of truth should preserve enough information to support correction

This may later become:

- a dedicated resume event model, or
- session fields that preserve resume origin and start mode

That storage decision belongs to later schema work.

## Attributes

The following concepts should start as attributes instead of separate entities:

- target title
- target URL
- target source type
- session note
- session visibility
- session completion decision
- simple genre classification

These may become separate entities later only if new behavior requires them.

## Core relationships

The first MVP relationship model is:

- one user owns many focus targets
- one user creates many focus sessions
- one focus target has many focus sessions
- one focus target may have one public summary state
- one focus target may have many stamps
- one focus session belongs to exactly one user
- one focus session belongs to exactly one focus target

The first ownership rule is simple:

- a target belongs to one user
- sessions under that target also belong to that user
- public visibility does not change ownership

## Ownership and visibility boundaries

Ownership and visibility are different concerns.

- ownership stays with the authenticated user who created the target and sessions
- visibility controls whether session content can appear in public views
- public summaries are based on target ownership plus explicit publication choice

This separation is important for later visibility rules in issue #37.

## First schema direction

The first schema should strongly consider separate models for:

- User
- FocusTarget
- FocusSession
- Stamp

The first schema should start simple for:

- Genre
- Note
- Completion flag

The first schema should avoid premature complexity for:

- strict target identity matching across users
- separate note history models
- advanced reaction types
- daily streak models

## Hand-off to follow-up issues

### For #37

The next step is to define visibility rules using the concepts above.

Questions that move to #37:

- which fields are visible when a session is public
- whether notes need their own public flag in addition to session visibility
- how target publication and session visibility interact in the public summary view

### For #38

The next step is to define continuity from resume actions.

See [mvp-continuity-rules.md](mvp-continuity-rules.md) for the follow-up design note.

Questions that move to #38:

- what exact source data proves a resume action happened
- how later correction should be represented in persisted data
- whether resume origin should point to a previous session, a target, or both

### For #39

The next step is to define stamps and summary aggregates.

Questions that move to #39:

- whether one actor can stamp the same target more than once
- whether unauthenticated stamp actors are allowed and how they are identified
- which values in the public summary should be derived live versus cached

### For #40

The next step is to convert this model into the first Prisma schema design.

Questions that move to #40:

- exact key strategy
- exact nullable and required field design
- exact index plan
- exact continuity field and relation design
- whether public summary needs its own persisted model in the first schema
