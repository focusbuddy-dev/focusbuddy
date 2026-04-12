import type { CallHandler, ExecutionContext } from '@nestjs/common';
import { jest } from '@jest/globals';
import { focusbuddyRequestIdHeader, focusbuddyTraceIdHeader } from '@focusbuddy/logger';
import { lastValueFrom, of } from 'rxjs';

import { ApiRequestLoggingInterceptor } from '#api/logging/api-request-logging.interceptor';

describe('ApiRequestLoggingInterceptor', () => {
  it('binds correlation headers and emits a handled request event', async () => {
    const info = jest.fn();
    const requestLogger = {
      child: jest.fn(() => requestLogger),
      info,
    };
    const baseLogger = {
      child: jest.fn(() => requestLogger),
    };

    const response = {
      setHeader: jest.fn(),
      statusCode: 200,
    };
    const request = {
      headers: {
        'x-focusbuddy-request-id': 'req-123',
        'x-focusbuddy-trace-id': 'trace-123',
      },
      method: 'GET',
      originalUrl: '/health',
      route: {
        path: '/health',
      },
    };
    const context = {
      getType: () => 'http',
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => response,
      }),
    } as ExecutionContext;
    const next = {
      handle: () => of({ ok: true }),
    } satisfies CallHandler;

    const interceptor = new ApiRequestLoggingInterceptor(baseLogger as never);

    await lastValueFrom(interceptor.intercept(context, next));

    expect(response.setHeader).toHaveBeenCalledWith(focusbuddyRequestIdHeader, 'req-123');
    expect(response.setHeader).toHaveBeenCalledWith(focusbuddyTraceIdHeader, 'trace-123');
    expect(baseLogger.child).toHaveBeenCalledWith({
      requestId: 'req-123',
      requestMethod: 'GET',
      requestPath: '/health',
      route: '/health',
      traceId: 'trace-123',
    });
    expect(requestLogger.child).toHaveBeenCalledWith({
      application: 'focusbuddy-api',
      layer: 'api',
    });
    expect(info).toHaveBeenCalledWith('API request handled - Status: 200', {
      category: 'Request',
      logId: 'API_REQUEST_001',
      statusCode: 200,
    });
  });
});
