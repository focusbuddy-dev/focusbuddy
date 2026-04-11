import type { CallHandler, ExecutionContext } from '@nestjs/common';
import { lastValueFrom, of } from 'rxjs';

jest.mock('@focusbuddy/logger', () => ({
  focusbuddyRequestIdHeader: 'x-focusbuddy-request-id',
  focusbuddyTraceIdHeader: 'x-focusbuddy-trace-id',
}))

const logApiRequestHandled = jest.fn()

jest.mock('#api/logging/api-request-logger.example', () => ({
  logApiRequestHandled: (...args: unknown[]) => logApiRequestHandled(...args),
}))

jest.mock('#api/logging/api-runtime-logger', () => ({
  apiRuntimeLogger: {},
}))

import { ApiRequestLoggingInterceptor } from '#api/logging/api-request-logging.interceptor';

describe('ApiRequestLoggingInterceptor', () => {
  it('binds correlation headers and emits a handled request event', async () => {
    logApiRequestHandled.mockReset()

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

    const interceptor = new ApiRequestLoggingInterceptor({} as never);

    await lastValueFrom(interceptor.intercept(context, next));

    expect(response.setHeader).toHaveBeenCalledWith('x-focusbuddy-request-id', 'req-123');
    expect(response.setHeader).toHaveBeenCalledWith('x-focusbuddy-trace-id', 'trace-123');
    expect(logApiRequestHandled).toHaveBeenCalledWith(
      {
        request: {
          requestId: 'req-123',
          requestMethod: 'GET',
          requestPath: '/health',
          route: '/health',
          traceId: 'trace-123',
        },
        statusCode: 200,
      },
      {},
    )
  });
});