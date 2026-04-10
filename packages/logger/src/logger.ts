export const logLevels = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'] as const

export type LogLevel = (typeof logLevels)[number]

export type RequestLogContext = {
  requestId?: string
  requestMethod?: string
  requestPath?: string
}

export type LoggerRuntime = 'api' | 'web' | (string & {})

export type LoggerEnvironment = 'development' | 'test' | 'staging' | 'production' | (string & {})

export type UserLogContext = {
  userId?: string
  userRole?: string
}

export type SessionLogContext = {
  sessionId?: string
}

export type LoggerEnvelopeContext = RequestLogContext &
  UserLogContext &
  SessionLogContext & {
    application?: string
    category?: string
    environment?: LoggerEnvironment
    layer?: string
    logId?: string
    runtime?: LoggerRuntime
    traceId?: string
  }

export type LoggerContext = LoggerEnvelopeContext & {
  [key: string]: unknown
}

export type FactoryLoggerContext = Omit<LoggerContext, 'runtime'>

export type LogEntry = LoggerEnvelopeContext & {
  level: LogLevel
  message: string
  context: Record<string, unknown>
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

type LoggerState = {
  context: Record<string, unknown>
  envelope: LoggerEnvelopeContext
  error?: Error
}

const envelopeContextKeys = [
  'application',
  'category',
  'environment',
  'layer',
  'logId',
  'requestId',
  'requestMethod',
  'requestPath',
  'runtime',
  'sessionId',
  'traceId',
  'userId',
  'userRole',
] as const

const envelopeContextKeySet = new Set<string>(envelopeContextKeys)

function compactRecord<T extends Record<string, unknown>>(record?: T): T {
  if (!record) {
    return {} as T
  }

  return Object.fromEntries(
    Object.entries(record).filter(([, value]) => value !== undefined),
  ) as T
}

function isEnvelopeContextKey(key: string): key is (typeof envelopeContextKeys)[number] {
  return envelopeContextKeySet.has(key)
}

function splitContext(context?: LoggerContext): LoggerState {
  const compactedContext = compactRecord(context)
  const envelope: LoggerEnvelopeContext = {}
  const extraContext: Record<string, unknown> = {}
  let error: Error | undefined

  for (const [key, value] of Object.entries(compactedContext)) {
    if (key === 'error' && value instanceof Error) {
      error = value
      continue
    }

    if (isEnvelopeContextKey(key)) {
      ;(envelope as Record<string, unknown>)[key] = value
      continue
    }

    extraContext[key] = value
  }

  return {
    context: extraContext,
    envelope,
    ...(error ? { error } : {}),
  }
}

function mergeStates(baseState: LoggerState, nextState: LoggerState): LoggerState {
  const error = nextState.error ?? baseState.error

  return {
    context: compactRecord({
      ...baseState.context,
      ...nextState.context,
    }),
    envelope: compactRecord({
      ...baseState.envelope,
      ...nextState.envelope,
    }),
    ...(error ? { error } : {}),
  }
}

function createLoggerFromState({
  adapter,
  now,
  state,
}: {
  adapter: LoggerAdapter
  now: () => Date
  state: LoggerState
}): Logger {
  const write = (level: LogLevel, message: string, contextForEntry?: LoggerContext) => {
    const mergedState = mergeStates(state, splitContext(contextForEntry))

    adapter.write({
      ...mergedState.envelope,
      context: mergedState.context,
      ...(mergedState.error ? { error: mergedState.error } : {}),
      level,
      message,
      timestamp: now().toISOString(),
    })
  }

  return {
    child(childContext) {
      return createLoggerFromState({
        adapter,
        now,
        state: mergeStates(state, splitContext(childContext)),
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

export function createLogger({ adapter, context, now = () => new Date() }: CreateLoggerOptions): Logger {
  return createLoggerFromState({
    adapter,
    now,
    state: splitContext(context),
  })
}

export function createNoopLogger(context?: LoggerContext): Logger {
  return createLogger({
    adapter: {
      write() {},
    },
    context,
  })
}
