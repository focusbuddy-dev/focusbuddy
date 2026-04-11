import { defineEvent } from '@focusbuddy/logger';
import { NextResponse, type NextRequest } from 'next/server';

import { prepareNextMiddlewareLogger } from '@/lib/logging/next-middleware-logger';

const middlewareMatchedEvent = defineEvent<{ pathname: string }>({
  logId: 'WEB_MIDDLEWARE_001',
  level: 'info',
  category: 'Middleware',
  messageTemplate: 'Middleware processed request for {pathname}',
  requiredContext: ['pathname'],
});

export function middleware(request: NextRequest): NextResponse {
  const prepared = prepareNextMiddlewareLogger(request);

  prepared.eventLogger.emit(middlewareMatchedEvent, {
    pathname: request.nextUrl.pathname,
  });

  const response = NextResponse.next({
    request: {
      headers: prepared.requestHeaders,
    },
  });

  for (const [headerName, value] of prepared.responseHeaders.entries()) {
    response.headers.set(headerName, value);
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};