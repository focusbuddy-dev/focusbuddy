import {
  createEventLogger,
  focusbuddyRequestIdHeader,
  focusbuddyTraceIdHeader,
  type EventLogger,
  type Logger,
} from '@focusbuddy/logger';
import type { NextRequest } from 'next/server';

import { createWebServerRuntimeLogger } from './web-server-runtime-logger';

export { focusbuddyRequestIdHeader, focusbuddyTraceIdHeader } from '@focusbuddy/logger';

type MiddlewareRequestLike = Pick<NextRequest, 'headers' | 'method'> & {
  nextUrl: {
    pathname: string;
  };
};

export type NextMiddlewareLoggerOptions = {
  application?: string;
  baseLogger?: Logger;
  environment?: string;
};

export type PreparedNextMiddlewareLogger = {
  eventLogger: EventLogger;
  logger: Logger;
  requestHeaders: Headers;
  requestId: string;
  responseHeaders: Headers;
  traceId: string;
};

const middlewareRuntime = 'web-middleware';

function createCorrelationId(): string {
  return crypto.randomUUID();
}

export function prepareNextMiddlewareLogger(
  request: MiddlewareRequestLike,
  options: NextMiddlewareLoggerOptions = {},
): PreparedNextMiddlewareLogger {
  const requestId =
    request.headers.get(focusbuddyRequestIdHeader) ??
    request.headers.get(focusbuddyTraceIdHeader) ??
    createCorrelationId();
  const traceId = request.headers.get(focusbuddyTraceIdHeader) ?? requestId;

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(focusbuddyRequestIdHeader, requestId);
  requestHeaders.set(focusbuddyTraceIdHeader, traceId);

  const responseHeaders = new Headers();
  responseHeaders.set(focusbuddyRequestIdHeader, requestId);
  responseHeaders.set(focusbuddyTraceIdHeader, traceId);

  const logger = (
    options.baseLogger ??
    createWebServerRuntimeLogger({
      runtime: middlewareRuntime,
    })
  ).child({
    requestId,
    requestMethod: request.method,
    requestPath: request.nextUrl.pathname,
    runtime: middlewareRuntime,
    traceId,
  });

  return {
    eventLogger: createEventLogger(logger, {
      application: options.application ?? 'focusbuddy-web',
      layer: 'middleware',
      ...(options.environment ? { environment: options.environment } : {}),
    }),
    logger,
    requestHeaders,
    requestId,
    responseHeaders,
    traceId,
  };
}
