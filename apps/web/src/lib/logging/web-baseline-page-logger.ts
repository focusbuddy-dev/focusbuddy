import {
  createEventLogger,
  defineEvent,
  type Logger,
  type RequestLogContext,
  type UserLogContext,
} from '@focusbuddy/logger'

import { webRuntimeLogger } from './web-runtime-logger'

const baselinePageViewedEvent = defineEvent<{ view: string }>({
  logId: 'WEB_BASELINE_001',
  level: 'info',
  category: 'WebBaselinePage',
  messageTemplate: 'Baseline page viewed - View: {view}',
  requiredContext: ['view'],
})

const baselineButtonClickedEvent = defineEvent<{ action: string; actionTarget: string }>({
  logId: 'WEB_BASELINE_002',
  level: 'info',
  category: 'WebBaselinePage',
  messageTemplate: 'Baseline page button clicked - Action: {action} Target: {actionTarget}',
  requiredContext: ['action', 'actionTarget'],
})

const baselineNavigationCompletedEvent = defineEvent<{ destination: string; trigger: string }>({
  logId: 'WEB_BASELINE_003',
  level: 'info',
  category: 'WebBaselinePage',
  messageTemplate: 'Baseline page navigation completed - Destination: {destination}',
  requiredContext: ['destination', 'trigger'],
})

type WebBaselinePageRequestContext = RequestLogContext & {
  route: string
  targetId: string
  traceId?: string
}

type WebBaselinePageUserContext = UserLogContext & {
  sessionId?: string
}

type LogWebBaselinePageViewedInput = {
  request: WebBaselinePageRequestContext
  user?: WebBaselinePageUserContext
  view: string
}

type LogWebBaselineButtonClickedInput = {
  action: string
  actionTarget: string
  request: WebBaselinePageRequestContext
  user?: WebBaselinePageUserContext
}

type LogWebBaselineNavigationCompletedInput = {
  destination: string
  request: WebBaselinePageRequestContext
  trigger: string
  user?: WebBaselinePageUserContext
}

export function createWebBaselinePageLogger(
  request: WebBaselinePageRequestContext,
  user?: WebBaselinePageUserContext,
  baseLogger: Logger = webRuntimeLogger,
): Logger {
  return baseLogger.child({
    ...request,
    ...user,
  })
}

export function logWebBaselinePageViewed(
  { request, user, view }: LogWebBaselinePageViewedInput,
  baseLogger: Logger = webRuntimeLogger,
): void {
  createEventLogger(createWebBaselinePageLogger(request, user, baseLogger), {
    application: 'focusbuddy-web',
    layer: 'web-client',
  }).emit(baselinePageViewedEvent, {
    view,
  })
}

export function logWebBaselineButtonClicked(
  { action, actionTarget, request, user }: LogWebBaselineButtonClickedInput,
  baseLogger: Logger = webRuntimeLogger,
): void {
  createEventLogger(createWebBaselinePageLogger(request, user, baseLogger), {
    application: 'focusbuddy-web',
    layer: 'web-client',
  }).emit(baselineButtonClickedEvent, {
    action,
    actionTarget,
  })
}

export function logWebBaselineNavigationCompleted(
  { destination, request, trigger, user }: LogWebBaselineNavigationCompletedInput,
  baseLogger: Logger = webRuntimeLogger,
): void {
  createEventLogger(createWebBaselinePageLogger(request, user, baseLogger), {
    application: 'focusbuddy-web',
    layer: 'web-client',
  }).emit(baselineNavigationCompletedEvent, {
    destination,
    trigger,
  })
}
