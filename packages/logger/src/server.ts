import pino, { type LevelWithSilent, type Logger as PinoLogger, type LoggerOptions } from 'pino'

import {
  createLogger,
  type FactoryLoggerContext,
  type LogEntry,
  type Logger,
  type LoggerRuntime,
} from './logger.js'

export type ServerLoggerOptions = {
  context?: FactoryLoggerContext
  level?: LevelWithSilent
  logger?: PinoLogger
  pinoOptions?: LoggerOptions
  runtime?: LoggerRuntime
}

const DEFAULT_SERVER_RUNTIME: LoggerRuntime = 'api'

type PinoWrite = (bindings: Record<string, unknown>, message: string) => void

function resolvePinoWrite(target: PinoLogger, level: LogEntry['level']): PinoWrite {
  switch (level) {
    case 'trace':
      return target.trace.bind(target)
    case 'debug':
      return target.debug.bind(target)
    case 'info':
      return target.info.bind(target)
    case 'warn':
      return target.warn.bind(target)
    case 'error':
      return target.error.bind(target)
    case 'fatal':
      return target.fatal.bind(target)
  }
}

export function createServerLogger(options: ServerLoggerOptions = {}): Logger {
  const targetLogger =
    options.logger ??
    pino({
      ...options.pinoOptions,
      level: options.level ?? options.pinoOptions?.level ?? 'info',
    })

  return createLogger({
    context: {
      runtime: options.runtime ?? DEFAULT_SERVER_RUNTIME,
      ...options.context,
    },
    adapter: {
      write(entry) {
        const payload: Record<string, unknown> = Object.fromEntries(
          Object.entries({
            application: entry.application,
            category: entry.category,
            context: Object.keys(entry.context).length > 0 ? entry.context : undefined,
            environment: entry.environment,
            layer: entry.layer,
            logId: entry.logId,
            requestId: entry.requestId,
            requestMethod: entry.requestMethod,
            requestPath: entry.requestPath,
            runtime: entry.runtime,
            sessionId: entry.sessionId,
            timestamp: entry.timestamp,
            traceId: entry.traceId,
            userId: entry.userId,
            userRole: entry.userRole,
          }).filter(([, value]) => value !== undefined),
        )

        if (entry.error) {
          payload.error = entry.error
        }

        resolvePinoWrite(targetLogger, entry.level)(payload, entry.message)
      },
    },
  })
}
