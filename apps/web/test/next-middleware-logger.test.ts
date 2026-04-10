import { createLogger, defineEvent, type LogEntry } from '@focusbuddy/logger'

import {
  focusbuddyRequestIdHeader,
  focusbuddyTraceIdHeader,
  prepareNextMiddlewareLogger,
} from '../src/lib/logging/next-middleware-logger'

function createMiddlewareRequest(pathname: string, headers?: Headers): {
  headers: Headers
  method: string
  nextUrl: {
    pathname: string
  }
} {
  return {
    headers: headers ?? new Headers(),
    method: 'GET',
    nextUrl: {
      pathname,
    },
  }
}

describe('next middleware logger helper', () => {
  it('reuses incoming correlation ids and binds middleware envelope fields', () => {
    const writes: LogEntry[] = []
    const baseLogger = createLogger({
      adapter: {
        write(entry) {
          writes.push(entry)
        },
      },
      now: () => new Date('2026-04-09T12:00:00.000Z'),
    })

    const prepared = prepareNextMiddlewareLogger(
      createMiddlewareRequest(
        '/targets/focus-1',
        new Headers({
          [focusbuddyRequestIdHeader]: 'req-910',
          [focusbuddyTraceIdHeader]: 'trace-910',
        }),
      ),
      {
        application: 'focusbuddy-web',
        baseLogger,
        environment: 'test',
      },
    )

    prepared.eventLogger.emit(
      defineEvent<{ matcher: string }>({
        logId: 'WEB_MIDDLEWARE_001',
        level: 'info',
        category: 'Middleware',
        messageTemplate: 'Middleware matched route group: {matcher}',
        requiredContext: ['matcher'],
      }),
      {
        matcher: 'public-target',
      },
    )

    expect(prepared.requestId).toBe('req-910')
    expect(prepared.traceId).toBe('trace-910')
    expect(prepared.requestHeaders.get(focusbuddyRequestIdHeader)).toBe('req-910')
    expect(prepared.responseHeaders.get(focusbuddyTraceIdHeader)).toBe('trace-910')
    expect(writes[0]).toMatchObject({
      application: 'focusbuddy-web',
      category: 'Middleware',
      context: {
        matcher: 'public-target',
      },
      environment: 'test',
      layer: 'middleware',
      level: 'info',
      logId: 'WEB_MIDDLEWARE_001',
      message: 'Middleware matched route group: public-target',
      requestId: 'req-910',
      requestMethod: 'GET',
      requestPath: '/targets/focus-1',
      runtime: 'web-middleware',
      timestamp: '2026-04-09T12:00:00.000Z',
      traceId: 'trace-910',
    })
  })

  it('creates request and trace ids when they are missing', () => {
    const prepared = prepareNextMiddlewareLogger(createMiddlewareRequest('/health'))

    expect(prepared.requestId).toHaveLength(36)
    expect(prepared.traceId).toBe(prepared.requestId)
    expect(prepared.responseHeaders.get(focusbuddyRequestIdHeader)).toBe(prepared.requestId)
  })
})
