# MVP Prisma Schema Design

This document captures the output of issue #40.

Its purpose is to translate the MVP domain notes into the first Prisma-ready schema design.

## Scope

This design defines:

- the first persisted model set for the MVP
- primary keys and foreign keys
- the first unique constraints
- the first nullable and required field strategy
- the first index plan for expected MVP access patterns

This document does not define final migration files, seed data, or non-MVP reporting tables.

## Input notes

This design is based on the earlier domain notes:

- [mvp-domain-model.md](mvp-domain-model.md)
- [mvp-visibility-rules.md](mvp-visibility-rules.md)
- [mvp-continuity-rules.md](mvp-continuity-rules.md)
- [mvp-stamp-and-summary-rules.md](mvp-stamp-and-summary-rules.md)
- [mvp-logical-er-review.md](mvp-logical-er-review.md)

## Decision summary

The first schema should persist these models:

- `User`
- `FocusTarget`
- `FocusSession`
- `ResumeSource`
- `Stamp`

The first schema should not persist `PublicSummary` as its own table.

The first schema should also keep these decisions:

- `genre` stays as a simple optional field on `FocusTarget`
- `note` stays as a nullable field on `FocusSession`
- note visibility stays as an explicit field separate from session visibility
- continuity uses a dedicated `ResumeSource` model instead of hiding resume state only inside `FocusSession`
- stamp deduplication is handled by one row per target, actor, and stamp type

## Prisma-oriented draft

The following draft is intentionally Prisma-oriented, but it is still a design artifact rather than a final generated schema file.

```prisma
enum TargetSourceType {
  FREE_FORM
  URL
}

enum SessionVisibility {
  PRIVATE
  PUBLIC
}

enum NoteVisibility {
  PRIVATE
  PUBLIC
}

enum StampType {
  HELPFUL
}

enum StampActorType {
  AUTHENTICATED_USER
  ANONYMOUS_VISITOR
}

model User {
  id          String   @id @default(cuid())
  firebaseUid String   @unique
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  targets      FocusTarget[]
  actorStamps  Stamp[]       @relation("StampActorUser")
}

model FocusTarget {
  id                   String           @id @default(cuid())
  ownerUserId          String
  title                String
  sourceType           TargetSourceType
  sourceUrl            String?
  genre                String?
  publicSummaryEnabled Boolean          @default(false)
  createdAt            DateTime         @default(now())
  updatedAt            DateTime         @updatedAt

  owner         User           @relation(fields: [ownerUserId], references: [id], onDelete: Cascade)
  sessions      FocusSession[]
  resumeSources ResumeSource[]
  stamps        Stamp[]

  @@index([ownerUserId, updatedAt])
  @@index([ownerUserId, publicSummaryEnabled])
  @@index([publicSummaryEnabled, updatedAt])
}

model FocusSession {
  id              String            @id @default(cuid())
  targetId        String
  visibility      SessionVisibility @default(PRIVATE)
  note            String?           @db.Text
  noteVisibility  NoteVisibility?
  completedByUser Boolean           @default(false)
  startedAt       DateTime
  endedAt         DateTime?
  durationSeconds Int?
  createdAt       DateTime          @default(now())
  updatedAt       DateTime          @updatedAt

  target             FocusTarget    @relation(fields: [targetId], references: [id], onDelete: Cascade)
  startedResume      ResumeSource?  @relation("StartedSession")
  previousForResume  ResumeSource[] @relation("PreviousSession")

  @@index([targetId, startedAt])
  @@index([targetId, visibility, startedAt])
  @@index([targetId, visibility, endedAt])
}

model ResumeSource {
  id                String    @id @default(cuid())
  targetId          String
  startedSessionId  String    @unique
  previousSessionId String
  isEffective       Boolean   @default(true)
  invalidatedAt     DateTime?
  invalidationNote  String?
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  target          FocusTarget  @relation(fields: [targetId], references: [id], onDelete: Cascade)
  startedSession  FocusSession @relation("StartedSession", fields: [startedSessionId], references: [id], onDelete: Cascade)
  previousSession FocusSession @relation("PreviousSession", fields: [previousSessionId], references: [id], onDelete: Restrict)

  @@index([targetId, isEffective, createdAt])
  @@index([previousSessionId])
}

model Stamp {
  id         String        @id @default(cuid())
  targetId   String
  actorType  StampActorType
  actorKey   String
  actorUserId String?
  stampType   StampType     @default(HELPFUL)
  isEffective Boolean       @default(true)
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt

  target    FocusTarget @relation(fields: [targetId], references: [id], onDelete: Cascade)
  actorUser User?       @relation("StampActorUser", fields: [actorUserId], references: [id], onDelete: SetNull)

  @@unique([targetId, actorType, actorKey, stampType])
  @@index([targetId, isEffective, stampType])
  @@index([actorUserId])
}
```

## Key decisions by model

### User

- primary key: application-level `id`
- unique key: `firebaseUid`
- reason: Firebase is the authentication source, but application rows still need stable local keys for relations

### FocusTarget

- primary key: `id`
- foreign key: `ownerUserId -> User.id`
- required fields: `ownerUserId`, `title`, `sourceType`
- nullable fields: `sourceUrl`, `genre`
- publication flag: `publicSummaryEnabled`

Decision:

- the public summary state starts as a flag on `FocusTarget`
- no separate `PublicSummary` model is required in the first schema
- `sourceUrl` is nullable, but it should be present when `sourceType` is `URL` and absent for fully free-form targets

### FocusSession

- primary key: `id`
- foreign key: `targetId -> FocusTarget.id`
- required fields: `targetId`, `visibility`, `completedByUser`, `startedAt`
- nullable fields: `note`, `noteVisibility`, `endedAt`, `durationSeconds`

Decision:

- `note` remains session-owned text in the first schema
- `noteVisibility` remains a separate field so note visibility can be stricter than session visibility
- `endedAt` and `durationSeconds` stay nullable so the schema can support in-progress sessions if implementation needs that
- the schema does not duplicate `ownerUserId` on `FocusSession` because target ownership already defines session ownership in the MVP

### ResumeSource

- primary key: `id`
- foreign keys:
  - `targetId -> FocusTarget.id`
  - `startedSessionId -> FocusSession.id`
  - `previousSessionId -> FocusSession.id`
- unique key: `startedSessionId`
- required fields: `targetId`, `startedSessionId`, `previousSessionId`, `isEffective`
- nullable fields: `invalidatedAt`, `invalidationNote`

Decision:

- continuity uses its own persisted source model instead of a session-only boolean
- one started session can have at most one resume source record
- correction is represented by keeping the record and changing its effective state rather than losing source history

### Stamp

- primary key: `id`
- foreign keys:
  - `targetId -> FocusTarget.id`
  - `actorUserId -> User.id` when the actor is authenticated
- unique key: `[targetId, actorType, actorKey, stampType]`
- required fields: `targetId`, `actorType`, `actorKey`, `stampType`, `isEffective`
- nullable fields: `actorUserId`

Decision:

- stamp deduplication happens at the database level by target, actor, and type
- `actorType` and `actorKey` together define the deduplication identity for both authenticated and anonymous actors
- `actorUserId` is used only when the actor is an authenticated user

## Why `PublicSummary` is not stored first

The current domain notes support `PublicSummary` as a derived read model.

The first schema should derive public summary behavior from:

- `FocusTarget.publicSummaryEnabled`
- public `FocusSession` rows
- public note visibility on those sessions
- effective `Stamp` rows linked to that target

This keeps visibility changes, stamp correction, and summary recomputation rebuildable from source data.

If later profiling shows read pressure, cached summary fields or a dedicated summary table can be added in a later issue.

## Constraint plan

The first schema should rely on database constraints for what the database can safely guarantee.

### Database-enforced constraints

- `User.firebaseUid` must be unique
- each `FocusTarget` must belong to one `User`
- each `FocusSession` must belong to one `FocusTarget`
- each `ResumeSource` must point to exactly one started session and one previous session
- each started session can have at most one `ResumeSource`
- each `Stamp` row must belong to one `FocusTarget`
- each actor identity can have at most one row per target and stamp type

### Application-enforced invariants

These rules matter, but they are not fully expressible with Prisma schema constraints alone:

- `FocusSession.noteVisibility` should be null when `note` is null
- `FocusSession.noteVisibility` must not be `PUBLIC` when session `visibility` is `PRIVATE`
- `FocusTarget.sourceUrl` should be present for URL-backed targets and absent for free-form targets
- `ResumeSource.targetId` must match both the started session target and the previous session target
- `Stamp.actorUserId` must be present when `actorType` is authenticated and absent when the actor is anonymous
- anonymous `actorKey` values must be stable enough for deduplication without exposing raw personal identifiers

## First index plan

The first index set should follow expected MVP read patterns.

| Access pattern | Model | First index decision |
| --- | --- | --- |
| list a user's targets | `FocusTarget` | `@@index([ownerUserId, updatedAt])` |
| list public targets that expose a summary | `FocusTarget` | `@@index([publicSummaryEnabled, updatedAt])` |
| filter a user's public vs private targets | `FocusTarget` | `@@index([ownerUserId, publicSummaryEnabled])` |
| load session history for a target | `FocusSession` | `@@index([targetId, startedAt])` |
| rebuild public session timeline for a target | `FocusSession` | `@@index([targetId, visibility, startedAt])` |
| recompute public summary aggregates that depend on completion time | `FocusSession` | `@@index([targetId, visibility, endedAt])` |
| derive continuity from valid resume records | `ResumeSource` | `@@index([targetId, isEffective, createdAt])` |
| look up the previous session chain | `ResumeSource` | `@@index([previousSessionId])` |
| count effective helpful stamps for a target | `Stamp` | `@@index([targetId, isEffective, stampType])` |
| link authenticated stamp history back to a user | `Stamp` | `@@index([actorUserId])` |

## Decisions on earlier open questions

### Public summary persistence

Decision:

- do not persist `PublicSummary` in the first schema
- keep it derived from source rows
- postpone cache fields until read patterns justify them

### Resume storage shape

Decision:

- use a dedicated `ResumeSource` model in the first schema
- avoid reducing continuity to a single boolean on `FocusSession`

### Stamp actor identity

Decision:

- use `actorType` plus `actorKey` for deduplication
- use nullable `actorUserId` only for authenticated actors

### Note visibility representation

Decision:

- use an explicit `noteVisibility` field on `FocusSession`
- do not model note publicity only through payload copying or a second note table in the MVP

## Handoff to implementation

This design is clear enough to start the first Prisma implementation work.

The implementation phase should next decide:

- exact Prisma project layout in the monorepo
- datasource and generator configuration
- final naming style for model fields where this design intentionally stays high level
- whether any of the proposed indexes should become partial indexes through later SQL migrations