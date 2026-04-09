import {
  createEventLogger,
  defineEvent,
  type Logger,
  type RequestLogContext,
  type UserLogContext,
} from '@focusbuddy/logger'
import { createServerLogger } from '@focusbuddy/logger/server'

const apiLogger = createServerLogger()

const apiRequestHandledEvent = defineEvent<{ statusCode: number }>({
  logId: 'API_REQUEST_001',
  level: 'info',
  category: 'Request',
  messageTemplate: 'API request handled - Status: {statusCode}',
  requiredContext: ['statusCode'],
})

type ApiRequestContext = RequestLogContext & {
  route: string
}

type ApiUserContext = UserLogContext & {
  workspaceId?: string
}

type LogApiRequestHandledInput = {
  request: ApiRequestContext
  user?: ApiUserContext
  statusCode: number
}

export function createApiRequestLogger(
  request: ApiRequestContext,
  user?: ApiUserContext,
  baseLogger: Logger = apiLogger,
): Logger {
  return baseLogger.child({
    ...request,
    ...user,
  })
}

export function logApiRequestHandled(
  { request, user, statusCode }: LogApiRequestHandledInput,
  baseLogger: Logger = apiLogger,
): void {
  createEventLogger(createApiRequestLogger(request, user, baseLogger), {
    application: 'focusbuddy-api',
    layer: 'api',
  }).emit(apiRequestHandledEvent, {
    statusCode,
  })
}
