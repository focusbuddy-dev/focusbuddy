# Logger Package

This package exposes one shared logger facade with runtime-specific adapters.

- `@focusbuddy/logger` exports the common logger interface and facade factory
- `@focusbuddy/logger/server` keeps `pino` on the server side only
- `@focusbuddy/logger/browser` provides a browser-safe console adapter

Server runtimes should depend on `pino` directly when they use `@focusbuddy/logger/server`.

The shared context model supports request and user metadata without forcing app code to know which runtime logger sits underneath.

## API Example

```ts
import { createServerLogger } from '@focusbuddy/logger/server'

const logger = createServerLogger({ context: { runtime: 'api' } })

logger
  .child({ requestId: 'req-42', requestMethod: 'GET', requestPath: '/health', userId: 'user-7' })
  .info('API request handled', { statusCode: 200 })
```

## Web Example

```ts
import { createBrowserLogger } from '@focusbuddy/logger/browser'

const logger = createBrowserLogger({ context: { runtime: 'web' } })

logger
  .child({ requestId: 'page-1', requestPath: '/targets/alpha', userId: 'user-7' })
  .info('Public summary viewed', { source: 'share-card' })
```
