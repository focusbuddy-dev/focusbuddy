import assert from 'node:assert/strict'
import test from 'node:test'

import { createBrowserLogger } from '../dist/browser.js'
import { createLogger } from '../dist/index.js'
import { createServerLogger } from '../dist/server.js'

test('merges base, request, and user context through one facade', () => {
  const writes = []

  const logger = createLogger({
    adapter: {
      write(entry) {
        writes.push(entry)
      },
    },
    context: {
      runtime: 'api',
    },
    now: () => new Date('2026-04-09T09:00:00.000Z'),
  })

  logger
    .child({
      requestId: 'req-23',
      requestMethod: 'GET',
      requestPath: '/health',
    })
    .info('Health probe completed', {
      feature: 'health',
      userId: 'user-7',
    })

  assert.deepStrictEqual(writes, [
    {
      level: 'info',
      message: 'Health probe completed',
      context: {
        runtime: 'api',
        requestId: 'req-23',
        requestMethod: 'GET',
        requestPath: '/health',
        feature: 'health',
        userId: 'user-7',
      },
      timestamp: '2026-04-09T09:00:00.000Z',
    },
  ])
})

test('routes browser logging through console-safe methods', () => {
  const calls = []
  const browserConsole = {
    debug(...args) {
      calls.push(['debug', ...args])
    },
    error(...args) {
      calls.push(['error', ...args])
    },
    info(...args) {
      calls.push(['info', ...args])
    },
    log(...args) {
      calls.push(['log', ...args])
    },
    warn(...args) {
      calls.push(['warn', ...args])
    },
  }

  const logger = createBrowserLogger({
    console: browserConsole,
    context: {
      runtime: 'web',
    },
    includeTimestamp: false,
  })

  logger.warn('Public summary was slow to render', {
    requestId: 'page-5',
    userId: 'user-7',
  })

  assert.deepStrictEqual(calls, [
    [
      'warn',
      '[WARN] Public summary was slow to render',
      {
        runtime: 'web',
        requestId: 'page-5',
        userId: 'user-7',
      },
    ],
  ])
})

test('writes server logs through a pino-compatible adapter', () => {
  const calls = []
  const serverSink = {
    trace(bindings, message) {
      calls.push(['trace', bindings, message])
    },
    debug(bindings, message) {
      calls.push(['debug', bindings, message])
    },
    info(bindings, message) {
      calls.push(['info', bindings, message])
    },
    warn(bindings, message) {
      calls.push(['warn', bindings, message])
    },
    error(bindings, message) {
      calls.push(['error', bindings, message])
    },
    fatal(bindings, message) {
      calls.push(['fatal', bindings, message])
    },
  }

  const logger = createServerLogger({
    context: {
      runtime: 'api',
    },
    logger: serverSink,
  })

  const error = new Error('database unavailable')

  logger.error('API request failed', {
    requestId: 'req-99',
    userId: 'user-3',
    error,
  })

  assert.deepStrictEqual(calls, [
    [
      'error',
      {
        runtime: 'api',
        requestId: 'req-99',
        userId: 'user-3',
        error,
      },
      'API request failed',
    ],
  ])
})