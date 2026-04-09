export const logLevels = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'] as const

export type LogLevel = (typeof logLevels)[number]

export type RequestLogContext = {
  requestId?: string
  requestMethod?: string
  requestPath?: string
}

export type UserLogContext = {
  userId?: string
  userRole?: string
}

export type LoggerContext = RequestLogContext &
  UserLogContext & {
    [key: string]: unknown
  }

export type LogEntry = {
  level: LogLevel
  message: string
  context: LoggerContext
  error?: Error
  timestamp: string
}

export type LoggerAdapter = {
  write: (entry: LogEntry) => void
}

export type CreateLoggerOptions = {
  adapter: LoggerAdapter
  context?: LoggerContext | undefined
  now?: () => Date
}

export type Logger = {
  child: (context?: LoggerContext) => Logger
  trace: (message: string, context?: LoggerContext) => void
  debug: (message: string, context?: LoggerContext) => void
  info: (message: string, context?: LoggerContext) => void
  warn: (message: string, context?: LoggerContext) => void
  error: (message: string, context?: LoggerContext) => void
  fatal: (message: string, context?: LoggerContext) => void
}

function compactContext(context?: LoggerContext): LoggerContext {
  if (!context) {
    return {}
  }

  return Object.fromEntries(
    Object.entries(context).filter(([, value]) => value !== undefined),
  ) as LoggerContext
}

function mergeContexts(baseContext?: LoggerContext, nextContext?: LoggerContext): LoggerContext {
  return compactContext({
    ...compactContext(baseContext),
    ...compactContext(nextContext),
  })
}

function splitError(context: LoggerContext): Pick<LogEntry, 'context' | 'error'> {
  const { error, ...restContext } = context

  if (error instanceof Error) {
    return {
      context: compactContext(restContext as LoggerContext),
      error,
    }
  }

  return {
    context,
  }
}

export function createLogger({ adapter, context, now = () => new Date() }: CreateLoggerOptions): Logger {
  const baseContext = compactContext(context)

  const write = (level: LogLevel, message: string, contextForEntry?: LoggerContext) => {
    const mergedContext = mergeContexts(baseContext, contextForEntry)
    const entryShape = splitError(mergedContext)

    adapter.write({
      ...entryShape,
      level,
      message,
      timestamp: now().toISOString(),
    })
  }

  return {
    child(childContext) {
      return createLogger({
        adapter,
        context: mergeContexts(baseContext, childContext),
        now,
      })
    },
    trace(message, contextForEntry) {
      write('trace', message, contextForEntry)
    },
    debug(message, contextForEntry) {
      write('debug', message, contextForEntry)
    },
    info(message, contextForEntry) {
      write('info', message, contextForEntry)
    },
    warn(message, contextForEntry) {
      write('warn', message, contextForEntry)
    },
    error(message, contextForEntry) {
      write('error', message, contextForEntry)
    },
    fatal(message, contextForEntry) {
      write('fatal', message, contextForEntry)
    },
  }
}

export function createNoopLogger(context?: LoggerContext): Logger {
  return createLogger({
    adapter: {
      write() {},
    },
    context,
  })
}