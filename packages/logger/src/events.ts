import { type Logger, type LoggerContext, type LogLevel } from './logger.js'

/** Free-form event fields supplied when emitting a named structured event. */
export type EventContext = Record<string, unknown>

/** Declarative schema for one named log event. */
export type EventDefinition<TContext extends EventContext> = {
  category: string
  level: LogLevel
  logId: string
  messageTemplate: string
  requiredContext?: readonly (keyof TContext)[]
}

/** Stable envelope fields bound once for a scoped event logger. */
export type EventLoggerEnvelope = Pick<LoggerContext, 'application' | 'environment' | 'layer'>

/** Event-oriented facade that adds typed schemas on top of the base logger. */
export type EventLogger = {
  child: (context?: LoggerContext) => EventLogger
  emit: <TContext extends EventContext>(event: EventDefinition<TContext>, context: TContext) => void
}

/** Defines an event schema while preserving its generic context type. */
export function defineEvent<TContext extends EventContext>(
  definition: EventDefinition<TContext>,
): EventDefinition<TContext> {
  return definition
}

function validateRequiredContext<TContext extends EventContext>(
  event: EventDefinition<TContext>,
  context: TContext,
): void {
  for (const key of event.requiredContext ?? []) {
    if (context[key] === undefined) {
      throw new Error(`Missing required event field: ${event.logId}.${String(key)}`)
    }
  }
}

/** Renders an event message by substituting token placeholders from the provided context. */
export function formatEventMessage<TContext extends EventContext>(
  template: string,
  context: TContext,
): string {
  return template.replaceAll(/\{([a-zA-Z0-9_]+)\}/g, (_, token: string) => {
    const value = context[token]

    if (value === undefined) {
      throw new Error(`Missing message template field: ${token}`)
    }

    return String(value)
  })
}

function createScopedEventLogger(logger: Logger): EventLogger {
  return {
    child(context) {
      return createScopedEventLogger(logger.child(context))
    },
    emit(event, context) {
      validateRequiredContext(event, context)

      logger[event.level](formatEventMessage(event.messageTemplate, context), {
        ...context,
        category: event.category,
        logId: event.logId,
      })
    },
  }
}

/** Creates an event logger that binds a fixed envelope once and emits typed events. */
export function createEventLogger(logger: Logger, envelope: EventLoggerEnvelope): EventLogger {
  return createScopedEventLogger(logger.child(envelope))
}
