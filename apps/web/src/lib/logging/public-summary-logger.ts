import type { Logger, RequestLogContext, UserLogContext } from '@focusbuddy/logger'
import { createBrowserLogger } from '@focusbuddy/logger/browser'

const webLogger = createBrowserLogger()

type PublicSummaryRequestContext = RequestLogContext & {
  route: string
  targetId: string
}

type PublicSummaryUserContext = UserLogContext & {
  sessionId?: string
}

type LogPublicSummaryViewedInput = {
  request: PublicSummaryRequestContext
  source: 'landing' | 'search' | 'share-card'
  user?: PublicSummaryUserContext
}

export function createPublicSummaryLogger(
  request: PublicSummaryRequestContext,
  user?: PublicSummaryUserContext,
  baseLogger: Logger = webLogger,
): Logger {
  return baseLogger.child({
    ...request,
    ...user,
  })
}

export function logPublicSummaryViewed(
  { request, source, user }: LogPublicSummaryViewedInput,
  baseLogger: Logger = webLogger,
): void {
  createPublicSummaryLogger(request, user, baseLogger).info('Public summary viewed', {
    source,
  })
}
