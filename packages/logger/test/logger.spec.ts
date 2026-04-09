import { createBrowserLogger } from '../src/browser'
import { createLogger, type LogEntry } from '../src/logger'
import { createServerLogger } from '../src/server'

describe('@focusbuddy/logger', () => {
  it('merges base, request, and user context through one facade', () => {
    const writes: LogEntry[] = []

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

    expect(writes).toEqual([
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

  it('routes browser logging through console-safe methods', () => {
    const browserConsole = {
      debug: jest.fn(),
      error: jest.fn(),
      info: jest.fn(),
      log: jest.fn(),
      warn: jest.fn(),
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

    expect(browserConsole.warn).toHaveBeenCalledWith('[WARN] Public summary was slow to render', {
      runtime: 'web',
      requestId: 'page-5',
      userId: 'user-7',
    })
  })

  it('writes server logs through a pino-compatible adapter', () => {
    const serverSink = {
      trace: jest.fn(),
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      fatal: jest.fn(),
    }

    const logger = createServerLogger({
      context: {
        runtime: 'api',
      },
      logger: serverSink as unknown as never,
    })

    const error = new Error('database unavailable')

    logger.error('API request failed', {
      requestId: 'req-99',
      userId: 'user-3',
      error,
    })

    expect(serverSink.error).toHaveBeenCalledWith(
      {
        runtime: 'api',
        requestId: 'req-99',
        userId: 'user-3',
        error,
      },
      'API request failed',
    )
  })
})