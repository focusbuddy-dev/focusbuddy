import { isWebBaselineCaptureEnabled } from '@/lib/performance/web-baseline-capture-config';

export type CapturedWebVital = {
  capturedAt: string;
  delta: number;
  id: string;
  name: string;
  navigationType?: string;
  path: string;
  rating?: string;
  value: number;
};

export type WebVitalMetricInput = {
  delta: number;
  id: string;
  name: string;
  navigationType?: string;
  rating?: string;
  value: number;
};

export type CapturedRouterTransition = {
  capturedAt: string;
  navigationType: 'push' | 'replace' | 'traverse';
  url: string;
};

const routerTransitionsStorageKey = 'focusbuddy.routerTransitions';
const webVitalsStorageKey = 'focusbuddy.webVitals';

declare global {
  interface Window {
    __FOCUSBUDDY_ROUTER_TRANSITIONS__?: CapturedRouterTransition[];
    __FOCUSBUDDY_WEB_VITALS__?: CapturedWebVital[];
  }
}

function getCurrentPath() {
  if (typeof window === 'undefined') {
    return '/';
  }

  return window.location.pathname;
}

function ensureWebVitalsStore() {
  if (typeof window === 'undefined') {
    return [];
  }

  window.__FOCUSBUDDY_WEB_VITALS__ ??= [];

  return window.__FOCUSBUDDY_WEB_VITALS__;
}

function ensureRouterTransitionStore() {
  if (typeof window === 'undefined') {
    return [];
  }

  window.__FOCUSBUDDY_ROUTER_TRANSITIONS__ ??= [];

  return window.__FOCUSBUDDY_ROUTER_TRANSITIONS__;
}

function persistBaselineCapture() {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(
      webVitalsStorageKey,
      JSON.stringify(window.__FOCUSBUDDY_WEB_VITALS__ ?? []),
    );
    window.localStorage.setItem(
      routerTransitionsStorageKey,
      JSON.stringify(window.__FOCUSBUDDY_ROUTER_TRANSITIONS__ ?? []),
    );
  } catch {
    // Ignore storage failures during baseline capture and keep in-memory samples available.
  }
}

function canCaptureWebBaselineInBrowser() {
  // Guard 2: keep these helpers as safe no-ops even if another caller bypasses the layout-level mount check.
  return typeof window !== 'undefined' && isWebBaselineCaptureEnabled();
}

export function captureWebVital(metric: WebVitalMetricInput) {
  if (!canCaptureWebBaselineInBrowser()) {
    return;
  }

  ensureWebVitalsStore().push({
    capturedAt: new Date().toISOString(),
    delta: metric.delta,
    id: metric.id,
    name: metric.name,
    path: getCurrentPath(),
    value: metric.value,
    ...(metric.navigationType ? { navigationType: metric.navigationType } : {}),
    ...(metric.rating ? { rating: metric.rating } : {}),
  });
  persistBaselineCapture();
}

export function captureRouterTransitionStart(
  transition: Pick<CapturedRouterTransition, 'navigationType' | 'url'>,
) {
  if (!canCaptureWebBaselineInBrowser()) {
    return;
  }

  ensureRouterTransitionStore().push({
    capturedAt: new Date().toISOString(),
    navigationType: transition.navigationType,
    url: transition.url,
  });
  persistBaselineCapture();
}

export function resetWebBaselineCapture() {
  if (typeof window === 'undefined') {
    return;
  }

  window.__FOCUSBUDDY_WEB_VITALS__ = [];
  window.__FOCUSBUDDY_ROUTER_TRANSITIONS__ = [];

  try {
    window.localStorage.removeItem(webVitalsStorageKey);
    window.localStorage.removeItem(routerTransitionsStorageKey);
  } catch {
    // Ignore storage failures during reset and keep the in-memory stores cleared.
  }
}