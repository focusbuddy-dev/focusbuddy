# Future Multi-Organization Design

This document captures the planning direction for issue #79.

Its purpose is to keep future organization-scoped design visible without forcing MVP authentication, MVP web setup, or MVP schema work to absorb multi-organization complexity too early.

## Scope

This note focuses on:

- the boundary between user identity and future organization membership
- the ownership and authorization seams that MVP work should preserve
- the future concepts that are likely to matter when organization support is introduced
- the recommended timing for when to pick this work up

This note does not define final Prisma models, final API contracts, or an implementation plan for organization features.

## Why this is separate from MVP auth

MVP auth and multi-subdomain support are primarily about:

- the authentication identity source
- shared session transport across browser surfaces
- cookie and CSRF boundaries
- logout, expiry, and auth failure handling

Future multi-organization support is a different concern.

It changes:

- who can act on a resource
- which context a request is acting inside
- how ownership and authorization are modeled
- how audit data should be recorded
- how the database may need to evolve

Because of that, MVP auth work should not be blocked on organization design.

## Current MVP baseline

The current MVP direction should stay intentionally simple:

- identity is user-scoped
- the authenticated actor is a `User`
- application data is modeled around the first single-user ownership rules
- web and API work should not require organization context yet

This is compatible with future organization support as long as the current design avoids over-coupling identity and ownership.

## Constraints to preserve now

The MVP should preserve these extension seams.

### 1. Keep identity separate from ownership

The signed-in user should represent who the actor is.

That does not mean every future resource rule must stay permanently equivalent to direct user ownership.

### 2. Do not bake active organization into the auth primitive

Session identity should describe the authenticated user.

If organization context is needed later, it should be added as request or route context, not by changing the meaning of the base authentication identity.

### 3. Avoid spreading direct owner checks through every boundary

It is fine for MVP rules to be user-owned.

It is less safe to hard-code every service, policy, and API meaning around only `ownerUserId` assumptions in a way that cannot evolve into membership-based access later.

### 4. Leave room for future authorization context

API and web boundaries should be able to carry an explicit active organization context later.

That context may eventually influence authorization, visibility, and audit behavior.

### 5. Leave room for future audit expansion

Audit and policy decisions should be able to include organization context later without rewriting the meaning of the current user identity.

## Future concepts to expect

The future multi-organization design will likely need at least these concepts:

- `Organization`: a tenant or shared workspace boundary
- `OrganizationMembership`: the link between a user and an organization
- `Role` or permission set: the authorization level inside an organization
- `ActiveOrganizationContext`: the organization the current request is acting inside
- resource ownership mode: whether a resource stays user-owned or becomes organization-owned

These concepts should stay future-facing only until there is an actual product requirement that needs them.

## What should not happen yet

The MVP should not do these things preemptively:

- add `organizationId` to every model before there is an organization-scoped requirement
- require every API to carry organization context now
- redesign all ownership rules around teams before there is collaborative product behavior
- tie authentication session storage directly to a future organization model

Those moves would add cost before the product needs them.

## When to revisit this work

This issue should not block MVP auth work in #30.

A practical sequence is:

1. finish MVP auth and subdomain session boundaries in #30
2. continue the MVP single-user model through #35, #21, and #22
3. revisit future organization design before the first feature that introduces shared workspaces, organization-level permissions, or organization-owned resources
4. if that need appears before schema implementation fully stabilizes, split the required parts into focused follow-up issues

## Open questions for the future issue

When organization support becomes concrete, the design should answer at least these questions:

- which resources stay user-owned and which become organization-owned
- whether active organization belongs in path, subdomain, header, or another request context
- how membership and role rules affect authorization decisions
- how public and private visibility behaves when ownership is organization-scoped
- how audit logs, support tooling, and diagnostics represent organization context

## Summary

The MVP should stay user-scoped and simple.

The main responsibility today is not to implement multi-organization support early, but to avoid closing the seams that would make future organization support expensive later.
