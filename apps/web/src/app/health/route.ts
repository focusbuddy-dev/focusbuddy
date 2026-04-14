import { NextResponse, type NextRequest } from 'next/server';

import { getWebServerServiceName } from '@/env/server';
import { logWebHealthRouteResponded } from '@/lib/logging/web-health-route-logger';
import { resolveWebRequestCorrelation } from '@/lib/logging/web-request-correlation';

export function GET(request: NextRequest) {
  const { requestId, traceId } = resolveWebRequestCorrelation(request.headers);
  const service = getWebServerServiceName();

  logWebHealthRouteResponded({
    request: {
      requestId,
      requestMethod: request.method,
      requestPath: request.nextUrl.pathname,
      traceId,
    },
    service,
    status: 200,
  });

  return NextResponse.json({ ok: true, service });
}
