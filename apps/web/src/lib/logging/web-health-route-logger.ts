import {
  createEventLogger,
  defineEvent,
  type Logger,
  type RequestLogContext,
} from '@focusbuddy/logger'

import { webServerRuntimeLogger } from './web-server-runtime-logger'

const webHealthRouteRespondedEvent = defineEvent<{ service: 'web'; status: number }>({
  logId: 'WEB_HEALTH_001',
  level: 'info',
  category: 'Health',
  messageTemplate: 'Web health route responded - Status: {status}',
  requiredContext: ['service', 'status'],
})

type WebHealthRouteRequestContext = RequestLogContext & {
  traceId?: string
}

type LogWebHealthRouteRespondedInput = {
  request: WebHealthRouteRequestContext
  status: number
}

export function logWebHealthRouteResponded(
  { request, status }: LogWebHealthRouteRespondedInput,
  baseLogger: Logger = webServerRuntimeLogger,
): void {
  createEventLogger(baseLogger.child(request), {
    application: 'focusbuddy-web',
    layer: 'web-server',
  }).emit(webHealthRouteRespondedEvent, {
    service: 'web',
    status,
  })
}
