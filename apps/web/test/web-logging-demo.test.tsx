import { fireEvent, render, screen } from '@testing-library/react'

import { WebLoggingDemo } from '../src/components/web-logging-demo'
import {
  logWebBaselineButtonClicked,
  logWebBaselineNavigationCompleted,
  logWebBaselinePageViewed,
} from '../src/lib/logging/web-baseline-page-logger'
import { WebRequestLoggingProvider } from '../src/lib/logging/web-request-logging-context'

const pushMock = jest.fn()

let currentPathname = '/'
let currentSearchParams = new URLSearchParams()

jest.mock('next/navigation', () => ({
  usePathname: () => currentPathname,
  useRouter: () => ({
    push: pushMock,
  }),
  useSearchParams: () => currentSearchParams,
}))

jest.mock('../src/lib/logging/web-baseline-page-logger', () => ({
  logWebBaselineButtonClicked: jest.fn(),
  logWebBaselineNavigationCompleted: jest.fn(),
  logWebBaselinePageViewed: jest.fn(),
}))

describe('WebLoggingDemo', () => {
  beforeEach(() => {
    currentPathname = '/'
    currentSearchParams = new URLSearchParams()
    pushMock.mockReset()
    jest.spyOn(globalThis.crypto, 'randomUUID').mockReturnValue('web-client-session')
    jest.mocked(logWebBaselineButtonClicked).mockReset()
    jest.mocked(logWebBaselineNavigationCompleted).mockReset()
    jest.mocked(logWebBaselinePageViewed).mockReset()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('logs initial display, button clicks, and route changes from the real client component', () => {
    const { rerender } = render(
      <WebRequestLoggingProvider requestId="request-100" traceId="trace-100">
        <WebLoggingDemo targetId="baseline-target" />
      </WebRequestLoggingProvider>,
    )

    expect(logWebBaselinePageViewed).toHaveBeenCalledWith({
      request: {
        requestId: 'request-100',
        requestPath: '/',
        route: 'home',
        targetId: 'baseline-target',
        traceId: 'trace-100',
      },
      user: {
        sessionId: 'web-client-session',
      },
      view: 'overview',
    })

    fireEvent.click(screen.getByRole('button', { name: 'Log client button action' }))

    expect(logWebBaselineButtonClicked).toHaveBeenCalledWith({
      action: 'log-client-action',
      actionTarget: 'client-log-button',
      request: {
        requestId: 'request-100',
        requestPath: '/',
        route: 'home',
        targetId: 'baseline-target',
        traceId: 'trace-100',
      },
      user: {
        sessionId: 'web-client-session',
      },
    })

    fireEvent.click(screen.getByRole('button', { name: 'Navigate to details demo' }))

    expect(logWebBaselineButtonClicked).toHaveBeenCalledWith({
      action: 'navigate-baseline-page',
      actionTarget: '/?view=details',
      request: {
        requestId: 'request-100',
        requestPath: '/',
        route: 'home',
        targetId: 'baseline-target',
        traceId: 'trace-100',
      },
      user: {
        sessionId: 'web-client-session',
      },
    })
    expect(pushMock).toHaveBeenCalledWith('/?view=details')

    currentSearchParams = new URLSearchParams('view=details')
    rerender(
      <WebRequestLoggingProvider requestId="request-100" traceId="trace-100">
        <WebLoggingDemo targetId="baseline-target" />
      </WebRequestLoggingProvider>,
    )

    expect(logWebBaselineNavigationCompleted).toHaveBeenCalledWith({
      destination: '/?view=details',
      request: {
        requestId: 'request-100',
        requestPath: '/?view=details',
        route: 'home',
        targetId: 'baseline-target',
        traceId: 'trace-100',
      },
      trigger: 'router.push',
      user: {
        sessionId: 'web-client-session',
      },
    })
  })

  it('shows distributed request materials from the provider', () => {
    render(
      <WebRequestLoggingProvider requestId="request-100" traceId="trace-100">
        <WebLoggingDemo targetId="baseline-target" />
      </WebRequestLoggingProvider>,
    )

    expect(screen.getByText('Request: request-100')).toBeInTheDocument()
    expect(screen.getByText('Session: web-client-session')).toBeInTheDocument()
    expect(screen.getByText('Trace: trace-100')).toBeInTheDocument()
  })
})
