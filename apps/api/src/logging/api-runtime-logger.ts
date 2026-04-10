import type { Logger, LoggerRuntime } from '@focusbuddy/logger'
import { createServerLogger, type ServerLogWriter } from '@focusbuddy/logger/server'
import pino from 'pino'

export type CreateApiRuntimeLoggerOptions = {
  logger?: ServerLogWriter
  runtime?: LoggerRuntime
}

export function createApiRuntimeLogger(options: CreateApiRuntimeLoggerOptions = {}): Logger {
  return createServerLogger({
    logger: options.logger ?? pino({
      level: process.env.LOG_LEVEL ?? 'info',
    }),
    runtime: options.runtime ?? 'api',
  })
}

export const apiRuntimeLogger = createApiRuntimeLogger()