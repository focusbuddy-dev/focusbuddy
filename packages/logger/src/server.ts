import pino, { type LevelWithSilent, type Logger as PinoLogger, type LoggerOptions } from 'pino'

import { createLogger, type LogEntry, type Logger, type LoggerContext } from './logger.js'

export type ServerLoggerOptions = {
  context?: LoggerContext
  level?: LevelWithSilent
  logger?: PinoLogger
  pinoOptions?: LoggerOptions
}

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
    context: options.context,
    adapter: {
      write(entry) {
        const payload: Record<string, unknown> = {
          ...entry.context,
        }

        if (entry.error) {
          payload.error = entry.error
        }

        resolvePinoWrite(targetLogger, entry.level)(payload, entry.message)
      },
    },
  })
}
