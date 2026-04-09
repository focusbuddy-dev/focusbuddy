import type { Logger, RequestLogContext, UserLogContext } from '@focusbuddy/logger'
import { createServerLogger } from '@focusbuddy/logger/server'

const apiLogger = createServerLogger()

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
  createApiRequestLogger(request, user, baseLogger).info('API request handled', {
    statusCode,
  })
}
