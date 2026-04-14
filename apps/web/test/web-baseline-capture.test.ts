import { jest } from '@jest/globals';

import {
  captureRouterTransitionStart,
  captureWebVital,
  resetWebBaselineCapture,
} from '@/lib/performance/web-baseline-capture';
import {
  WEB_BASELINE_CAPTURE_CONTEXT_ENV_NAME,
  WEB_BASELINE_CAPTURE_ENABLED_ENV_NAME,
} from '@/lib/performance/web-baseline-capture-config';

describe('web baseline capture', () => {
  const previousCaptureEnabledValue = process.env[WEB_BASELINE_CAPTURE_ENABLED_ENV_NAME];
  const previousCaptureContextValue = process.env[WEB_BASELINE_CAPTURE_CONTEXT_ENV_NAME];

  beforeEach(() => {
    process.env[WEB_BASELINE_CAPTURE_ENABLED_ENV_NAME] = 'true';
    process.env[WEB_BASELINE_CAPTURE_CONTEXT_ENV_NAME] = 'parity';
    history.replaceState({}, '', '/');
    resetWebBaselineCapture();
  });

  afterAll(() => {
    if (previousCaptureEnabledValue === undefined) {
      delete process.env[WEB_BASELINE_CAPTURE_ENABLED_ENV_NAME];
    } else {
      process.env[WEB_BASELINE_CAPTURE_ENABLED_ENV_NAME] = previousCaptureEnabledValue;
    }

    if (previousCaptureContextValue === undefined) {
      delete process.env[WEB_BASELINE_CAPTURE_CONTEXT_ENV_NAME];
    } else {
      process.env[WEB_BASELINE_CAPTURE_CONTEXT_ENV_NAME] = previousCaptureContextValue;
    }
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
        path: '/',
        rating: 'good',
        value: 123.456,
      }),
    ]);
  });

  it('keeps capture in memory when localStorage persistence fails', () => {
    const setItemSpy = jest
      .spyOn(Storage.prototype, 'setItem')
      .mockImplementation(() => {
        throw new Error('storage unavailable');
      });

    expect(() => {
      captureWebVital({
        delta: 0.12,
        id: 'metric-storage',
        name: 'LCP',
        value: 123.456,
      });
    }).not.toThrow();

    expect(window.__FOCUSBUDDY_WEB_VITALS__).toEqual([
      expect.objectContaining({
        id: 'metric-storage',
      }),
    ]);

    setItemSpy.mockRestore();
  });

  it('keeps reset as a safe no-op when localStorage removal fails', () => {
    captureWebVital({
      delta: 0.12,
      id: 'metric-reset',
      name: 'LCP',
      value: 123.456,
    });
    captureRouterTransitionStart({
      navigationType: 'push',
      url: '/?view=details',
    });

    const removeItemSpy = jest
      .spyOn(Storage.prototype, 'removeItem')
      .mockImplementation(() => {
        throw new Error('storage unavailable');
      });

    expect(() => {
      resetWebBaselineCapture();
    }).not.toThrow();

    expect(window.__FOCUSBUDDY_WEB_VITALS__).toEqual([]);
    expect(window.__FOCUSBUDDY_ROUTER_TRANSITIONS__).toEqual([]);

    removeItemSpy.mockRestore();
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

  it('does not store baseline capture for unsupported contexts', () => {
    process.env[WEB_BASELINE_CAPTURE_CONTEXT_ENV_NAME] = 'production';

    captureWebVital({
      delta: 0.12,
      id: 'metric-3',
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