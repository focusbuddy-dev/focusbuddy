import { createLogger, type LogEntry, type Logger, type LoggerContext } from './logger'

export type BrowserConsole = {
  debug: (...args: unknown[]) => void
  error: (...args: unknown[]) => void
  info: (...args: unknown[]) => void
  log: (...args: unknown[]) => void
  warn: (...args: unknown[]) => void
}

export type BrowserLoggerOptions = {
  console?: BrowserConsole
  context?: LoggerContext
  includeTimestamp?: boolean
}

const levelToConsoleMethod: Record<LogEntry['level'], keyof BrowserConsole> = {
  trace: 'debug',
  debug: 'debug',
  info: 'info',
  warn: 'warn',
  error: 'error',
  fatal: 'error',
}

function hasContext(context: LoggerContext): boolean {
  return Object.keys(context).length > 0
}

function buildMessagePrefix(entry: LogEntry, includeTimestamp: boolean): string {
  const level = entry.level.toUpperCase()

  if (!includeTimestamp) {
    return `[${level}] ${entry.message}`
  }

  return `${entry.timestamp} [${level}] ${entry.message}`
}

export function createBrowserLogger(options: BrowserLoggerOptions = {}): Logger {
  const targetConsole = options.console ?? console
  const includeTimestamp = options.includeTimestamp ?? true

  return createLogger({
    context: options.context,
    adapter: {
      write(entry) {
        const consoleMethod = targetConsole[levelToConsoleMethod[entry.level]] ?? targetConsole.log
        const messagePrefix = buildMessagePrefix(entry, includeTimestamp)

        if (entry.error && hasContext(entry.context)) {
          consoleMethod(messagePrefix, entry.context, entry.error)
          return
        }

        if (entry.error) {
          consoleMethod(messagePrefix, entry.error)
          return
        }

        if (hasContext(entry.context)) {
          consoleMethod(messagePrefix, entry.context)
          return
        }

        consoleMethod(messagePrefix)
      },
    },
  })
}