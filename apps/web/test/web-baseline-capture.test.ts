import {
  captureRouterTransitionStart,
  captureWebVital,
  resetWebBaselineCapture,
} from '@/lib/performance/web-baseline-capture';
import { WEB_BASELINE_CAPTURE_ENABLED_ENV_NAME } from '@/lib/performance/web-baseline-capture-config';

describe('web baseline capture', () => {
  const previousCaptureEnabledValue = process.env[WEB_BASELINE_CAPTURE_ENABLED_ENV_NAME];

  beforeEach(() => {
    process.env[WEB_BASELINE_CAPTURE_ENABLED_ENV_NAME] = 'true';
    history.replaceState({}, '', '/');
    resetWebBaselineCapture();
  });

  afterAll(() => {
    if (previousCaptureEnabledValue === undefined) {
      delete process.env[WEB_BASELINE_CAPTURE_ENABLED_ENV_NAME];
      return;
    }

    process.env[WEB_BASELINE_CAPTURE_ENABLED_ENV_NAME] = previousCaptureEnabledValue;
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

  it('does not store baseline capture when disabled', () => {
    process.env[WEB_BASELINE_CAPTURE_ENABLED_ENV_NAME] = 'false';

    captureWebVital({
      delta: 0.12,
      id: 'metric-2',
      name: 'LCP',
      value: 123.456,
    });
    captureRouterTransitionStart({
      navigationType: 'push',
      url: '/?view=details',
    });

    expect(window.__FOCUSBUDDY_WEB_VITALS__).toEqual([]);
    expect(window.__FOCUSBUDDY_ROUTER_TRANSITIONS__).toEqual([]);
  });
});