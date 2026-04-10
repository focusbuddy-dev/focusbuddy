import {
  createLogger,
  type FactoryLoggerContext,
  type LogEntry,
  type Logger,
  type LoggerRuntime,
} from './logger.js'

/** Minimal structured writer interface required by the server logger adapter. */
export type ServerLogWriter = {
  trace: (bindings: Record<string, unknown>, message: string) => void
  debug: (bindings: Record<string, unknown>, message: string) => void
  info: (bindings: Record<string, unknown>, message: string) => void
  warn: (bindings: Record<string, unknown>, message: string) => void
  error: (bindings: Record<string, unknown>, message: string) => void
  fatal: (bindings: Record<string, unknown>, message: string) => void
}

/** Options for creating a server logger bound to an application-owned sink. */
export type ServerLoggerOptions = {
  context?: FactoryLoggerContext
  logger: ServerLogWriter
  runtime?: LoggerRuntime
}

const DEFAULT_SERVER_RUNTIME: LoggerRuntime = 'api'

type ServerWrite = (bindings: Record<string, unknown>, message: string) => void

function resolveServerWrite(target: ServerLogWriter, level: LogEntry['level']): ServerWrite {
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

/** Creates a server logger that forwards structured entries to a sink such as pino. */
export function createServerLogger(options: ServerLoggerOptions): Logger {
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

        resolveServerWrite(options.logger, entry.level)(payload, entry.message)
      },
    },
  })
}
