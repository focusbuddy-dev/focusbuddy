import type { Logger, LoggerRuntime } from '@focusbuddy/logger'
import { createServerLogger, type ServerLogWriter } from '@focusbuddy/logger/server'

type ServerConsole = Pick<Console, 'debug' | 'error' | 'info' | 'warn'>

export type CreateWebServerRuntimeLoggerOptions = {
  console?: ServerConsole
  runtime?: LoggerRuntime
}

function createConsoleServerWriter(targetConsole: ServerConsole): ServerLogWriter {
  return {
    trace(bindings, message) {
      targetConsole.debug(bindings, message)
    },
    debug(bindings, message) {
      targetConsole.debug(bindings, message)
    },
    info(bindings, message) {
      targetConsole.info(bindings, message)
    },
    warn(bindings, message) {
      targetConsole.warn(bindings, message)
    },
    error(bindings, message) {
      targetConsole.error(bindings, message)
    },
    fatal(bindings, message) {
      targetConsole.error(bindings, message)
    },
  }
}

export function createWebServerRuntimeLogger(
  options: CreateWebServerRuntimeLoggerOptions = {},
): Logger {
  return createServerLogger({
    logger: createConsoleServerWriter(options.console ?? console),
    runtime: options.runtime ?? 'web-server',
  })
}

export const webServerRuntimeLogger = createWebServerRuntimeLogger()
