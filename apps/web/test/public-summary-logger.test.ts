import { createLogger, type LogEntry } from '@focusbuddy/logger'

import {
  createPublicSummaryLogger,
  logPublicSummaryViewed,
} from '../src/lib/logging/public-summary-logger'

describe('public summary logger example', () => {
  it('keeps request and user context on the shared browser facade', () => {
    const writes: LogEntry[] = []

    const baseLogger = createLogger({
      adapter: {
        write(entry) {
          writes.push(entry)
        },
      },
      context: {
        surface: 'web-test',
      },
      now: () => new Date('2026-04-09T11:00:00.000Z'),
    })

    const logger = createPublicSummaryLogger(
      {
        requestId: 'page-42',
        requestPath: '/targets/focus-42',
        route: 'public-summary',
        targetId: 'focus-42',
      },
      {
        userId: 'user-88',
        sessionId: 'session-1',
      },
      baseLogger,
    )

    logger.info('Public summary rendered', {
      source: 'landing',
    })

    expect(writes[0]).toMatchObject({
      level: 'info',
      message: 'Public summary rendered',
      context: {
        surface: 'web-test',
        requestId: 'page-42',
        requestPath: '/targets/focus-42',
        route: 'public-summary',
        targetId: 'focus-42',
        userId: 'user-88',
        sessionId: 'session-1',
        source: 'landing',
      },
      timestamp: '2026-04-09T11:00:00.000Z',
    })
  })

  it('logs public summary views with the same facade shape', () => {
    const writes: LogEntry[] = []

    const baseLogger = createLogger({
      adapter: {
        write(entry) {
          writes.push(entry)
        },
      },
      context: {
        surface: 'web-test',
      },
    })

    logPublicSummaryViewed(
      {
        request: {
          requestId: 'page-43',
          requestPath: '/targets/focus-43',
          route: 'public-summary',
          targetId: 'focus-43',
        },
        source: 'share-card',
        user: {
          userId: 'user-89',
        },
      },
      baseLogger,
    )

    expect(writes[0]).toMatchObject({
      level: 'info',
      message: 'Public summary viewed',
      context: {
        surface: 'web-test',
        requestId: 'page-43',
        requestPath: '/targets/focus-43',
        route: 'public-summary',
        targetId: 'focus-43',
        userId: 'user-89',
        source: 'share-card',
      },
    })
  })
})