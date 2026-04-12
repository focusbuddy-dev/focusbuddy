import { jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react';

import { WebRequestLoggingProvider } from '@/lib/logging/web-request-logging-context';

const pushMock = jest.fn();

let currentPathname = '/';
let currentSearchParams = new URLSearchParams();

jest.unstable_mockModule('next/navigation', () => ({
  usePathname: () => currentPathname,
  useRouter: () => ({
    push: pushMock,
  }),
  useSearchParams: () => currentSearchParams,
}));

describe('WebLoggingDemo', () => {
  beforeEach(() => {
    currentPathname = '/';
    currentSearchParams = new URLSearchParams();
    pushMock.mockReset();
    jest.spyOn(console, 'info').mockImplementation(() => undefined);
    jest.spyOn(globalThis.crypto, 'randomUUID').mockReturnValue('web-client-session');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('logs initial display, button clicks, and route changes from the real client component', async () => {
    const { WebLoggingDemo } = await import('@/components/web-logging-demo');
    const infoSpy = jest.mocked(console.info);
    const { rerender } = render(
      <WebRequestLoggingProvider requestId="request-100" traceId="trace-100">
        <WebLoggingDemo targetId="baseline-target" />
      </WebRequestLoggingProvider>,
    );

    expect(infoSpy).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        application: 'focusbuddy-web',
        category: 'WebBaselinePage',
        layer: 'web-client',
        logId: 'WEB_BASELINE_001',
        message: 'Baseline page viewed - View: overview',
        requestId: 'request-100',
        requestPath: '/',
        sessionId: 'web-client-session',
        traceId: 'trace-100',
        context: {
          route: 'home',
          targetId: 'baseline-target',
          view: 'overview',
        },
      }),
    );

    fireEvent.click(screen.getByRole('button', { name: 'Log client button action' }));

    expect(infoSpy).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        logId: 'WEB_BASELINE_002',
        message:
          'Baseline page button clicked - Action: log-client-action Target: client-log-button',
        requestId: 'request-100',
        requestPath: '/',
        sessionId: 'web-client-session',
        traceId: 'trace-100',
        context: {
          action: 'log-client-action',
          actionTarget: 'client-log-button',
          route: 'home',
          targetId: 'baseline-target',
        },
      }),
    );

    fireEvent.click(screen.getByRole('button', { name: 'Navigate to details demo' }));

    expect(infoSpy).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        logId: 'WEB_BASELINE_002',
        message:
          'Baseline page button clicked - Action: navigate-baseline-page Target: /?view=details',
        requestId: 'request-100',
        requestPath: '/',
        sessionId: 'web-client-session',
        traceId: 'trace-100',
        context: {
          action: 'navigate-baseline-page',
          actionTarget: '/?view=details',
          route: 'home',
          targetId: 'baseline-target',
        },
      }),
    );
    expect(pushMock).toHaveBeenCalledWith('/?view=details');

    currentSearchParams = new URLSearchParams('view=details');
    rerender(
      <WebRequestLoggingProvider requestId="request-100" traceId="trace-100">
        <WebLoggingDemo targetId="baseline-target" />
      </WebRequestLoggingProvider>,
    );

    expect(infoSpy).toHaveBeenNthCalledWith(
      4,
      expect.objectContaining({
        logId: 'WEB_BASELINE_003',
        message: 'Baseline page navigation completed - Destination: /?view=details',
        requestId: 'request-100',
        requestPath: '/?view=details',
        sessionId: 'web-client-session',
        traceId: 'trace-100',
        context: {
          destination: '/?view=details',
          route: 'home',
          targetId: 'baseline-target',
          trigger: 'router.push',
        },
      }),
    );
  });

  it('shows distributed request materials from the provider', async () => {
    const { WebLoggingDemo } = await import('@/components/web-logging-demo');
    render(
      <WebRequestLoggingProvider requestId="request-100" traceId="trace-100">
        <WebLoggingDemo targetId="baseline-target" />
      </WebRequestLoggingProvider>,
    );

    expect(screen.getByText('Request: request-100')).toBeInTheDocument();
    expect(screen.getByText('Session: web-client-session')).toBeInTheDocument();
    expect(screen.getByText('Trace: trace-100')).toBeInTheDocument();
  });
});
