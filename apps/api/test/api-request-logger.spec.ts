jest.mock('@focusbuddy/logger/server', () => {
  const noOpLogger = {
    child() {
      return noOpLogger
    },
    info() {},
  }

  return {
    createServerLogger: () => noOpLogger,
  }
})

import {
  createApiRequestLogger,
  logApiRequestHandled,
} from '../src/logging/api-request-logger.example'

type RecordedEntry = {
  level: 'info'
  message: string
  context: Record<string, unknown>
  timestamp?: string
}

type TestLogger = {
  child: (context?: Record<string, unknown>) => TestLogger
  info: (message: string, context?: Record<string, unknown>) => void
}

function mergeContext(
  baseContext: Record<string, unknown>,
  nextContext?: Record<string, unknown>,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries({
      ...baseContext,
      ...(nextContext ?? {}),
    }).filter(([, value]) => value !== undefined),
  )
}

function createTestLogger(
  writes: RecordedEntry[],
  baseContext: Record<string, unknown> = {},
  timestamp?: string,
): TestLogger {
  return {
    child(context) {
      return createTestLogger(writes, mergeContext(baseContext, context), timestamp)
    },
    info(message, context) {
      writes.push({
        level: 'info',
        message,
        context: mergeContext(baseContext, context),
        ...(timestamp ? { timestamp } : {}),
      })
    },
  }
}

describe('api request logger example', () => {
  it('carries request and user context into one shared facade', () => {
    const writes: RecordedEntry[] = []

    const baseLogger = createTestLogger(writes, { service: 'api-test' }, '2026-04-09T10:30:00.000Z')

    const requestLogger = createApiRequestLogger(
      {
        requestId: 'req-500',
        requestMethod: 'POST',
        requestPath: '/sessions',
        route: 'sessions.create',
      },
      {
        userId: 'user-500',
        workspaceId: 'workspace-9',
      },
      baseLogger,
    )

    requestLogger.info('API request accepted', {
      statusCode: 202,
    })

    expect(writes[0]).toMatchObject({
      level: 'info',
      message: 'API request accepted',
      context: {
        service: 'api-test',
        requestId: 'req-500',
        requestMethod: 'POST',
        requestPath: '/sessions',
        route: 'sessions.create',
        userId: 'user-500',
        workspaceId: 'workspace-9',
        statusCode: 202,
      },
      timestamp: '2026-04-09T10:30:00.000Z',
    })
  })

  it('logs handled requests with the shared facade shape', () => {
    const writes: RecordedEntry[] = []

    const baseLogger = createTestLogger(writes, { service: 'api-test' })

    logApiRequestHandled(
      {
        request: {
          requestId: 'req-501',
          requestMethod: 'GET',
          requestPath: '/health',
          route: 'health.read',
        },
        user: {
          userId: 'user-501',
        },
        statusCode: 200,
      },
      baseLogger,
    )

    expect(writes[0]).toMatchObject({
      level: 'info',
      message: 'API request handled',
      context: {
        service: 'api-test',
        requestId: 'req-501',
        requestMethod: 'GET',
        requestPath: '/health',
        route: 'health.read',
        userId: 'user-501',
        statusCode: 200,
      },
    })
  })
})
