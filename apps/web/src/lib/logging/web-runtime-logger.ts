import type { Logger, LoggerRuntime } from '@focusbuddy/logger'
import { createBrowserLogger, type BrowserConsole } from '@focusbuddy/logger/browser'

export type CreateWebRuntimeLoggerOptions = {
  console?: BrowserConsole
  runtime?: LoggerRuntime
}

export function createWebRuntimeLogger(options: CreateWebRuntimeLoggerOptions = {}): Logger {
  return createBrowserLogger({
    runtime: options.runtime ?? 'web',
    ...(options.console ? { console: options.console } : {}),
  })
}

export const webRuntimeLogger = createWebRuntimeLogger()