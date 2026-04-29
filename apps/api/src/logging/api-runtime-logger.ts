import type { Logger, LoggerRuntime } from '@focusbuddy/logger';
import { createServerLogger, type ServerLogWriter } from '@focusbuddy/logger/server';
import pino from 'pino';

import { getApiServerLogLevel } from '#api/env/server';

export type CreateApiRuntimeLoggerOptions = {
  logger?: ServerLogWriter;
  runtime?: LoggerRuntime;
};

export function createApiRuntimeLogger(options: CreateApiRuntimeLoggerOptions = {}): Logger {
  return createServerLogger({
    logger:
      options.logger ??
      pino({
        level: getApiServerLogLevel(),
      }),
    runtime: options.runtime ?? 'api',
  });
}
