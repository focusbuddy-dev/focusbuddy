import { jest } from '@jest/globals';

function formatMockEventMessage(template: string, context: Record<string, unknown>): string {
  return template.replaceAll(/\{([a-zA-Z0-9_]+)\}/g, (_, token: string) => String(context[token]));
}

jest.mock('@focusbuddy/logger', () => {
  return {
    createEventLogger(
      logger: {
        child: (context?: Record<string, unknown>) => {
          info: (message: string, context?: Record<string, unknown>) => void;
        };
      },
      envelope: Record<string, unknown>,
    ) {
      const scopedLogger = logger.child(envelope);

      return {
        emit(
          event: { category: string; logId: string; messageTemplate: string },
          context: Record<string, unknown>,
        ) {
          scopedLogger.info(formatMockEventMessage(event.messageTemplate, context), {
            ...context,
            category: event.category,
            logId: event.logId,
          });
        },
      };
    },
    defineEvent<T>(definition: T) {
      return definition;
    },
  };
});

jest.mock('../src/logging/api-runtime-logger.js', () => {
  const noOpLogger = {
    child() {
      return noOpLogger;
    },
    info() {},
  };

  return {
    apiRuntimeLogger: noOpLogger,
  };
});

import {
  createApiRequestLogger,
  logApiRequestHandled,
} from '../src/logging/api-request-logger.example.js';

type RecordedEntry = {
  application?: string;
  category?: string;
  level: 'info';
  layer?: string;
  logId?: string;
  message: string;
  requestId?: string;
  requestMethod?: string;
  requestPath?: string;
  context: Record<string, unknown>;
  timestamp?: string;
  userId?: string;
};

type TestLogger = {
  child: (context?: Record<string, unknown>) => TestLogger;
  info: (message: string, context?: Record<string, unknown>) => void;
};

const envelopeKeys = new Set([
  'application',
  'category',
  'environment',
  'layer',
  'logId',
  'requestId',
  'requestMethod',
  'requestPath',
  'runtime',
  'sessionId',
  'traceId',
  'userId',
  'userRole',
]);

function mergeContext(
  baseContext: Record<string, unknown>,
  nextContext?: Record<string, unknown>,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries({
      ...baseContext,
      ...nextContext,
    }).filter(([, value]) => value !== undefined),
  );
}

function splitLoggedContext(context: Record<string, unknown>): {
  context: Record<string, unknown>;
  envelope: Record<string, unknown>;
} {
  const envelope: Record<string, unknown> = {};
  const extraContext: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(context)) {
    if (envelopeKeys.has(key)) {
      envelope[key] = value;
      continue;
    }

    extraContext[key] = value;
  }

  return {
    context: extraContext,
    envelope,
  };
}

function createTestLogger(
  writes: RecordedEntry[],
  baseContext: Record<string, unknown> = {},
  timestamp?: string,
): TestLogger {
  return {
    child(context) {
      return createTestLogger(writes, mergeContext(baseContext, context), timestamp);
    },
    info(message, context) {
      const mergedContext = mergeContext(baseContext, context);
      const { context: entryContext, envelope } = splitLoggedContext(mergedContext);

      writes.push({
        ...envelope,
        level: 'info',
        message,
        context: entryContext,
        ...(timestamp ? { timestamp } : {}),
      });
    },
  };
}

describe('api request logger example', () => {
  it('carries request and user context into one shared facade', () => {
    const writes: RecordedEntry[] = [];

    const baseLogger = createTestLogger(
      writes,
      { service: 'api-test' },
      '2026-04-09T10:30:00.000Z',
    );

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
    );

    requestLogger.info('API request accepted', {
      statusCode: 202,
    });

    expect(writes[0]).toMatchObject({
      level: 'info',
      message: 'API request accepted',
      requestId: 'req-500',
      requestMethod: 'POST',
      requestPath: '/sessions',
      userId: 'user-500',
      context: {
        route: 'sessions.create',
        service: 'api-test',
        statusCode: 202,
        workspaceId: 'workspace-9',
      },
      timestamp: '2026-04-09T10:30:00.000Z',
    });
  });

  it('logs handled requests with the shared facade shape', () => {
    const writes: RecordedEntry[] = [];

    const baseLogger = createTestLogger(writes, { service: 'api-test' });

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
    );

    expect(writes[0]).toMatchObject({
      application: 'focusbuddy-api',
      category: 'Request',
      layer: 'api',
      level: 'info',
      logId: 'API_REQUEST_001',
      message: 'API request handled - Status: 200',
      requestId: 'req-501',
      requestMethod: 'GET',
      requestPath: '/health',
      userId: 'user-501',
      context: {
        route: 'health.read',
        service: 'api-test',
        statusCode: 200,
      },
    });
  });
});
