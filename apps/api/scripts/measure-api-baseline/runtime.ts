import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  getRequiredScenario,
  parseRequestCount,
  parseRunCount,
  readBaselineConfig,
} from './config';
import { createHealthSnapshot } from './summary';
import type { HealthRequestMeasurement, HealthRun, HealthScenario, HealthSnapshot } from './types';

const currentDirectory = dirname(fileURLToPath(import.meta.url));
const baselineConfigPath = resolve(currentDirectory, '../../performance/baseline.config.json');
const baselinesRoot = resolve(currentDirectory, '../../performance/baselines');

/**
 * Role: Executes the repository-owned API baseline capture flow and persists the snapshot.
 * Boundary: Local measurement entrypoint only. Must not decide CI threshold policy.
 */
export async function runMeasureApiBaseline(): Promise<HealthSnapshot> {
  const config = await readBaselineConfig(baselineConfigPath);
  const healthScenario = getRequiredScenario(config);
  const baseUrl = readBaseUrl(config.baseUrl);
  const runCount = readRunCount(config.defaultRunCount);
  const requestCount = readRequestCount(config.requestCount);

  await assertScenarioReady(baseUrl, healthScenario);

  const healthRuns: HealthRun[] = [];

  for (let runIndex = 0; runIndex < runCount; runIndex += 1) {
    healthRuns.push(await executeHealthRun(baseUrl, healthScenario, requestCount));
  }

  const snapshot = createHealthSnapshot({
    baseUrl,
    capturedAt: new Date().toISOString(),
    config,
    healthRuns,
    healthScenario,
    runCount,
  });

  await writeSnapshot(healthScenario.id, snapshot);

  return snapshot;
}

/**
 * Role: Verifies that the configured API scenario is reachable before measurement starts.
 * Boundary: Preflight only. Must fail fast on status drift or connectivity errors.
 */
export async function assertScenarioReady(baseUrl: string, healthScenario: HealthScenario) {
  const requestUrl = buildScenarioUrl(baseUrl, healthScenario.path);

  try {
    const response = await fetch(requestUrl, { method: healthScenario.method });

    if (response.status !== healthScenario.expectedStatus) {
      throw new Error(
        `Expected status ${healthScenario.expectedStatus} from ${requestUrl} but received ${response.status}.`,
      );
    }
  } catch (error) {
    throw new Error(`Failed to reach ${requestUrl}: ${formatError(error)}`, { cause: error });
  }
}

/**
 * Role: Converts unknown runtime failures into readable baseline-capture error text.
 * Boundary: Error formatting only. Must not swallow underlying failure causes.
 */
export function formatError(error: unknown) {
  if (error instanceof Error) {
    return error.stack ?? error.message;
  }

  return String(error);
}

async function executeHealthRun(baseUrl: string, healthScenario: HealthScenario, requestCount: number) {
  const requestUrl = buildScenarioUrl(baseUrl, healthScenario.path);
  const requests: HealthRequestMeasurement[] = [];

  for (let requestIndex = 0; requestIndex < requestCount; requestIndex += 1) {
    requests.push(await executeMeasuredRequest(requestUrl, healthScenario));
  }

  return {
    capturedAt: new Date().toISOString(),
    requestCount,
    requests,
    statusConsistent: requests.every((request) => request.statusCode === healthScenario.expectedStatus),
  } satisfies HealthRun;
}

async function executeMeasuredRequest(requestUrl: string, healthScenario: HealthScenario) {
  const startedAt = performance.now();

  try {
    const response = await fetch(requestUrl, { method: healthScenario.method });
    const responseBody = await response.text();
    const durationMs = roundDurationMs(performance.now() - startedAt);

    if (response.status !== healthScenario.expectedStatus) {
      throw new Error(
        `Expected status ${healthScenario.expectedStatus} from ${requestUrl} but received ${response.status}.`,
      );
    }

    return {
      durationMs,
      responseBytes: Buffer.byteLength(responseBody, 'utf8'),
      statusCode: response.status,
    } satisfies HealthRequestMeasurement;
  } catch (error) {
    throw new Error(`Measured request failed for ${requestUrl}: ${formatError(error)}`, { cause: error });
  }
}

async function writeSnapshot(scenarioId: string, snapshot: HealthSnapshot) {
  await mkdir(baselinesRoot, { recursive: true });
  await writeFile(
    resolve(baselinesRoot, `${scenarioId}.json`),
    `${JSON.stringify(snapshot, undefined, 2)}\n`,
    'utf8',
  );
}

function buildScenarioUrl(baseUrl: string, path: string) {
  return new URL(path, ensureTrailingSlash(baseUrl)).toString();
}

function ensureTrailingSlash(baseUrl: string) {
  return baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
}

function readBaseUrl(defaultBaseUrl: string) {
  const rawBaseUrl = process.env.FOCUSBUDDY_API_BASELINE_BASE_URL;

  return (rawBaseUrl ?? defaultBaseUrl).replace(/\/+$/, '');
}

function readRunCount(defaultRunCount: number) {
  const rawRunCount = process.env.FOCUSBUDDY_API_BASELINE_RUNS;

  return rawRunCount ? parseRunCount(rawRunCount) : defaultRunCount;
}

function readRequestCount(defaultRequestCount: number) {
  const rawRequestCount = process.env.FOCUSBUDDY_API_BASELINE_REQUESTS;

  return rawRequestCount ? parseRequestCount(rawRequestCount) : defaultRequestCount;
}

function roundDurationMs(durationMs: number) {
  return Number(durationMs.toFixed(3));
}