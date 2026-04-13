import {
  captureRouterTransitionStart,
  captureWebVital,
  resetWebBaselineCapture,
} from '@/lib/performance/web-baseline-capture';

describe('web baseline capture', () => {
  beforeEach(() => {
    history.replaceState({}, '', '/');
    resetWebBaselineCapture();
  });

  it('stores sanitized Web Vitals against the current location', () => {
    history.replaceState({}, '', '/?view=overview');

    captureWebVital({
      delta: 0.12,
      id: 'metric-1',
      name: 'LCP',
      navigationType: 'navigate',
      rating: 'good',
      value: 123.456,
    });

    expect(window.__FOCUSBUDDY_WEB_VITALS__).toEqual([
      expect.objectContaining({
        delta: 0.12,
        id: 'metric-1',
        name: 'LCP',
        navigationType: 'navigate',
        path: '/?view=overview',
        rating: 'good',
        value: 123.456,
      }),
    ]);
  });

  it('stores router transition markers for navigation capture', () => {
    captureRouterTransitionStart({
      navigationType: 'push',
      url: '/?view=details',
    });

    expect(window.__FOCUSBUDDY_ROUTER_TRANSITIONS__).toEqual([
      expect.objectContaining({
        navigationType: 'push',
        url: '/?view=details',
      }),
    ]);
  });
});