# MVP API Error Model

This document captures the output of issue #73.

Its purpose is to define the first shared API and domain error model for FocusBuddy.

This document builds on [mvp-domain-model.md](mvp-domain-model.md), [mvp-visibility-rules.md](mvp-visibility-rules.md), and [mvp-stamp-and-summary-rules.md](mvp-stamp-and-summary-rules.md).

## Scope

This document defines:

- the first stable public error classification for FocusBuddy
- the ownership boundary between `packages/api-contract`, `apps/api`, and app-specific UI handling
- the first generated-client-friendly error response shape
- which error details are public-safe versus internal-only
- how runtime exceptions should be normalized into public error codes
- the retryability meaning that clients can rely on

This document does not define final web redirect behavior, final NestJS filter implementation, localization, or mobile-specific presentation.

## Ownership split

The first ownership split should stay explicit.

| Area | Owns | Does not own |
| --- | --- | --- |
| `packages/api-contract` | public error codes, public error response schema, generated client-visible types, stable validation and conflict detail shapes | NestJS filters, Prisma or provider exception mapping, UI copy |
| `apps/api` | runtime exception normalization, HTTP status mapping, request ID attachment, internal diagnostics, server logging metadata | the public contract as source of truth, web presentation behavior |
| `apps/web` | redirect policy, inline error feedback, retry prompts, toast behavior, ErrorBoundary rendering | canonical error codes, server HTTP mapping, internal diagnostics |

The main rule is simple:

- `packages/api-contract` owns the public vocabulary
- `apps/api` owns how internal failures are mapped into that vocabulary
- `apps/web` owns how the product reacts to that public vocabulary

## Public error response principles

The first shared error contract should keep a small stable top-level shape.

Every public error response should strongly consider these fields:

- `code`
- `message`
- `requestId`
- `retryable`
- optional `details`

The baseline handling rule for clients is:

- `code`, `message`, `requestId`, and `retryable` must always be enough for default behavior
- `details` is optional and should appear only when there is stable typed data that clients can use safely

## Retryable meaning

For generated client consumption, `retryable` should mean:

- the client may offer an immediate retry path without requiring input correction first
- the client may offer an immediate retry path without requiring auth-context change first

This means most validation, auth, authorization, and domain-rule failures are not retryable by default.

## Minimum stable public error code set

| Code | Category | Default HTTP | Retryable | Typical situations |
| --- | --- | --- | --- | --- |
| `VALIDATION_ERROR` | request validation | `400` | `false` | missing required input, malformed payload, invalid enum |
| `AUTH_REQUIRED` | authentication | `401` | `false` | missing auth, expired auth, invalid token |
| `ACCESS_DENIED` | authorization | `403` | `false` | authenticated user lacks permission for the action |
| `RESOURCE_NOT_FOUND` | existence or secrecy-preserving access | `404` | `false` | target, session, summary, or stamp should not be disclosed or does not exist |
| `INVALID_STATE_TRANSITION` | state transition failure | `409` | `false` | invalid publish or unpublish step, invalid visibility transition |
| `DOMAIN_RULE_VIOLATION` | domain invariant failure | `409` | `false` | note visibility exceeds session visibility, summary prerequisites not met |
| `DUPLICATE_RESOURCE` | uniqueness conflict outside explicit idempotent APIs | `409` | `false` | duplicate create for a resource or relation that must stay unique |
| `RATE_LIMITED` | throttling or abuse protection | `429` | `true` | repeated stamp action, too many mutation attempts |
| `UPSTREAM_UNAVAILABLE` | dependency failure | `503` | `true` | auth provider outage, downstream service unavailable |
| `INTERNAL_ERROR` | unexpected server failure | `500` | `false` | uncaught runtime, unmapped persistence error |

## Visibility-related failures

Visibility-related failures should separate public semantics from internal diagnostics.

This means:

- public read surfaces may collapse hidden-resource cases into `RESOURCE_NOT_FOUND` when existence should not be disclosed
- known-resource or owner-scoped operation failures should keep more specific public codes such as `ACCESS_DENIED`, `INVALID_STATE_TRANSITION`, or `DOMAIN_RULE_VIOLATION`
- the server should always record an internal reason for why a public `RESOURCE_NOT_FOUND` was returned
- client behavior should branch on the public code only, not on internal reasons

The practical rule of thumb is:

- if the caller should not learn whether the resource exists, return `RESOURCE_NOT_FOUND`
- if the caller already knows the resource exists and is blocked from acting on it, return `ACCESS_DENIED`
- if the caller owns the resource but the current state or visibility rules reject the action, return `INVALID_STATE_TRANSITION` or `DOMAIN_RULE_VIOLATION`

## Helpful stamp semantics

The error model should preserve the idempotent helpful-stamp rule from [mvp-stamp-and-summary-rules.md](mvp-stamp-and-summary-rules.md).

This means:

- enabling a helpful stamp should be idempotent
- repeating the same enable action should return success with no state change
- removing a helpful stamp should be an explicit remove operation, not an implicit reversal of create
- repeated enable requests for an already-effective helpful stamp should not return `DUPLICATE_RESOURCE`

This keeps duplicate submission handling separate from intentional user reversal.

## Public conflict reason vocabulary

`ConflictErrorDetails.reason` should start as a small public enum, not a free string.

The first public conflict reasons should be:

| Public reason | Typical public code | Meaning |
| --- | --- | --- |
| `INVALID_VISIBILITY_TRANSITION` | `INVALID_STATE_TRANSITION` | requested visibility change is not allowed from the current state |
| `SUMMARY_PREREQUISITE_NOT_MET` | `INVALID_STATE_TRANSITION` | summary publication prerequisites are not satisfied |
| `NOTE_VISIBILITY_EXCEEDS_SESSION` | `DOMAIN_RULE_VIOLATION` | note visibility request exceeds session visibility |
| `RESOURCE_ALREADY_EXISTS` | `DUPLICATE_RESOURCE` | request tried to create a resource or relation that must stay unique |

This means:

- the public contract owns a stable conflict-family reason enum
- `apps/api` may keep richer internal reasons and normalize them into the public enum
- raw Prisma messages, provider codes, and stack traces stay internal-only
- if the backend cannot map an internal conflict to a stable public enum confidently, it may omit `reason` and still return the broader public `code`

## Public versus internal detail boundary

Public responses may include:

- stable error code
- safe default message
- request correlation ID
- retryability
- field-level validation details when applicable
- public-safe conflict or cooldown metadata

Public responses should not include:

- raw database or provider errors
- Prisma error codes as the public contract
- stack traces
- auth provider internals
- authorization explanations that disclose private resource existence
- placeholder `details` objects with no client-meaningful value
- internal diagnostic reasons such as `HIDDEN_BY_TARGET_VISIBILITY`

## Internal-only diagnostics

The first server-side diagnostic model should strongly consider these internal-only fields:

- `requestId`
- `publicCode`
- `internalReason`
- `actorContext`
- `resourceType`
- `resourceId`

These fields improve logs and observability but should not become part of the public contract by default.

## Backend normalization flow

The backend should normalize failures in ordered stages instead of exposing framework or persistence exceptions directly.

### Stage 1: capture raw failure

The API boundary catches raw failures from validation, auth, domain services, repositories, infrastructure clients, or uncaught runtime paths.

### Stage 2: classify internal reason

The backend maps the raw failure into an internal diagnostic reason and may attach actor or resource context.

### Stage 3: map to public code and optional public reason

The backend converts the internal reason into:

- `publicCode`
- optional public `ConflictReason`
- `retryable`
- safe top-level `message`
- optional public `details`

### Stage 4: write diagnostics

Before sending the response, the backend logs the request and internal classification context.

### Stage 5: emit public response

The API returns only the public contract fields.

No raw database message, provider detail, or stack trace should cross this boundary.

## Domain mapping examples

| Situation | Public result | Notes |
| --- | --- | --- |
| trying to show a private session in a public surface | `RESOURCE_NOT_FOUND` | prefer secrecy-preserving behavior over explicit disclosure |
| trying to expose note content when note visibility does not allow it on a public surface | `RESOURCE_NOT_FOUND` | existence may stay hidden externally while logs keep the internal reason |
| trying to expose note content beyond session visibility rules in an owner flow | `DOMAIN_RULE_VIOLATION` plus `NOTE_VISIBILITY_EXCEEDS_SESSION` | recoverable business rule failure |
| trying to enable a public summary before prerequisites are met | `INVALID_STATE_TRANSITION` plus `SUMMARY_PREREQUISITE_NOT_MET` | action conflicts with current aggregate state |
| trying to mutate a visible target that belongs to another user | `ACCESS_DENIED` | resource may be visible but the operation is forbidden |
| repeating a helpful stamp enable action that is already effective | success no-op | idempotent success with no state change |
| removing a helpful stamp that is already inactive or absent | success no-op or idempotent remove | exact empty-state payload may remain implementation-defined |

## OpenAPI-friendly response model

To keep code generation practical in issue #20, the error contract should prefer named reusable components over large inline response schemas.

The first contract should strongly consider these schema components:

- `ErrorCode`
- `ConflictReason`
- `ErrorResponseBase`
- `ValidationIssue`
- `ValidationErrorDetails`
- `ConflictErrorDetails`
- `RateLimitErrorDetails`
- `ValidationErrorResponse`
- `UnauthorizedErrorResponse`
- `ForbiddenErrorResponse`
- `NotFoundErrorResponse`
- `ConflictErrorResponse`
- `RateLimitErrorResponse`
- `ServiceUnavailableErrorResponse`
- `InternalErrorResponse`

The first contract should also strongly consider these response components:

- `BadRequestError`
- `UnauthorizedError`
- `ForbiddenError`
- `NotFoundError`
- `ConflictError`
- `TooManyRequestsError`
- `ServiceUnavailableError`
- `InternalServerError`

## Draft schema fragment

```yaml
components:
  schemas:
    ErrorCode:
      type: string
      enum:
        - VALIDATION_ERROR
        - AUTH_REQUIRED
        - ACCESS_DENIED
        - RESOURCE_NOT_FOUND
        - INVALID_STATE_TRANSITION
        - DOMAIN_RULE_VIOLATION
        - DUPLICATE_RESOURCE
        - RATE_LIMITED
        - UPSTREAM_UNAVAILABLE
        - INTERNAL_ERROR

    ConflictReason:
      type: string
      enum:
        - INVALID_VISIBILITY_TRANSITION
        - SUMMARY_PREREQUISITE_NOT_MET
        - NOTE_VISIBILITY_EXCEEDS_SESSION
        - RESOURCE_ALREADY_EXISTS

    ErrorResponseBase:
      type: object
      additionalProperties: false
      required:
        - code
        - message
        - requestId
        - retryable
      properties:
        code:
          $ref: '#/components/schemas/ErrorCode'
        message:
          type: string
        requestId:
          type: string
        retryable:
          type: boolean
        details:
          oneOf:
            - $ref: '#/components/schemas/ValidationErrorDetails'
            - $ref: '#/components/schemas/ConflictErrorDetails'
            - $ref: '#/components/schemas/RateLimitErrorDetails'

    ValidationErrorDetails:
      type: object
      additionalProperties: false
      required:
        - kind
        - issues
      properties:
        kind:
          type: string
          enum:
            - validation
        issues:
          type: array
          items:
            $ref: '#/components/schemas/ValidationIssue'

    ConflictErrorDetails:
      type: object
      additionalProperties: false
      required:
        - kind
      properties:
        kind:
          type: string
          enum:
            - conflict
        reason:
          $ref: '#/components/schemas/ConflictReason'
        currentState:
          type: string

    RateLimitErrorDetails:
      type: object
      additionalProperties: false
      required:
        - kind
      properties:
        kind:
          type: string
          enum:
            - rate_limit
        retryAfterSeconds:
          type: integer
          minimum: 0
        scope:
          type: string
```

The key design choices are:

- use a shared `ErrorResponseBase` so generated clients always receive the same top-level fields
- keep `code` machine-readable and stable across runtime implementations
- keep `details` optional at the contract level and include it only when the payload has stable typed client value
- use `ConflictErrorResponse` for the three `409` codes and let `code` carry the finer business distinction
- keep explicit idempotent APIs out of the conflict family

## Relationship to later work

### For issue #20

This document should be concrete enough to drive the first OpenAPI error components and generated client-visible types.

### For issue #21

This document defines the contract boundary, but concrete NestJS filters, Prisma normalization, and runtime implementation details belong to API implementation work.

### For issue #74

This document owns the shared public error vocabulary.

Issue #74 owns how the web product reacts to those error categories, such as redirect, inline recovery, retry prompts, and fallback behavior.

## Done-state coverage

This document now makes explicit:

- the public error categories that contract work can rely on
- the ownership split between `packages/api-contract`, `apps/api`, and `apps/web`
- the minimum stable public error code set
- the generated-client-friendly response shape
- the line between public details and internal diagnostics