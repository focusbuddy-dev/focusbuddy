import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import * as chromeLauncher from 'chrome-launcher';
import lighthouse from 'lighthouse';
import { chromium } from 'playwright';

import { getRequiredScenarios, parseRunCount, readBaselineConfig } from './config';
import {
  createInitialLoadSnapshot,
  createNavigationSnapshot,
  rateCls,
  rateFcp,
  rateTtfb,
} from './summary';
import {
  type BrowserWindowState,
  type InitialLoadRun,
  type InitialLoadSnapshot,
  type InteractionWebVital,
  type LayoutShiftEntry,
  type LighthouseRun,
  type NavigationRun,
  type NavigationSnapshot,
} from './types';

const __dirname = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(__dirname, '..', '..');
const performanceRoot = resolve(appRoot, 'performance');
const baselinesRoot = resolve(performanceRoot, 'baselines');
const configPath = resolve(performanceRoot, 'baseline.config.json');

export async function runMeasureWebBaseline() {
  const config = await readBaselineConfig(configPath);
  const runCount = parseRunCount(
    process.env.FOCUSBUDDY_WEB_BASELINE_RUNS ?? `${config.defaultRunCount}`,
  );
  const baseUrl = new URL(
    process.env.FOCUSBUDDY_WEB_BASELINE_BASE_URL ?? config.baseUrl,
  ).toString();
  const capturedAt = new Date().toISOString();
  const chromiumExecutablePath = resolveChromiumExecutablePath();
  const { initialLoadScenario, navigationScenario } = getRequiredScenarios(config);

  // Fail before opening browsers so host or port drift is obvious.
  await assertBaseUrlReady(baseUrl);
  await mkdir(baselinesRoot, { recursive: true });

  const initialLoadRuns: InitialLoadRun[] = [];
  const navigationRuns: NavigationRun[] = [];
  const lighthouseRuns: LighthouseRun[] = [];

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

  const initialLoadSnapshot = createInitialLoadSnapshot({
    baseUrl,
    capturedAt,
    config,
    initialLoadRuns,
    initialLoadScenario,
    lighthouseRuns,
    runCount,
  });
  const navigationSnapshot = createNavigationSnapshot({
    baseUrl,
    capturedAt,
    config,
    navigationRuns,
    navigationScenario,
    runCount,
  });

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
}

export function resolveChromiumExecutablePath() {
  let executablePath: string;

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

export async function assertBaseUrlReady(url: string) {
  const response = await fetch(url, { redirect: 'manual' }).catch((error: unknown) => {
    throw new Error(
      `Baseline target URL is not reachable before measurement: ${url}. ${formatError(error)}`,
      { cause: error },
    );
  });

  if (!response.ok) {
    throw new Error(`Expected ${url} to be reachable before measurement, got ${response.status}.`);
  }
}

export function formatError(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

async function captureInitialLoadScenario({
  baseUrl: origin,
  executablePath,
  path,
}: {
  baseUrl: string;
  executablePath: string;
  path: string;
}): Promise<InitialLoadRun> {
  const browser = await chromium.launch({ executablePath, headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.goto(new URL(path, origin).toString(), { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: /Navigate to details demo/i }).waitFor();
    await page.waitForTimeout(3000);

    const result = await page.evaluate(() => {
      const resources = (performance.getEntriesByType('resource') as PerformanceResourceTiming[])
        .filter(
          (entry) =>
            entry.initiatorType === 'script' && entry.name.includes('/_next/') && entry.name.endsWith('.js'),
        )
        .map((entry) => ({
          decodedBodySize: entry.decodedBodySize,
          name: entry.name,
          transferSize: entry.transferSize,
        }));
      const navigationEntry = (performance.getEntriesByType('navigation') as PerformanceNavigationTiming[]).at(0);
      const fcpEntry = (performance.getEntriesByType('paint') as PerformanceEntry[]).find(
        (entry) => entry.name === 'first-contentful-paint',
      );
      const clsEntries = (performance.getEntriesByType('layout-shift') as LayoutShiftEntry[]).filter(
        (entry) => !entry.hadRecentInput,
      );

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
}: {
  baseUrl: string;
  executablePath: string;
  path: string;
  targetSearch: string;
  triggerButtonText: string;
}): Promise<NavigationRun> {
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
        const baselineWindow = window as BrowserWindowState;
        const transitions = baselineWindow.__FOCUSBUDDY_ROUTER_TRANSITIONS__ ?? [];

        // Local headless Chromium does not always emit an interaction metric, so keep the route timing fallback explicit.
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
          webVitals: (baselineWindow.__FOCUSBUDDY_WEB_VITALS__ ?? []).filter(
            (metric): metric is InteractionWebVital => metric.name === 'INP' || metric.name === 'FID',
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

async function captureLighthouseRun({
  auditIds,
  baseUrl: origin,
  executablePath,
  path,
}: {
  auditIds: string[];
  baseUrl: string;
  executablePath: string;
  path: string;
}): Promise<LighthouseRun> {
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

          if (!audit) {
            throw new Error(`Lighthouse result did not include requested audit: ${auditId}`);
          }

          return [
            auditId,
            compactObject({
              displayValue: toDefinedValue(audit.displayValue),
              numericUnit: toDefinedValue(audit.numericUnit),
              numericValue: toDefinedValue(audit.numericValue),
              score: toDefinedValue(audit.score),
            }),
          ];
        }),
      ),
      finalDisplayedUrl: result.lhr.finalDisplayedUrl,
      ...withDefinedValue('performanceScore', toDefinedValue(result.lhr.categories.performance?.score)),
    };
  } finally {
    await chrome.kill();
  }
}

async function writeSnapshot(scenarioId: string, snapshot: InitialLoadSnapshot | NavigationSnapshot) {
  await writeFile(
    resolve(baselinesRoot, `${scenarioId}.json`),
    `${JSON.stringify(snapshot, undefined, 2)}\n`,
    'utf8',
  );
}

function compactObject(value: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined));
}

function withDefinedValue(key: string, value: unknown) {
  if (value === undefined) {
    return {};
  }

  return { [key]: value };
}

function toDefinedValue<T>(value: T | null | undefined) {
  return value ?? undefined;
}