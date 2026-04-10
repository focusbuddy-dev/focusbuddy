import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import test from 'node:test'

import { createBrowserLogger } from '../dist/browser.js'
import { createEventLogger, createLogger, defineEvent } from '../dist/index.js'
import { createServerLogger } from '../dist/server.js'

const require = createRequire(import.meta.url)

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
      runtime: 'api',
      requestId: 'req-23',
      requestMethod: 'GET',
      requestPath: '/health',
      userId: 'user-7',
      context: {
        feature: 'health',
      },
      timestamp: '2026-04-09T09:00:00.000Z',
    },
  ])
})

test('routes browser logging through console-safe methods and defaults runtime to web', () => {
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
    includeTimestamp: false,
  })

  logger.warn('Public summary was slow to render', {
    requestId: 'page-5',
    userId: 'user-7',
  })

  assert.deepStrictEqual(calls, [
    [
      'warn',
      {
        level: 'warn',
        message: 'Public summary was slow to render',
        runtime: 'web',
        requestId: 'page-5',
        userId: 'user-7',
      },
    ],
  ])
})

test('writes server logs through a pino-compatible adapter and defaults runtime to api', () => {
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
    logger: serverSink,
  })

  const error = new Error('database unavailable')

  logger.error('API request failed', {
    requestId: 'req-99',
    userId: 'user-3',
    error,
  })

  assert.equal(calls.length, 1)
  assert.equal(calls[0][0], 'error')
  assert.equal(calls[0][2], 'API request failed')
  assert.deepStrictEqual(calls[0][1], {
    runtime: 'api',
    requestId: 'req-99',
    userId: 'user-3',
    timestamp: calls[0][1].timestamp,
    error,
  })
  assert.equal(typeof calls[0][1].timestamp, 'string')
})

test('allows runtime override per factory', () => {
  const calls = []
  const serverSink = {
    trace() {},
    debug() {},
    info(bindings, message) {
      calls.push(['info', bindings, message])
    },
    warn() {},
    error() {},
    fatal() {},
  }

  const logger = createServerLogger({
    logger: serverSink,
    runtime: 'worker',
    context: {
      queue: 'summary-jobs',
    },
  })

  logger.info('Worker job started')

  assert.equal(calls.length, 1)
  assert.equal(calls[0][0], 'info')
  assert.equal(calls[0][2], 'Worker job started')
  assert.deepStrictEqual(calls[0][1], {
    context: {
      queue: 'summary-jobs',
    },
    runtime: 'worker',
    timestamp: calls[0][1].timestamp,
  })
  assert.equal(typeof calls[0][1].timestamp, 'string')
})

test('emits event schema logs with logId and rendered message templates', () => {
  const writes = []
  const event = defineEvent({
    logId: 'API_REQUEST_001',
    level: 'info',
    category: 'Request',
    messageTemplate: 'API request handled - Status: {statusCode}',
    requiredContext: ['statusCode'],
  })

  const eventLogger = createEventLogger(
    createLogger({
      adapter: {
        write(entry) {
          writes.push(entry)
        },
      },
      context: {
        requestId: 'req-700',
        traceId: 'trace-700',
      },
      now: () => new Date('2026-04-09T09:30:00.000Z'),
    }),
    {
      application: 'focusbuddy-api',
      layer: 'api',
    },
  )

  eventLogger.emit(event, {
    statusCode: 200,
  })

  assert.deepStrictEqual(writes, [
    {
      application: 'focusbuddy-api',
      category: 'Request',
      context: {
        statusCode: 200,
      },
      layer: 'api',
      level: 'info',
      logId: 'API_REQUEST_001',
      message: 'API request handled - Status: 200',
      requestId: 'req-700',
      timestamp: '2026-04-09T09:30:00.000Z',
      traceId: 'trace-700',
    },
  ])
})

test('keeps CommonJS require entrypoints available for current consumers', () => {
  const cjsRoot = require('@focusbuddy/logger')
  const cjsBrowser = require('@focusbuddy/logger/browser')
  const cjsServer = require('@focusbuddy/logger/server')

  assert.equal(typeof cjsRoot.createLogger, 'function')
  assert.equal(typeof cjsBrowser.createBrowserLogger, 'function')
  assert.equal(typeof cjsServer.createServerLogger, 'function')
})
