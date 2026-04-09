import { Injectable, type CallHandler, type ExecutionContext, type NestInterceptor } from '@nestjs/common';
import type { Logger } from '@focusbuddy/logger';
import { focusbuddyRequestIdHeader, focusbuddyTraceIdHeader } from '@focusbuddy/logger';
import { Observable, tap } from 'rxjs';

import { logApiRequestHandled } from './api-request-logger.example';
import { apiRuntimeLogger } from './api-runtime-logger';

type ApiRequestLike = {
  headers: Record<string, string | string[] | undefined>;
  method: string;
  originalUrl?: string;
  route?: {
    path?: string;
  };
  url?: string;
  user?: {
    id?: string;
    role?: string;
    workspaceId?: string;
  };
};

type ApiResponseLike = {
  setHeader: (name: string, value: string) => void;
  statusCode: number;
};

function readHeader(
  headers: Record<string, string | string[] | undefined>,
  headerName: string,
): string | undefined {
  const directValue = headers[headerName] ?? headers[headerName.toLowerCase()];

  if (Array.isArray(directValue)) {
    return directValue[0];
  }

  return directValue;
}

@Injectable()
export class ApiRequestLoggingInterceptor implements NestInterceptor {
  constructor(private readonly baseLogger: Logger = apiRuntimeLogger) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const http = context.switchToHttp();
    const request = http.getRequest<ApiRequestLike>();
    const response = http.getResponse<ApiResponseLike>();
    const requestId =
      readHeader(request.headers, focusbuddyRequestIdHeader) ??
      readHeader(request.headers, focusbuddyTraceIdHeader) ??
      crypto.randomUUID();
    const traceId = readHeader(request.headers, focusbuddyTraceIdHeader) ?? requestId;
    const requestPath = request.originalUrl ?? request.url ?? request.route?.path ?? 'unknown';
    const route = request.route?.path ?? requestPath;

    response.setHeader(focusbuddyRequestIdHeader, requestId);
    response.setHeader(focusbuddyTraceIdHeader, traceId);

    return next.handle().pipe(
      tap(() => {
        logApiRequestHandled(
          {
            request: {
              requestId,
              requestMethod: request.method,
              requestPath,
              route,
              traceId,
            },
            ...(request.user
              ? {
                  user: {
                    userId: request.user.id,
                    userRole: request.user.role,
                    workspaceId: request.user.workspaceId,
                  },
                }
              : {}),
            statusCode: response.statusCode,
          },
          this.baseLogger,
        );
      }),
    );
  }
}