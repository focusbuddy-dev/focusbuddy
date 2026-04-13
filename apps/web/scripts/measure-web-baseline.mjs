// Keep this script zero-build for now; if the baseline flow grows further, move it to TypeScript.
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import * as chromeLauncher from 'chrome-launcher';
import lighthouse from 'lighthouse';
import { chromium } from 'playwright';

const __dirname = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(__dirname, '..');
const performanceRoot = resolve(appRoot, 'performance');
const baselinesRoot = resolve(performanceRoot, 'baselines');
const configPath = resolve(performanceRoot, 'baseline.config.json');
const config = JSON.parse(await readFile(configPath, 'utf8'));

const runCount = parseRunCount(
  process.env.FOCUSBUDDY_WEB_BASELINE_RUNS ?? `${config.defaultRunCount}`,
);
const baseUrl = new URL(
  process.env.FOCUSBUDDY_WEB_BASELINE_BASE_URL ?? config.baseUrl,
).toString();
const capturedAt = new Date().toISOString();
const chromiumExecutablePath = resolveChromiumExecutablePath();

await assertBaseUrlReady(baseUrl);
await mkdir(baselinesRoot, { recursive: true });

const initialLoadScenario = config.scenarios.find((scenario) => scenario.id === 'web.home.initial-load');
const navigationScenario = config.scenarios.find(
  (scenario) => scenario.id === 'web.home.details-navigation',
);

if (!initialLoadScenario || !navigationScenario) {
  throw new Error('Missing required scenario definitions in apps/web/performance/baseline.config.json.');
}

const initialLoadRuns = [];
const navigationRuns = [];
const lighthouseRuns = [];

for (let runIndex = 0; runIndex < runCount; runIndex += 1) {
  initialLoadRuns.push(
    await captureInitialLoadScenario({
      baseUrl,
      executablePath: chromiumExecutablePath,
      path: initialLoadScenario.path,
    }),
  );

  navigationRuns.push(
    await captureNavigationScenario({
      baseUrl,
      executablePath: chromiumExecutablePath,
      path: navigationScenario.path,
      targetSearch: navigationScenario.targetSearch,
      triggerButtonText: navigationScenario.triggerButtonText,
    }),
  );

  lighthouseRuns.push(
    await captureLighthouseRun({
      auditIds: config.lighthouse.onlyAudits,
      baseUrl,
      executablePath: chromiumExecutablePath,
      path: initialLoadScenario.path,
    }),
  );
}

const initialLoadSnapshot = {
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

const navigationSnapshot = {
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

await writeSnapshot(initialLoadScenario.id, initialLoadSnapshot);
await writeSnapshot(navigationScenario.id, navigationSnapshot);

console.log(
  JSON.stringify(
    {
      files: [
        resolve(baselinesRoot, `${initialLoadScenario.id}.json`),
        resolve(baselinesRoot, `${navigationScenario.id}.json`),
      ],
      runCount,
    },
    undefined,
    2,
  ),
);

function parseRunCount(rawValue) {
  const parsedValue = Number.parseInt(rawValue, 10);

  if (!Number.isInteger(parsedValue) || parsedValue < 1) {
    throw new Error(`Invalid FOCUSBUDDY_WEB_BASELINE_RUNS value: ${rawValue}`);
  }

  return parsedValue;
}

function resolveChromiumExecutablePath() {
  let executablePath;

  try {
    executablePath = chromium.executablePath();
  } catch {
    executablePath = '';
  }

  if (!executablePath || !existsSync(executablePath)) {
    throw new Error(
      'Playwright Chromium is not installed. Run `pnpm --filter @focusbuddy/web measure:browser` first.',
    );
  }

  return executablePath;
}

async function assertBaseUrlReady(url) {
  let response;

  try {
    response = await fetch(url, { redirect: 'manual' });
  } catch (error) {
    throw new Error(
      `Baseline target URL is not reachable before measurement: ${url}. ${formatError(error)}`,
      { cause: error },
    );
  }

  if (!response.ok) {
    throw new Error(`Expected ${url} to be reachable before measurement, got ${response.status}.`);
  }
}

function formatError(error) {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

async function captureInitialLoadScenario({ baseUrl: origin, executablePath, path }) {
  const browser = await chromium.launch({ executablePath, headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.goto(new URL(path, origin).toString(), { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: /Navigate to details demo/i }).waitFor();
    await page.waitForTimeout(3000);

    const result = await page.evaluate(() => {
      const resources = performance
        .getEntriesByType('resource')
        .filter(
          (entry) =>
            entry.initiatorType === 'script' && entry.name.includes('/_next/') && entry.name.endsWith('.js'),
        )
        .map((entry) => ({
          decodedBodySize: entry.decodedBodySize,
          name: entry.name,
          transferSize: entry.transferSize,
        }));
      const navigationEntry = performance.getEntriesByType('navigation').at(0);
      const fcpEntry = performance
        .getEntriesByType('paint')
        .find((entry) => entry.name === 'first-contentful-paint');
      const clsEntries = performance
        .getEntriesByType('layout-shift')
        .filter((entry) => !entry.hadRecentInput);

      return {
        clsValue: clsEntries.reduce((total, entry) => total + entry.value, 0),
        fcpValue: fcpEntry?.startTime ?? 0,
        firstLoadJsBytes: resources.reduce(
          (total, entry) => total + (entry.transferSize > 0 ? entry.transferSize : entry.decodedBodySize),
          0,
        ),
        scriptResources: resources,
        ttfbValue: navigationEntry?.responseStart ?? 0,
      };
    });

    return {
      firstLoadJsBytes: result.firstLoadJsBytes,
      scriptResources: result.scriptResources,
      webVitals: [
        {
          delta: result.ttfbValue,
          id: 'synthetic-ttfb',
          name: 'TTFB',
          path,
          rating: rateTtfb(result.ttfbValue),
          value: result.ttfbValue,
        },
        {
          delta: result.fcpValue,
          id: 'synthetic-fcp',
          name: 'FCP',
          path,
          rating: rateFcp(result.fcpValue),
          value: result.fcpValue,
        },
        {
          delta: result.clsValue,
          id: 'synthetic-cls',
          name: 'CLS',
          path,
          rating: rateCls(result.clsValue),
          value: result.clsValue,
        },
      ],
    };
  } finally {
    await context.close().catch(() => {});
    await browser.close();
  }
}

async function captureNavigationScenario({
  baseUrl: origin,
  executablePath,
  path,
  targetSearch,
  triggerButtonText,
}) {
  const browser = await chromium.launch({ executablePath, headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.goto(new URL(path, origin).toString(), { waitUntil: 'networkidle' });
    const transitionStart = await page.evaluate(() => performance.now());
    await page.getByRole('button', { name: triggerButtonText }).click();
    await page.waitForURL(new URL(`${path}${targetSearch}`, origin).toString());
    await page.getByText('Client logging demo is idle.').waitFor();
    await page.waitForTimeout(3000);

    return await page.evaluate(
      ({ fallbackUrl, recordedTransitionStart }) => {
        const transitions = window.__FOCUSBUDDY_ROUTER_TRANSITIONS__ ?? [];

        return {
          routeChangeDurationMs: performance.now() - recordedTransitionStart,
          transitions:
            transitions.length > 0
              ? transitions
              : [
                  {
                    capturedAt: new Date().toISOString(),
                    navigationType: 'push',
                    url: fallbackUrl,
                  },
                ],
          webVitals: (window.__FOCUSBUDDY_WEB_VITALS__ ?? []).filter(
            (metric) => metric.name === 'INP' || metric.name === 'FID',
          ),
        };
      },
      {
        fallbackUrl: `${path}${targetSearch}`,
        recordedTransitionStart: transitionStart,
      },
    );
  } finally {
    await context.close().catch(() => {});
    await browser.close();
  }
}

async function captureLighthouseRun({ auditIds, baseUrl: origin, executablePath, path }) {
  const chrome = await chromeLauncher.launch({
    chromeFlags: ['--headless', '--no-sandbox', '--disable-dev-shm-usage'],
    chromePath: executablePath,
  });

  try {
    const result = await lighthouse(
      new URL(path, origin).toString(),
      {
        logLevel: 'error',
        output: 'json',
        port: chrome.port,
      },
      {
        extends: 'lighthouse:default',
        settings: {
          formFactor: 'desktop',
          onlyAudits: auditIds,
          onlyCategories: ['performance'],
          screenEmulation: {
            disabled: true,
          },
          throttlingMethod: 'devtools',
        },
      },
    );

    if (!result) {
      throw new Error('Lighthouse did not produce a result.');
    }

    return {
      audits: Object.fromEntries(
        auditIds.map((auditId) => {
          const audit = result.lhr.audits[auditId];

          return [
            auditId,
            compactObject({
              displayValue: audit.displayValue,
              numericUnit: audit.numericUnit,
              numericValue: audit.numericValue,
              score: audit.score,
            }),
          ];
        }),
      ),
      finalDisplayedUrl: result.lhr.finalDisplayedUrl,
      ...withDefinedValue('performanceScore', result.lhr.categories.performance.score),
    };
  } finally {
    await chrome.kill();
  }
}

function buildBundleSummary(runs) {
  return {
    firstLoadJsBytes: calculateMedian(runs.map((run) => run.firstLoadJsBytes)),
    resourceCount: calculateMedian(runs.map((run) => run.scriptResources.length)),
  };
}

function buildLighthouseSummary(runs, auditIds) {
  return compactObject({
    audits: Object.fromEntries(
      auditIds.map((auditId) => [
        auditId,
        compactObject({
          numericValue: calculateMedian(
            runs
              .map((run) => run.audits[auditId].numericValue)
              .filter((value) => typeof value === 'number'),
          ),
          score: calculateMedian(
            runs.map((run) => run.audits[auditId].score).filter((value) => typeof value === 'number'),
          ),
        }),
      ]),
    ),
    performanceScore: calculateMedian(
      runs.map((run) => run.performanceScore).filter((value) => typeof value === 'number'),
    ),
  });
}

function buildWebVitalSummary(metrics, expectedMetricNames) {
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
          rating: findWorstRating(matchingMetrics.map((metric) => metric.rating)),
          sampleCount: matchingMetrics.length,
        },
      ];
    }),
  );
}

function pickInteractionMetricName(runs) {
  const interactionMetricNames = runs.flatMap((run) => run.webVitals.map((metric) => metric.name));

  if (interactionMetricNames.includes('INP')) {
    return 'INP';
  }

  if (interactionMetricNames.includes('FID')) {
    return 'FID';
  }

  return 'ROUTE_CHANGE_DURATION';
}

function buildNavigationMetricSummary(runs) {
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

function calculateMedian(values) {
  if (values.length === 0) {
    return undefined;
  }

  const sortedValues = values.toSorted((left, right) => left - right);
  const middleIndex = Math.floor(sortedValues.length / 2);

  if (sortedValues.length % 2 === 1) {
    return roundNumber(sortedValues[middleIndex]);
  }

  return roundNumber((sortedValues[middleIndex - 1] + sortedValues[middleIndex]) / 2);
}

function findWorstRating(ratings) {
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

function compactObject(value) {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined));
}

function withDefinedValue(key, value) {
  if (value === undefined) {
    return {};
  }

  return { [key]: value };
}

function rateCls(value) {
  if (value > 0.25) {
    return 'poor';
  }

  if (value > 0.1) {
    return 'needs-improvement';
  }

  return 'good';
}

function rateFcp(value) {
  if (value > 3000) {
    return 'poor';
  }

  if (value > 1800) {
    return 'needs-improvement';
  }

  return 'good';
}

function rateTtfb(value) {
  if (value > 1800) {
    return 'poor';
  }

  if (value > 800) {
    return 'needs-improvement';
  }

  return 'good';
}

function roundNumber(value) {
  return Number(value.toFixed(3));
}

async function writeSnapshot(scenarioId, snapshot) {
  await writeFile(
    resolve(baselinesRoot, `${scenarioId}.json`),
    `${JSON.stringify(snapshot, undefined, 2)}\n`,
    'utf8',
  );
}