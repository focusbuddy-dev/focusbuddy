import {
  createEventLogger,
  defineEvent,
  type Logger,
  type RequestLogContext,
  type UserLogContext,
} from '@focusbuddy/logger';
import { apiRuntimeLogger } from '#api/logging/api-runtime-logger';

const apiLogger = apiRuntimeLogger;

const apiRequestHandledEvent = defineEvent<{ durationMs: number; statusCode: number }>({
  logId: 'API_REQUEST_001',
  level: 'info',
  category: 'Request',
  messageTemplate: 'API request handled - Status: {statusCode}',
  requiredContext: ['statusCode', 'durationMs'],
});

type ApiRequestContext = RequestLogContext & {
  route: string;
  traceId?: string;
};

type ApiUserContext = UserLogContext & {
  workspaceId?: string;
};

type LogApiRequestHandledInput = {
  durationMs: number;
  request: ApiRequestContext;
  user?: ApiUserContext;
  statusCode: number;
};

/**
 * Role: Builds the shared request-scoped logger facade for API request logs.
 * Boundary: Logging adapter only. Must not own request timing or response policy.
 */
export function createApiRequestLogger(
  request: ApiRequestContext,
  user?: ApiUserContext,
  baseLogger: Logger = apiLogger,
): Logger {
  return baseLogger.child({
    ...request,
    ...user,
  });
}

/**
 * Role: Emits the handled-request event with the normalized API request log context.
 * Boundary: Success-path request logging only. Must not infer exception outcomes.
 */
export function logApiRequestHandled(
  { durationMs, request, user, statusCode }: LogApiRequestHandledInput,
  baseLogger: Logger = apiLogger,
): void {
  createEventLogger(createApiRequestLogger(request, user, baseLogger), {
    application: 'focusbuddy-api',
    layer: 'api',
  }).emit(apiRequestHandledEvent, {
    durationMs,
    statusCode,
  });
}
