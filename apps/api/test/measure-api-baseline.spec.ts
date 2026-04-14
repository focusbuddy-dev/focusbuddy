import {
  createHealthSnapshot,
  getRequiredScenario,
  parseBaselineConfig,
  parseRequestCount,
  parseRunCount,
} from '../scripts/measure-api-baseline/index';

describe('measure-api-baseline', () => {
  it('parses the baseline config and required scenario', () => {
    const config = parseBaselineConfig({
      baseUrl: 'http://127.0.0.1:3001',
      defaultRunCount: 1,
      requestCount: 10,
      runMode: 'local-parity',
      scenarios: [
        {
          expectedStatus: 200,
          id: 'api.health.get',
          method: 'GET',
          path: '/health',
        },
      ],
      schemaVersion: 1,
    });

    expect(getRequiredScenario(config)).toEqual({
      expectedStatus: 200,
      id: 'api.health.get',
      method: 'GET',
      path: '/health',
    });
  });

  it('rejects invalid environment overrides', () => {
    expect(() => parseRunCount('0')).toThrow('Invalid FOCUSBUDDY_API_BASELINE_RUNS value: 0');
    expect(() => parseRequestCount('nope')).toThrow('Invalid FOCUSBUDDY_API_BASELINE_REQUESTS value: nope');
  });

  it('creates a health snapshot with median and p95 summaries', () => {
    const config = parseBaselineConfig({
      baseUrl: 'http://127.0.0.1:3001',
      defaultRunCount: 1,
      requestCount: 10,
      runMode: 'local-parity',
      scenarios: [
        {
          expectedStatus: 200,
          id: 'api.health.get',
          method: 'GET',
          path: '/health',
        },
      ],
      schemaVersion: 1,
    });
    const healthScenario = getRequiredScenario(config);
    const snapshot = createHealthSnapshot({
      baseUrl: 'http://127.0.0.1:3001',
      capturedAt: '2026-04-14T12:00:00.000Z',
      config,
      healthRuns: [
        {
          capturedAt: '2026-04-14T12:00:00.000Z',
          requestCount: 10,
          requests: [
            { durationMs: 10, responseBytes: 30, statusCode: 200 },
            { durationMs: 12, responseBytes: 30, statusCode: 200 },
            { durationMs: 14, responseBytes: 31, statusCode: 200 },
            { durationMs: 16, responseBytes: 31, statusCode: 200 },
            { durationMs: 18, responseBytes: 31, statusCode: 200 },
            { durationMs: 20, responseBytes: 31, statusCode: 200 },
            { durationMs: 22, responseBytes: 32, statusCode: 200 },
            { durationMs: 24, responseBytes: 32, statusCode: 200 },
            { durationMs: 26, responseBytes: 33, statusCode: 200 },
            { durationMs: 28, responseBytes: 33, statusCode: 200 },
          ],
          statusConsistent: true,
        },
      ],
      healthScenario,
      runCount: 1,
    });

    expect(snapshot).toMatchObject({
      app: 'api',
      capturedAt: '2026-04-14T12:00:00.000Z',
      environment: {
        baseUrl: 'http://127.0.0.1:3001',
        method: 'GET',
        path: '/health',
        runtime: 'parity',
      },
      measurements: {
        requestCount: 10,
      },
      runMode: 'local-parity',
      sampleSize: 1,
      scenarioId: 'api.health.get',
      schemaVersion: 1,
      summary: {
        latencyMs: {
          median: 19,
          p95: 28,
        },
        responseBytes: {
          median: 31,
        },
        status: {
          allExpected: true,
          expectedStatus: 200,
          observedStatusCodes: [200],
          sampleCount: 10,
        },
      },
    });
  });
});