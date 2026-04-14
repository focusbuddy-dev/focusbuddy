import { jest } from '@jest/globals';

import {
  assertBaseUrlReady,
  buildNavigationMetricSummary,
  createInitialLoadSnapshot,
  createNavigationSnapshot,
  parseBaselineConfig,
  parseRunCount,
} from '../scripts/measure-web-baseline/index';

describe('measure-web-baseline', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    jest.restoreAllMocks();

    if (originalFetch) {
      global.fetch = originalFetch;
      return;
    }

    Reflect.deleteProperty(globalThis, 'fetch');
  });

  it('parses run count and rejects invalid values', () => {
    expect(parseRunCount('3')).toBe(3);
    expect(() => parseRunCount('0')).toThrow('Invalid FOCUSBUDDY_WEB_BASELINE_RUNS value: 0');
    expect(() => parseRunCount('abc')).toThrow('Invalid FOCUSBUDDY_WEB_BASELINE_RUNS value: abc');
  });

  it('rejects unsupported scenario ids in the config', () => {
    expect(() =>
      parseBaselineConfig({
        baseUrl: 'http://127.0.0.1:3000',
        browser: 'chromium',
        defaultRunCount: 3,
        lighthouse: {
          formFactor: 'desktop',
          onlyAudits: ['first-contentful-paint'],
        },
        runMode: 'local-parity',
        scenarios: [{ id: 'web.unknown', path: '/' }],
        schemaVersion: 1,
      }),
    ).toThrow('Unsupported scenario id in apps/web/performance/baseline.config.json: web.unknown');
  });

  it('fails fast when the base URL is unreachable', async () => {
    global.fetch = jest.fn<typeof fetch>().mockRejectedValue(new Error('connect ECONNREFUSED'));

    await expect(assertBaseUrlReady('http://127.0.0.1:3000/')).rejects.toThrow(
      'Baseline target URL is not reachable before measurement: http://127.0.0.1:3000/. connect ECONNREFUSED',
    );
  });

  it('fails when the base URL responds without success', async () => {
    global.fetch = jest.fn<typeof fetch>().mockResolvedValue({
      ok: false,
      status: 503,
    } as Response);

    await expect(assertBaseUrlReady('http://127.0.0.1:3000/')).rejects.toThrow(
      'Expected http://127.0.0.1:3000/ to be reachable before measurement, got 503.',
    );
  });

  it('builds median-based initial-load summaries', () => {
    const snapshot = createInitialLoadSnapshot({
      baseUrl: 'http://127.0.0.1:3000/',
      capturedAt: '2026-04-14T00:00:00.000Z',
      config: {
        baseUrl: 'http://127.0.0.1:3000',
        browser: 'chromium',
        defaultRunCount: 3,
        lighthouse: {
          formFactor: 'desktop',
          onlyAudits: ['first-contentful-paint'],
        },
        runMode: 'local-parity',
        scenarios: [
          { id: 'web.home.initial-load', path: '/' },
          {
            id: 'web.home.details-navigation',
            path: '/',
            targetSearch: '?view=details',
            triggerButtonText: 'Navigate to details demo',
          },
        ],
        schemaVersion: 1,
      },
      initialLoadRuns: [
        {
          firstLoadJsBytes: 120,
          scriptResources: [{ decodedBodySize: 120, name: '/_next/a.js', transferSize: 120 }],
          webVitals: [
            {
              capturedAt: '2026-04-14T00:00:00.000Z',
              delta: 200,
              id: 'ttfb-1',
              name: 'TTFB',
              path: '/',
              rating: 'good',
              value: 200,
            },
            {
              capturedAt: '2026-04-14T00:00:00.000Z',
              delta: 1000,
              id: 'fcp-1',
              name: 'FCP',
              path: '/',
              rating: 'good',
              value: 1000,
            },
            {
              capturedAt: '2026-04-14T00:00:00.000Z',
              delta: 0.05,
              id: 'cls-1',
              name: 'CLS',
              path: '/',
              rating: 'good',
              value: 0.05,
            },
          ],
        },
        {
          firstLoadJsBytes: 180,
          scriptResources: [
            { decodedBodySize: 100, name: '/_next/a.js', transferSize: 100 },
            { decodedBodySize: 80, name: '/_next/b.js', transferSize: 80 },
          ],
          webVitals: [
            {
              capturedAt: '2026-04-14T00:00:01.000Z',
              delta: 400,
              id: 'ttfb-2',
              name: 'TTFB',
              path: '/',
              rating: 'good',
              value: 400,
            },
            {
              capturedAt: '2026-04-14T00:00:01.000Z',
              delta: 1600,
              id: 'fcp-2',
              name: 'FCP',
              path: '/',
              rating: 'good',
              value: 1600,
            },
            {
              capturedAt: '2026-04-14T00:00:01.000Z',
              delta: 0.15,
              id: 'cls-2',
              name: 'CLS',
              path: '/',
              rating: 'needs-improvement',
              value: 0.15,
            },
          ],
        },
        {
          firstLoadJsBytes: 240,
          scriptResources: [
            { decodedBodySize: 120, name: '/_next/a.js', transferSize: 120 },
            { decodedBodySize: 120, name: '/_next/b.js', transferSize: 120 },
          ],
          webVitals: [
            {
              capturedAt: '2026-04-14T00:00:02.000Z',
              delta: 800,
              id: 'ttfb-3',
              name: 'TTFB',
              path: '/',
              rating: 'good',
              value: 800,
            },
            {
              capturedAt: '2026-04-14T00:00:02.000Z',
              delta: 2200,
              id: 'fcp-3',
              name: 'FCP',
              path: '/',
              rating: 'needs-improvement',
              value: 2200,
            },
            {
              capturedAt: '2026-04-14T00:00:02.000Z',
              delta: 0.3,
              id: 'cls-3',
              name: 'CLS',
              path: '/',
              rating: 'poor',
              value: 0.3,
            },
          ],
        },
      ],
      initialLoadScenario: { id: 'web.home.initial-load', path: '/' },
      lighthouseRuns: [
        {
          audits: {
            'first-contentful-paint': {
              numericValue: 1000,
              score: 1,
            },
          },
          finalDisplayedUrl: 'http://127.0.0.1:3000/',
          performanceScore: 0.8,
        },
        {
          audits: {
            'first-contentful-paint': {
              numericValue: 1200,
              score: 0.9,
            },
          },
          finalDisplayedUrl: 'http://127.0.0.1:3000/',
          performanceScore: 0.9,
        },
        {
          audits: {
            'first-contentful-paint': {
              numericValue: 1400,
              score: 0.7,
            },
          },
          finalDisplayedUrl: 'http://127.0.0.1:3000/',
          performanceScore: 1,
        },
      ],
      runCount: 3,
    });

    expect(snapshot.summary.bundle.firstLoadJsBytes).toBe(180);
    expect(snapshot.summary.bundle.resourceCount).toBe(2);
    expect(snapshot.summary.webVitals).toEqual({
      CLS: { median: 0.15, rating: 'poor', sampleCount: 3 },
      FCP: { median: 1600, rating: 'needs-improvement', sampleCount: 3 },
      TTFB: { median: 400, rating: 'good', sampleCount: 3 },
    });
  });

  it('prefers interaction metrics and falls back to route-change duration', () => {
    const routeFallbackSummary = buildNavigationMetricSummary([
      {
        routeChangeDurationMs: 280,
        transitions: [
          {
            capturedAt: '2026-04-14T00:00:00.000Z',
            navigationType: 'push',
            url: '/?view=details',
          },
        ],
        webVitals: [],
      },
      {
        routeChangeDurationMs: 320,
        transitions: [
          {
            capturedAt: '2026-04-14T00:00:01.000Z',
            navigationType: 'push',
            url: '/?view=details',
          },
        ],
        webVitals: [],
      },
      {
        routeChangeDurationMs: 360,
        transitions: [
          {
            capturedAt: '2026-04-14T00:00:02.000Z',
            navigationType: 'push',
            url: '/?view=details',
          },
        ],
        webVitals: [],
      },
    ]);

    expect(routeFallbackSummary).toEqual({
      ROUTE_CHANGE_DURATION: {
        median: 320,
        rating: undefined,
        sampleCount: 3,
      },
    });

    const navigationSnapshot = createNavigationSnapshot({
      baseUrl: 'http://127.0.0.1:3000/',
      capturedAt: '2026-04-14T00:00:00.000Z',
      config: {
        baseUrl: 'http://127.0.0.1:3000',
        browser: 'chromium',
        defaultRunCount: 3,
        lighthouse: {
          formFactor: 'desktop',
          onlyAudits: ['first-contentful-paint'],
        },
        runMode: 'local-parity',
        scenarios: [
          { id: 'web.home.initial-load', path: '/' },
          {
            id: 'web.home.details-navigation',
            path: '/',
            targetSearch: '?view=details',
            triggerButtonText: 'Navigate to details demo',
          },
        ],
        schemaVersion: 1,
      },
      navigationRuns: [
        {
          routeChangeDurationMs: 280,
          transitions: [
            {
              capturedAt: '2026-04-14T00:00:00.000Z',
              navigationType: 'push',
              url: '/?view=details',
            },
          ],
          webVitals: [
            {
              capturedAt: '2026-04-14T00:00:00.000Z',
              delta: 120,
              id: 'inp-1',
              name: 'INP',
              path: '/',
              rating: 'good',
              value: 120,
            },
          ],
        },
        {
          routeChangeDurationMs: 320,
          transitions: [
            {
              capturedAt: '2026-04-14T00:00:01.000Z',
              navigationType: 'push',
              url: '/?view=details',
            },
          ],
          webVitals: [
            {
              capturedAt: '2026-04-14T00:00:01.000Z',
              delta: 240,
              id: 'inp-2',
              name: 'INP',
              path: '/',
              rating: 'needs-improvement',
              value: 240,
            },
          ],
        },
        {
          routeChangeDurationMs: 360,
          transitions: [
            {
              capturedAt: '2026-04-14T00:00:02.000Z',
              navigationType: 'push',
              url: '/?view=details',
            },
          ],
          webVitals: [
            {
              capturedAt: '2026-04-14T00:00:02.000Z',
              delta: 360,
              id: 'inp-3',
              name: 'INP',
              path: '/',
              rating: 'poor',
              value: 360,
            },
          ],
        },
      ],
      navigationScenario: {
        id: 'web.home.details-navigation',
        path: '/',
        targetSearch: '?view=details',
        triggerButtonText: 'Navigate to details demo',
      },
      runCount: 3,
    });

    expect(navigationSnapshot.summary.interactionMetricName).toBe('INP');
    expect(navigationSnapshot.summary.webVitals).toEqual({
      INP: { median: 240, rating: 'poor', sampleCount: 3 },
    });
  });
});