# Logger Package

This package exposes one shared logging foundation with runtime-specific adapters and an event schema layer.

- `@focusbuddy/logger` exports the common logger facade plus event schema helpers
- `@focusbuddy/logger/server` keeps `pino` on the server side only
- `@focusbuddy/logger/browser` provides a browser-safe structured console adapter

Server runtimes should depend on `pino` directly when they use `@focusbuddy/logger/server`.

## Target Envelope

FocusBuddy should evaluate logging quality against a stable envelope rather than against ad hoc `message + context` calls.

The current package now targets this operational shape:

```json
{
  "timestamp": "2026-04-09T12:00:00.000Z",
  "level": "info",
  "logId": "API_REQUEST_001",
  "application": "focusbuddy-api",
  "layer": "api",
  "category": "Request",
  "message": "API request handled - Status: 200",
  "traceId": "trace-42",
  "requestId": "req-42",
  "userId": "user-7",
  "runtime": "api",
  "context": {
    "route": "health.read",
    "statusCode": 200
  }
}
```

The correlation model is still defined outside this package. The logger accepts request, trace, user, and session fields, but ID issuance and propagation belong at request, middleware, interceptor, page, or session boundaries.

Runtime defaults belong to the runtime-specific factories. `createServerLogger()` defaults to `api`, `createBrowserLogger()` defaults to `web`, and callers only need to override that when a different runtime label is actually needed.

## Usage Model

Recommended application usage is wrapper-first and event-first.

- App code should receive a request-scoped logger or page-scoped logger.
- App code should emit named events with typed fields.
- Stable request, user, route, and session context should already be bound before the log call happens.

The `child()` API is a low-level primitive for building those scoped loggers. It exists so framework adapters and app-local wrappers can bind stable context once, but regular handlers and components should not call it directly throughout the codebase.

## Event Schema Layer

The event schema layer adds `logId`, `messageTemplate`, `category`, and required field validation on top of the raw logger facade.

```ts
import { createEventLogger, defineEvent } from '@focusbuddy/logger'
import { createServerLogger } from '@focusbuddy/logger/server'

const apiRequestHandled = defineEvent<{ statusCode: number }>({
  logId: 'API_REQUEST_001',
  level: 'info',
  category: 'Request',
  messageTemplate: 'API request handled - Status: {statusCode}',
  requiredContext: ['statusCode'],
})

const requestLogger = createEventLogger(
  createServerLogger().child({
    requestId: 'req-42',
    traceId: 'trace-42',
    requestMethod: 'GET',
    requestPath: '/health',
    userId: 'user-7',
    runtime: 'api',
  }),
  {
    application: 'focusbuddy-api',
    layer: 'api',
  },
)

requestLogger.emit(apiRequestHandled, {
  statusCode: 200,
})
```

## API Wrapper Example

```ts
import { logApiRequestHandled } from './logging/api-request-logger'

logApiRequestHandled({
  request: {
    requestId: 'req-42',
    requestMethod: 'GET',
    requestPath: '/health',
    route: 'health.read',
  },
  user: {
    userId: 'user-7',
  },
  statusCode: 200,
})
```

## Web Wrapper Example

```ts
import { logPublicSummaryViewed } from './logging/public-summary-logger'

logPublicSummaryViewed({
  request: {
    requestId: 'page-1',
    requestPath: '/targets/alpha',
    route: 'public-summary.view',
    targetId: 'alpha',
  },
  user: {
    userId: 'user-7',
    sessionId: 'session-9',
  },
  source: 'share-card',
})
```

## Next.js Middleware Preparation

Next.js middleware should create and propagate correlation fields before page code or route handlers run.

- Use `prepareNextMiddlewareLogger()` from [apps/web/src/lib/logging/next-middleware-logger.ts](apps/web/src/lib/logging/next-middleware-logger.ts) to reuse or mint `requestId` and `traceId`.
- Forward the generated headers through the request and response boundaries.
- Build a middleware-scoped event logger with `application: 'focusbuddy-web'` and `layer: 'middleware'`.

This package should therefore be evaluated together with automatic correlation propagation, not as a raw logging primitive used directly everywhere.

- API: create the request correlation context at ingress, then expose a request-scoped logger from a Nest interceptor or an AsyncLocalStorage-backed logging boundary.
- Web: create the page or session correlation context at navigation or middleware boundaries, then expose a page-scoped logger from app context rather than asking each component to pass `requestId` manually.
- Application code: log business events with event-specific fields only. Stable request, user, route, and session context should already be bound before the log call happens.
