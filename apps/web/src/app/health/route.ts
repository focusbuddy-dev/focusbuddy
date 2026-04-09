import { NextResponse, type NextRequest } from 'next/server'

import {
  focusbuddyRequestIdHeader,
  focusbuddyTraceIdHeader,
} from '../../lib/logging/next-middleware-logger'
import { logWebHealthRouteResponded } from '../../lib/logging/web-health-route-logger'

export function GET(request: NextRequest) {
  const requestId =
    request.headers.get(focusbuddyRequestIdHeader) ??
    request.headers.get(focusbuddyTraceIdHeader) ??
    'web-health-request'
  const traceId = request.headers.get(focusbuddyTraceIdHeader) ?? requestId

  logWebHealthRouteResponded({
    request: {
      requestId,
      requestMethod: request.method,
      requestPath: request.nextUrl.pathname,
      traceId,
    },
    status: 200,
  })

  return NextResponse.json({ ok: true, service: 'web' })
}
