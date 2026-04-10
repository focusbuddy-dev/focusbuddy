/** Supported severity levels in ascending order of importance. */
export const logLevels = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'] as const

/** Union type derived from the supported severity levels. */
export type LogLevel = (typeof logLevels)[number]

/** Request-scoped correlation fields shared across application runtimes. */
export type RequestLogContext = {
  requestId?: string
  requestMethod?: string
  requestPath?: string
}

/** Runtime label recorded on emitted log entries. */
export type LoggerRuntime = 'api' | 'web' | (string & {})

/** Environment label recorded when logs need deployment context. */
export type LoggerEnvironment = 'development' | 'test' | 'staging' | 'production' | (string & {})

/** User identity fields that can be bound to a logger instance. */
export type UserLogContext = {
  userId?: string
  userRole?: string
}

/** Session-scoped identifiers for browser or workflow activity. */
export type SessionLogContext = {
  sessionId?: string
}

/**
 * Reserved top-level fields that are promoted into the structured log envelope
 * instead of remaining inside the nested context payload.
 */
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

/**
 * Context accepted by logger factories and log calls.
 * Envelope keys become top-level entry fields and all other keys stay inside entry.context.
 */
export type LoggerContext = LoggerEnvelopeContext & {
  [key: string]: unknown
}

/** Factory-time context that lets adapters choose their own runtime label. */
export type FactoryLoggerContext = Omit<LoggerContext, 'runtime'>

/** Structured entry shape delivered to concrete runtime adapters. */
export type LogEntry = LoggerEnvelopeContext & {
  level: LogLevel
  message: string
  context: Record<string, unknown>
  error?: Error
  timestamp: string
}

/** Adapter contract used to bridge the shared logger facade to a concrete sink. */
export type LoggerAdapter = {
  write: (entry: LogEntry) => void
}

/** Options for constructing a logger instance with initial context and clock control. */
export type CreateLoggerOptions = {
  adapter: LoggerAdapter
  context?: LoggerContext | undefined
  now?: () => Date
}

/** Shared logging facade exposed to application code across runtimes. */
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

function compactRecord<T extends Record<string, unknown>>(record?: T): T {
  if (!record) {
    return {} as T
  }

  return Object.fromEntries(
    Object.entries(record).filter(([, value]) => value !== undefined),
  ) as T
}

function isEnvelopeContextKey(key: string): key is (typeof envelopeContextKeys)[number] {
  return (envelopeContextKeys as readonly string[]).includes(key)
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

/** Creates a structured logger facade backed by the provided adapter. */
export function createLogger({ adapter, context, now = () => new Date() }: CreateLoggerOptions): Logger {
  return createLoggerFromState({
    adapter,
    now,
    state: splitContext(context),
  })
}

/** Creates a logger that preserves context behavior but discards all writes. */
export function createNoopLogger(context?: LoggerContext): Logger {
  return createLogger({
    adapter: {
      write() {},
    },
    context,
  })
}
