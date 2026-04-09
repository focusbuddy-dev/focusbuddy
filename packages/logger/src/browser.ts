import {
  createLogger,
  type FactoryLoggerContext,
  type LogEntry,
  type Logger,
  type LoggerRuntime,
} from './logger.js'

export type BrowserConsole = {
  debug: (...args: unknown[]) => void
  error: (...args: unknown[]) => void
  info: (...args: unknown[]) => void
  log: (...args: unknown[]) => void
  warn: (...args: unknown[]) => void
}

export type BrowserLoggerOptions = {
  console?: BrowserConsole
  context?: FactoryLoggerContext
  includeTimestamp?: boolean
  runtime?: LoggerRuntime
}

const DEFAULT_BROWSER_RUNTIME: LoggerRuntime = 'web'

const levelToConsoleMethod: Record<LogEntry['level'], keyof BrowserConsole> = {
  trace: 'debug',
  debug: 'debug',
  info: 'info',
  warn: 'warn',
  error: 'error',
  fatal: 'error',
}

function buildBrowserPayload(entry: LogEntry, includeTimestamp: boolean): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries({
      application: entry.application,
      category: entry.category,
      context: Object.keys(entry.context).length > 0 ? entry.context : undefined,
      environment: entry.environment,
      layer: entry.layer,
      level: entry.level,
      logId: entry.logId,
      message: entry.message,
      requestId: entry.requestId,
      requestMethod: entry.requestMethod,
      requestPath: entry.requestPath,
      runtime: entry.runtime,
      sessionId: entry.sessionId,
      timestamp: includeTimestamp ? entry.timestamp : undefined,
      traceId: entry.traceId,
      userId: entry.userId,
      userRole: entry.userRole,
    }).filter(([, value]) => value !== undefined),
  )
}

export function createBrowserLogger(options: BrowserLoggerOptions = {}): Logger {
  const targetConsole = options.console ?? console
  const includeTimestamp = options.includeTimestamp ?? true

  return createLogger({
    context: {
      runtime: options.runtime ?? DEFAULT_BROWSER_RUNTIME,
      ...options.context,
    },
    adapter: {
      write(entry) {
        const consoleMethod = targetConsole[levelToConsoleMethod[entry.level]] ?? targetConsole.log
        const payload = buildBrowserPayload(entry, includeTimestamp)

        if (entry.error) {
          consoleMethod(payload, entry.error)
          return
        }

        consoleMethod(payload)
      },
    },
  })
}
