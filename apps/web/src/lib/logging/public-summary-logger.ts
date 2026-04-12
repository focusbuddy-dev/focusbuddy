import {
  createEventLogger,
  defineEvent,
  type Logger,
  type RequestLogContext,
  type UserLogContext,
} from '@focusbuddy/logger';
import { webRuntimeLogger } from './web-runtime-logger';

const webLogger = webRuntimeLogger;

const publicSummaryViewedEvent = defineEvent<{ source: 'landing' | 'search' | 'share-card' }>({
  logId: 'PUBLIC_SUMMARY_001',
  level: 'info',
  category: 'PublicSummary',
  messageTemplate: 'Public summary viewed - Source: {source}',
  requiredContext: ['source'],
});

type PublicSummaryRequestContext = RequestLogContext & {
  route: string;
  targetId: string;
};

type PublicSummaryUserContext = UserLogContext & {
  sessionId?: string;
};

type LogPublicSummaryViewedInput = {
  request: PublicSummaryRequestContext;
  source: 'landing' | 'search' | 'share-card';
  user?: PublicSummaryUserContext;
};

export function createPublicSummaryLogger(
  request: PublicSummaryRequestContext,
  user?: PublicSummaryUserContext,
  baseLogger: Logger = webLogger,
): Logger {
  return baseLogger.child({
    ...request,
    ...user,
  });
}

export function logPublicSummaryViewed(
  { request, source, user }: LogPublicSummaryViewedInput,
  baseLogger: Logger = webLogger,
): void {
  createEventLogger(createPublicSummaryLogger(request, user, baseLogger), {
    application: 'focusbuddy-web',
    layer: 'web',
  }).emit(publicSummaryViewedEvent, {
    source,
  });
}
