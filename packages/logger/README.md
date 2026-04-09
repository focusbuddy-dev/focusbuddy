# Logger Package

This package exposes one shared logger facade with runtime-specific adapters.

- `@focusbuddy/logger` exports the common logger interface and facade factory
- `@focusbuddy/logger/server` keeps `pino` on the server side only
- `@focusbuddy/logger/browser` provides a browser-safe console adapter

Server runtimes should depend on `pino` directly when they use `@focusbuddy/logger/server`.

The shared context model supports request and user metadata without forcing app code to know which runtime logger sits underneath.

The correlation model should be defined outside this package. The logger accepts request and user fields, but ID issuance and propagation belong at request or page boundaries.

Runtime defaults belong to the runtime-specific factories. `createServerLogger()` defaults to `api`, `createBrowserLogger()` defaults to `web`, and callers only need to override that when a different runtime label is actually needed.

Recommended application usage is wrapper-first. App code should normally receive a request-scoped logger or page-scoped logger and write event-specific fields only.

The `child()` API is a low-level primitive for building those scoped loggers. It exists so framework adapters and app-local wrappers can bind stable context once, but regular handlers and components should not call it directly throughout the codebase.

## API Example

```ts
import { createApiRequestLogger } from './logging/api-request-logger'

const requestLogger = createApiRequestLogger(
  {
    requestId: 'req-42',
    requestMethod: 'GET',
    requestPath: '/health',
    route: 'health.read',
  },
  {
    userId: 'user-7',
  },
)

requestLogger.info('API request handled', { statusCode: 200 })
```

## Web Example

```ts
import { createPublicSummaryLogger } from './logging/public-summary-logger'

const pageLogger = createPublicSummaryLogger(
  {
    requestId: 'page-1',
    requestPath: '/targets/alpha',
    route: 'public-summary.view',
    targetId: 'alpha',
  },
  {
    userId: 'user-7',
    sessionId: 'session-9',
  },
)

pageLogger.info('Public summary viewed', { source: 'share-card' })
```

## Integration Direction

This package should be evaluated together with automatic correlation propagation, not as a raw logging primitive used directly everywhere.

- API: create the request correlation context at ingress, then expose a request-scoped logger from a Nest interceptor or an AsyncLocalStorage-backed logging boundary.
- Web: create the page or session correlation context at navigation or bootstrap boundaries, then expose a page-scoped logger from app context rather than asking each component to pass `requestId` manually.
- Application code: log business events with event-specific fields only. Stable request, user, route, and session context should already be bound before the log call happens.
