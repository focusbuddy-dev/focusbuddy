import {
  type BaselineConfig,
  type BaselineWebVital,
  type InitialLoadRun,
  type InitialLoadScenario,
  type InitialLoadSnapshot,
  type LighthouseRun,
  type NavigationMetricName,
  type NavigationRun,
  type NavigationScenario,
  type NavigationSnapshot,
  type Rating,
} from './types';

export function createInitialLoadSnapshot({
  baseUrl,
  capturedAt,
  config,
  initialLoadRuns,
  initialLoadScenario,
  lighthouseRuns,
  runCount,
}: {
  baseUrl: string;
  capturedAt: string;
  config: BaselineConfig;
  initialLoadRuns: InitialLoadRun[];
  initialLoadScenario: InitialLoadScenario;
  lighthouseRuns: LighthouseRun[];
  runCount: number;
}): InitialLoadSnapshot {
  return {
    app: 'web',
    capturedAt,
    environment: {
      baseUrl,
      browser: config.browser,
      formFactor: config.lighthouse.formFactor,
      runtime: 'parity',
    },
    measurements: {
      lighthouseRuns,
      runs: initialLoadRuns,
    },
    runMode: config.runMode,
    sampleSize: runCount,
    scenarioId: initialLoadScenario.id,
    schemaVersion: config.schemaVersion,
    summary: {
      bundle: buildBundleSummary(initialLoadRuns),
      lighthouse: buildLighthouseSummary(lighthouseRuns, config.lighthouse.onlyAudits),
      webVitals: buildWebVitalSummary(initialLoadRuns.flatMap((run) => run.webVitals), [
        'CLS',
        'FCP',
        'TTFB',
      ]),
    },
  };
}

export function createNavigationSnapshot({
  baseUrl,
  capturedAt,
  config,
  navigationRuns,
  navigationScenario,
  runCount,
}: {
  baseUrl: string;
  capturedAt: string;
  config: BaselineConfig;
  navigationRuns: NavigationRun[];
  navigationScenario: NavigationScenario;
  runCount: number;
}): NavigationSnapshot {
  return {
    app: 'web',
    capturedAt,
    environment: {
      baseUrl,
      browser: config.browser,
      runtime: 'parity',
      targetSearch: navigationScenario.targetSearch,
    },
    measurements: {
      runs: navigationRuns,
    },
    runMode: config.runMode,
    sampleSize: runCount,
    scenarioId: navigationScenario.id,
    schemaVersion: config.schemaVersion,
    summary: {
      interactionMetricName: pickInteractionMetricName(navigationRuns),
      routerTransitions: {
        medianCount: calculateMedian(navigationRuns.map((run) => run.transitions.length)),
        targetUrl: navigationScenario.targetSearch,
      },
      webVitals: buildNavigationMetricSummary(navigationRuns),
    },
  };
}

export function buildBundleSummary(runs: InitialLoadRun[]) {
  return {
    firstLoadJsBytes: calculateMedian(runs.map((run) => run.firstLoadJsBytes)),
    resourceCount: calculateMedian(runs.map((run) => run.scriptResources.length)),
  };
}

export function buildLighthouseSummary(runs: LighthouseRun[], auditIds: string[]) {
  return compactObject({
    audits: Object.fromEntries(
      auditIds.map((auditId) => [
        auditId,
        compactObject({
          numericValue: calculateMedian(
            runs
              .map((run) => run.audits[auditId]?.numericValue)
              .filter((value): value is number => typeof value === 'number'),
          ),
          score: calculateMedian(
            runs
              .map((run) => run.audits[auditId]?.score)
              .filter((value): value is number => typeof value === 'number'),
          ),
        }),
      ]),
    ),
    performanceScore: calculateMedian(
      runs.map((run) => run.performanceScore).filter((value): value is number => typeof value === 'number'),
    ),
  });
}

export function buildWebVitalSummary(
  metrics: Array<Pick<BaselineWebVital, 'name' | 'rating' | 'value'> & { name: string }>,
  expectedMetricNames: string[],
) {
  return Object.fromEntries(
    expectedMetricNames.map((metricName) => {
      const matchingMetrics = metrics.filter((metric) => metric.name === metricName);

      if (matchingMetrics.length === 0) {
        throw new Error(`Expected to capture ${metricName} but no samples were recorded.`);
      }

      return [
        metricName,
        {
          median: calculateMedian(matchingMetrics.map((metric) => metric.value)),
          rating: findWorstRating(
            matchingMetrics
              .map((metric) => metric.rating)
              .filter((rating): rating is Rating => typeof rating === 'string'),
          ),
          sampleCount: matchingMetrics.length,
        },
      ];
    }),
  );
}

export function pickInteractionMetricName(runs: NavigationRun[]): NavigationMetricName {
  const interactionMetricNames = runs.flatMap((run) => run.webVitals.map((metric) => metric.name));

  if (interactionMetricNames.includes('INP')) {
    return 'INP';
  }

  if (interactionMetricNames.includes('FID')) {
    return 'FID';
  }

  return 'ROUTE_CHANGE_DURATION';
}

export function buildNavigationMetricSummary(runs: NavigationRun[]) {
  const interactionMetricName = pickInteractionMetricName(runs);

  if (interactionMetricName === 'ROUTE_CHANGE_DURATION') {
    return {
      ROUTE_CHANGE_DURATION: {
        median: calculateMedian(runs.map((run) => run.routeChangeDurationMs)),
        rating: undefined,
        sampleCount: runs.length,
      },
    };
  }

  return buildWebVitalSummary(
    runs.flatMap((run) => run.webVitals),
    [interactionMetricName],
  );
}

export function calculateMedian(values: number[]) {
  if (values.length === 0) {
    return undefined;
  }

  const sortedValues = [...values].sort((left, right) => left - right);
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

export function findWorstRating(ratings: Rating[]) {
  if (ratings.includes('poor')) {
    return 'poor';
  }

  if (ratings.includes('needs-improvement')) {
    return 'needs-improvement';
  }

  if (ratings.includes('good')) {
    return 'good';
  }

  return undefined;
}

export function rateCls(value: number): Rating {
  if (value > 0.25) {
    return 'poor';
  }

  if (value > 0.1) {
    return 'needs-improvement';
  }

  return 'good';
}

export function rateFcp(value: number): Rating {
  if (value > 3000) {
    return 'poor';
  }

  if (value > 1800) {
    return 'needs-improvement';
  }

  return 'good';
}

export function rateTtfb(value: number): Rating {
  if (value > 1800) {
    return 'poor';
  }

  if (value > 800) {
    return 'needs-improvement';
  }

  return 'good';
}

export function roundNumber(value: number) {
  return Number(value.toFixed(3));
}

function compactObject(value: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined));
}