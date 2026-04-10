import { focusbuddyRequestIdHeader, focusbuddyTraceIdHeader } from '@focusbuddy/logger'

type HeaderReader = Pick<Headers, 'get'>

export type WebRequestCorrelation = {
  requestId: string
  traceId: string
}

export function resolveWebRequestCorrelation(headers: HeaderReader): WebRequestCorrelation {
  const fallbackRequestId = crypto.randomUUID()
  const requestId =
    headers.get(focusbuddyRequestIdHeader) ??
    headers.get(focusbuddyTraceIdHeader) ??
    fallbackRequestId
  const traceId = headers.get(focusbuddyTraceIdHeader) ?? requestId

  return {
    requestId,
    traceId,
  }
}
