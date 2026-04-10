import { NextResponse, type NextRequest } from 'next/server'

import { resolveWebRequestCorrelation } from '../../lib/logging/web-request-correlation'
import { logWebHealthRouteResponded } from '../../lib/logging/web-health-route-logger'

export function GET(request: NextRequest) {
  const { requestId, traceId } = resolveWebRequestCorrelation(request.headers)

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
