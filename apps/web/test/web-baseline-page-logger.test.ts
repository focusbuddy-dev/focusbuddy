import { createLogger, type LogEntry } from '@focusbuddy/logger'

import {
  createWebBaselinePageLogger,
  logWebBaselineButtonClicked,
  logWebBaselineNavigationCompleted,
  logWebBaselinePageViewed,
} from '../src/lib/logging/web-baseline-page-logger'

describe('web baseline page logger', () => {
  it('keeps page request and session context on the shared client facade', () => {
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
      now: () => new Date('2026-04-10T08:00:00.000Z'),
    })

    const logger = createWebBaselinePageLogger(
      {
        requestId: 'page-77',
        requestPath: '/',
        route: 'home',
        targetId: 'baseline-target',
        traceId: 'trace-77',
      },
      {
        sessionId: 'session-77',
      },
      baseLogger,
    )

    logger.info('Client page logger attached', {
      currentView: 'overview',
    })

    expect(writes[0]).toMatchObject({
      level: 'info',
      message: 'Client page logger attached',
      requestId: 'page-77',
      requestPath: '/',
      sessionId: 'session-77',
      traceId: 'trace-77',
      context: {
        currentView: 'overview',
        route: 'home',
        surface: 'web-test',
        targetId: 'baseline-target',
      },
      timestamp: '2026-04-10T08:00:00.000Z',
    })
  })

  it('emits structured client events for initial view, clicks, and navigation', () => {
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

    const request = {
      requestId: 'page-88',
      requestPath: '/?view=overview',
      route: 'home',
      targetId: 'baseline-target',
      traceId: 'trace-88',
    }
    const user = {
      sessionId: 'session-88',
    }

    logWebBaselinePageViewed(
      {
        request,
        user,
        view: 'overview',
      },
      baseLogger,
    )
    logWebBaselineButtonClicked(
      {
        action: 'navigate-baseline-page',
        actionTarget: '/?view=details',
        request,
        user,
      },
      baseLogger,
    )
    logWebBaselineNavigationCompleted(
      {
        destination: '/?view=details',
        request: {
          ...request,
          requestPath: '/?view=details',
        },
        trigger: 'router.push',
        user,
      },
      baseLogger,
    )

    expect(writes).toHaveLength(3)
    expect(writes[0]).toMatchObject({
      application: 'focusbuddy-web',
      category: 'WebBaselinePage',
      layer: 'web-client',
      logId: 'WEB_BASELINE_001',
      message: 'Baseline page viewed - View: overview',
      requestId: 'page-88',
      traceId: 'trace-88',
      context: {
        route: 'home',
        surface: 'web-test',
        targetId: 'baseline-target',
        view: 'overview',
      },
    })
    expect(writes[1]).toMatchObject({
      logId: 'WEB_BASELINE_002',
      message: 'Baseline page button clicked - Action: navigate-baseline-page Target: /?view=details',
      context: {
        action: 'navigate-baseline-page',
        actionTarget: '/?view=details',
        route: 'home',
        surface: 'web-test',
        targetId: 'baseline-target',
      },
    })
    expect(writes[2]).toMatchObject({
      logId: 'WEB_BASELINE_003',
      message: 'Baseline page navigation completed - Destination: /?view=details',
      requestPath: '/?view=details',
      context: {
        destination: '/?view=details',
        route: 'home',
        surface: 'web-test',
        targetId: 'baseline-target',
        trigger: 'router.push',
      },
    })
  })
})
