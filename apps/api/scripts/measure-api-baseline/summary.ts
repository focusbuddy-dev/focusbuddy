import { type BaselineConfig, type HealthRun, type HealthScenario, type HealthSnapshot } from './types';

/**
 * Role: Builds the committed API baseline snapshot from captured health-check runs.
 * Boundary: Summary shaping only. Must not perform network requests or file writes.
 */
export function createHealthSnapshot({
  baseUrl,
  capturedAt,
  config,
  healthRuns,
  healthScenario,
  runCount,
}: {
  baseUrl: string;
  capturedAt: string;
  config: BaselineConfig;
  healthRuns: HealthRun[];
  healthScenario: HealthScenario;
  runCount: number;
}): HealthSnapshot {
  const requests = healthRuns.flatMap((run) => run.requests);

  return {
    app: 'api',
    capturedAt,
    environment: {
      baseUrl,
      method: healthScenario.method,
      path: healthScenario.path,
      runtime: 'parity',
    },
    measurements: {
      requestCount: healthScenarioRequests(healthRuns),
      runs: healthRuns,
    },
    runMode: config.runMode,
    sampleSize: runCount,
    scenarioId: healthScenario.id,
    schemaVersion: config.schemaVersion,
    summary: {
      latencyMs: {
        median: calculateMedian(requests.map((request) => request.durationMs)),
        p95: calculatePercentile(requests.map((request) => request.durationMs), 95),
      },
      responseBytes: {
        median: calculateMedian(requests.map((request) => request.responseBytes)),
      },
      status: {
        allExpected: requests.every((request) => request.statusCode === healthScenario.expectedStatus),
        expectedStatus: healthScenario.expectedStatus,
        observedStatusCodes: [...new Set(requests.map((request) => request.statusCode))].toSorted(
          (left, right) => left - right,
        ),
        sampleCount: requests.length,
      },
    },
  };
}

function healthScenarioRequests(healthRuns: HealthRun[]) {
  return healthRuns.reduce((total, run) => total + run.requestCount, 0);
}

/**
 * Role: Computes a stable median for saved API baseline metrics.
 * Boundary: Numeric summary helper only. Must not mutate caller-provided arrays.
 */
export function calculateMedian(values: number[]) {
  if (values.length === 0) {
    return undefined;
  }

  const sortedValues = values.toSorted((left, right) => left - right);
  const middleIndex = Math.floor(sortedValues.length / 2);
  const middleValue = sortedValues[middleIndex];

  if (middleValue === undefined) {
    return undefined;
  }

  if (sortedValues.length % 2 === 1) {
    return roundNumber(middleValue);
  }

  const previousValue = sortedValues[middleIndex - 1];

  if (previousValue === undefined) {
    return undefined;
  }

  return roundNumber((previousValue + middleValue) / 2);
}

/**
 * Role: Computes percentile values for API baseline latency summaries.
 * Boundary: Numeric summary helper only. Must not mutate caller-provided arrays.
 */
export function calculatePercentile(values: number[], percentile: number) {
  if (values.length === 0) {
    return undefined;
  }

  const sortedValues = values.toSorted((left, right) => left - right);
  const rank = Math.max(0, Math.ceil((percentile / 100) * sortedValues.length) - 1);
  const percentileValue = sortedValues[rank];

  if (percentileValue === undefined) {
    return undefined;
  }

  return roundNumber(percentileValue);
}

function roundNumber(value: number) {
  return Number(value.toFixed(3));
}