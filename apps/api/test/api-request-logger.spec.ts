import { createLogger, type LogEntry } from '@focusbuddy/logger'

import {
  createApiRequestLogger,
  logApiRequestHandled,
} from '../src/logging/api-request-logger.example'

describe('api request logger example', () => {
  it('carries request and user context into one shared facade', () => {
    const writes: LogEntry[] = []

    const baseLogger = createLogger({
      adapter: {
        write(entry) {
          writes.push(entry)
        },
      },
      context: {
        service: 'api-test',
      },
      now: () => new Date('2026-04-09T10:30:00.000Z'),
    })

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
    const writes: LogEntry[] = []

    const baseLogger = createLogger({
      adapter: {
        write(entry) {
          writes.push(entry)
        },
      },
      context: {
        service: 'api-test',
      },
    })

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