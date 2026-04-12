import { type Logger, type LoggerContext, type LogLevel } from './logger.js';

export type EventContext = Record<string, unknown>;

export type EventDefinition<TContext extends EventContext> = {
  category: string;
  level: LogLevel;
  logId: string;
  messageTemplate: string;
  requiredContext?: readonly (keyof TContext)[];
};

export type EventLoggerEnvelope = Pick<LoggerContext, 'application' | 'environment' | 'layer'>;

export type EventLogger = {
  child: (context?: LoggerContext) => EventLogger;
  emit: <TContext extends EventContext>(
    event: EventDefinition<TContext>,
    context: TContext,
  ) => void;
};

export function defineEvent<TContext extends EventContext>(
  definition: EventDefinition<TContext>,
): EventDefinition<TContext> {
  return definition;
}

function validateRequiredContext<TContext extends EventContext>(
  event: EventDefinition<TContext>,
  context: TContext,
): void {
  for (const key of event.requiredContext ?? []) {
    if (context[key] === undefined) {
      throw new Error(`Missing required event field: ${event.logId}.${String(key)}`);
    }
  }
}

export function formatEventMessage<TContext extends EventContext>(
  template: string,
  context: TContext,
): string {
  return template.replaceAll(/\{([a-zA-Z0-9_]+)\}/g, (_, token: string) => {
    const value = context[token];

    if (value === undefined) {
      throw new Error(`Missing message template field: ${token}`);
    }

    return String(value);
  });
}

function createScopedEventLogger(logger: Logger): EventLogger {
  return {
    child(context) {
      return createScopedEventLogger(logger.child(context));
    },
    emit(event, context) {
      validateRequiredContext(event, context);

      logger[event.level](formatEventMessage(event.messageTemplate, context), {
        ...context,
        category: event.category,
        logId: event.logId,
      });
    },
  };
}

export function createEventLogger(logger: Logger, envelope: EventLoggerEnvelope): EventLogger {
  return createScopedEventLogger(logger.child(envelope));
}
