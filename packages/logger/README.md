# Logger Package

This package exposes one shared logging foundation with runtime-specific adapters and an event schema layer.

- `@focusbuddy/logger` exports the common logger facade plus event schema helpers
- `@focusbuddy/logger/server` exports a server-side bridge that accepts an app-owned structured log writer
- `@focusbuddy/logger/browser` exports a browser-side bridge over the platform console

This package does not own the server runtime sink anymore. The API app owns `pino`, the Web app owns the browser console, and both apps use the same shared facade and event schema layer on top.

For the Web app, the runtime split is now explicit as well.

- Web client runtime: [../../apps/web/src/lib/logging/web-runtime-logger.ts](../../apps/web/src/lib/logging/web-runtime-logger.ts)
- Web server runtime: [../../apps/web/src/lib/logging/web-server-runtime-logger.ts](../../apps/web/src/lib/logging/web-server-runtime-logger.ts)
- Web page-level client events: [../../apps/web/src/lib/logging/web-baseline-page-logger.ts](../../apps/web/src/lib/logging/web-baseline-page-logger.ts)
- Web route-handler server events: [../../apps/web/src/lib/logging/web-health-route-logger.ts](../../apps/web/src/lib/logging/web-health-route-logger.ts)

## Responsibility Split

The logging stack is intentionally split so API and Web follow the same shape.

- Shared package: envelope types, context merging, event schema, browser bridge, server bridge
- API app: chooses the server sink and wires it in [../../apps/api/src/logging/api-runtime-logger.ts](../../apps/api/src/logging/api-runtime-logger.ts)
- Web app client: chooses the browser sink and wires it in [../../apps/web/src/lib/logging/web-runtime-logger.ts](../../apps/web/src/lib/logging/web-runtime-logger.ts)
- Web app server: chooses the server-side sink and wires it in [../../apps/web/src/lib/logging/web-server-runtime-logger.ts](../../apps/web/src/lib/logging/web-server-runtime-logger.ts)
- App-local wrappers: bind stable request or page context once, then emit named events
- Framework boundaries: middleware, interceptor, AsyncLocalStorage, or page context propagate correlation fields

The current repository now uses those boundaries directly.

- API runtime integration: [../../apps/api/src/logging/api-request-logging.interceptor.ts](../../apps/api/src/logging/api-request-logging.interceptor.ts)
- Web runtime integration: [../../apps/web/src/middleware.ts](../../apps/web/src/middleware.ts)

The important alignment point is that API and Web now differ only at the sink boundary.

- API sink: `pino` owned by the API app
- Web client sink: `console` owned by the Web app
- Web server sink: server-side `console` bridge owned by the Web app
- Shared layer above that sink: identical envelope, event schema, and wrapper pattern

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

Runtime defaults belong to the app-local runtime factories. [../../apps/api/src/logging/api-runtime-logger.ts](../../apps/api/src/logging/api-runtime-logger.ts) defaults to `api`, [../../apps/web/src/lib/logging/web-runtime-logger.ts](../../apps/web/src/lib/logging/web-runtime-logger.ts) defaults to `web`, and callers only need to override that when a different runtime label is actually needed.

For Web server and middleware execution, [../../apps/web/src/lib/logging/web-server-runtime-logger.ts](../../apps/web/src/lib/logging/web-server-runtime-logger.ts) defaults to `web-server`, and middleware overrides that to `web-middleware` where the boundary matters operationally.

## Usage Model

Recommended application usage is wrapper-first and event-first.

- App code should receive a request-scoped logger or page-scoped logger.
- App code should emit named events with typed fields.
- Stable request, user, route, and session context should already be bound before the log call happens.
- App code should not need to know whether the runtime sink is `pino` or `console`.

The `child()` API is a low-level primitive for building those scoped loggers. It exists so framework adapters and app-local wrappers can bind stable context once, but regular handlers and components should not call it directly throughout the codebase.

## Event Schema Layer

The event schema layer adds `logId`, `messageTemplate`, `category`, and required field validation on top of the raw logger facade.

```ts
import { createEventLogger, defineEvent } from '@focusbuddy/logger'
import { apiRuntimeLogger } from './logging/api-runtime-logger'

const apiRequestHandled = defineEvent<{ statusCode: number }>({
  logId: 'API_REQUEST_001',
  level: 'info',
  category: 'Request',
  messageTemplate: 'API request handled - Status: {statusCode}',
  requiredContext: ['statusCode'],
})

const requestLogger = createEventLogger(
  apiRuntimeLogger.child({
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
import { apiRuntimeLogger } from './logging/api-runtime-logger'

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
}, apiRuntimeLogger)
```

## Web Wrapper Example

```ts
import { logPublicSummaryViewed } from './logging/public-summary-logger'
import { webRuntimeLogger } from './logging/web-runtime-logger'

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
}, webRuntimeLogger)
```

## Web Runtime Integration Map

The current repository now shows concrete Web logging usage at each real Next.js boundary.

- Web client component: [../../apps/web/src/components/web-logging-demo.tsx](../../apps/web/src/components/web-logging-demo.tsx)
  This emits an initial page-display event, a button-click event, and a post-navigation event after the query-string route state changes.
- Web page entry: [../../apps/web/src/app/page.tsx](../../apps/web/src/app/page.tsx)
  This reads correlation headers and passes `requestId` and `traceId` into the real client component boundary.
- Web middleware boundary: [../../apps/web/src/middleware.ts](../../apps/web/src/middleware.ts)
  This uses [../../apps/web/src/lib/logging/next-middleware-logger.ts](../../apps/web/src/lib/logging/next-middleware-logger.ts) to mint or reuse correlation headers and emit `WEB_MIDDLEWARE_001`.
- Web server route handler: [../../apps/web/src/app/health/route.ts](../../apps/web/src/app/health/route.ts)
  This reads propagated correlation headers and emits `WEB_HEALTH_001` through [../../apps/web/src/lib/logging/web-health-route-logger.ts](../../apps/web/src/lib/logging/web-health-route-logger.ts).

## Next.js Middleware Preparation

Next.js middleware should create and propagate correlation fields before page code or route handlers run.

- Use `prepareNextMiddlewareLogger()` from [../../apps/web/src/lib/logging/next-middleware-logger.ts](../../apps/web/src/lib/logging/next-middleware-logger.ts) to reuse or mint `requestId` and `traceId`.
- Forward the generated headers through the request and response boundaries.
- Build a middleware-scoped event logger with `application: 'focusbuddy-web'` and `layer: 'middleware'`.

## Current Integration

To prove the design is usable in the current codebase, logging is wired into the actual runtime entry points.

- API: [../../apps/api/src/main.ts](../../apps/api/src/main.ts) registers [../../apps/api/src/logging/api-request-logging.interceptor.ts](../../apps/api/src/logging/api-request-logging.interceptor.ts), which binds correlation headers and emits `API_REQUEST_001` for real HTTP requests.
- Web client: [../../apps/web/src/components/web-logging-demo.tsx](../../apps/web/src/components/web-logging-demo.tsx) emits `WEB_BASELINE_001`, `WEB_BASELINE_002`, and `WEB_BASELINE_003` for initial display, button clicks, and completed navigation.
- Web middleware: [../../apps/web/src/middleware.ts](../../apps/web/src/middleware.ts) uses [../../apps/web/src/lib/logging/next-middleware-logger.ts](../../apps/web/src/lib/logging/next-middleware-logger.ts) to propagate correlation headers and emit `WEB_MIDDLEWARE_001` for real Next.js middleware execution.
- Web server: [../../apps/web/src/app/health/route.ts](../../apps/web/src/app/health/route.ts) uses [../../apps/web/src/lib/logging/web-health-route-logger.ts](../../apps/web/src/lib/logging/web-health-route-logger.ts) to emit `WEB_HEALTH_001` from a real route handler after middleware propagation.

This package should therefore be evaluated together with automatic correlation propagation, not as a raw logging primitive used directly everywhere.

- API: create the request correlation context at ingress, then expose a request-scoped logger from a Nest interceptor or an AsyncLocalStorage-backed logging boundary.
- Web: create the page or session correlation context at navigation or middleware boundaries, then expose a page-scoped logger from app context rather than asking each component to pass `requestId` manually.
- Application code: log business events with event-specific fields only. Stable request, user, route, and session context should already be bound before the log call happens.
