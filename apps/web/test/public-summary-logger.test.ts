import { createLogger, type LogEntry } from '@focusbuddy/logger';

import {
  createPublicSummaryLogger,
  logPublicSummaryViewed,
} from '../src/lib/logging/public-summary-logger';

describe('public summary logger example', () => {
  it('keeps request and user context on the shared browser facade', () => {
    const writes: LogEntry[] = [];

    const baseLogger = createLogger({
      adapter: {
        write(entry) {
          writes.push(entry);
        },
      },
      context: {
        surface: 'web-test',
      },
      now: () => new Date('2026-04-09T11:00:00.000Z'),
    });

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
    );

    logger.info('Public summary rendered', {
      source: 'landing',
    });

    expect(writes[0]).toMatchObject({
      level: 'info',
      message: 'Public summary rendered',
      requestId: 'page-42',
      requestPath: '/targets/focus-42',
      userId: 'user-88',
      sessionId: 'session-1',
      context: {
        route: 'public-summary',
        source: 'landing',
        surface: 'web-test',
        targetId: 'focus-42',
      },
      timestamp: '2026-04-09T11:00:00.000Z',
    });
  });

  it('logs public summary views with the same facade shape', () => {
    const writes: LogEntry[] = [];

    const baseLogger = createLogger({
      adapter: {
        write(entry) {
          writes.push(entry);
        },
      },
      context: {
        surface: 'web-test',
      },
    });

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
    );

    expect(writes[0]).toMatchObject({
      application: 'focusbuddy-web',
      category: 'PublicSummary',
      layer: 'web',
      level: 'info',
      logId: 'PUBLIC_SUMMARY_001',
      message: 'Public summary viewed - Source: share-card',
      requestId: 'page-43',
      requestPath: '/targets/focus-43',
      userId: 'user-89',
      context: {
        route: 'public-summary',
        source: 'share-card',
        surface: 'web-test',
        targetId: 'focus-43',
      },
    });
  });
});
