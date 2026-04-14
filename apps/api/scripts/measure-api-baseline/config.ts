import { readFile } from 'node:fs/promises';

import { type BaselineConfig, type BaselineScenario, healthScenarioId, type HealthScenario } from './types';

/**
 * Role: Loads the API baseline config file and returns the validated config shape.
 * Boundary: File-backed config entrypoint only. Must not execute measurement logic.
 */
export async function readBaselineConfig(filePath: string) {
  const rawConfig = JSON.parse(await readFile(filePath, 'utf8')) as unknown;

  return parseBaselineConfig(rawConfig);
}

/**
 * Role: Validates the repository-owned API baseline config shape.
 * Boundary: Config parsing only. Must fail fast on unsupported scenario definitions.
 */
export function parseBaselineConfig(rawConfig: unknown): BaselineConfig {
  if (!isRecord(rawConfig)) {
    throw new Error('Baseline config must be a JSON object.');
  }

  const { baseUrl, runMode } = rawConfig;
  const defaultRunCount = rawConfig.defaultRunCount;
  const requestCount = rawConfig.requestCount;
  const schemaVersion = rawConfig.schemaVersion;

  if (typeof baseUrl !== 'string') {
    throw new Error('Baseline config must include a string baseUrl.');
  }

  if (typeof runMode !== 'string') {
    throw new Error('Baseline config must include a string runMode.');
  }

  if (typeof defaultRunCount !== 'number' || !Number.isInteger(defaultRunCount) || defaultRunCount < 1) {
    throw new Error('Baseline config must include a positive integer defaultRunCount.');
  }

  if (typeof requestCount !== 'number' || !Number.isInteger(requestCount) || requestCount < 1) {
    throw new Error('Baseline config must include a positive integer requestCount.');
  }

  if (typeof schemaVersion !== 'number' || !Number.isInteger(schemaVersion) || schemaVersion < 1) {
    throw new Error('Baseline config must include a positive integer schemaVersion.');
  }

  const rawScenarios = rawConfig.scenarios;

  if (!Array.isArray(rawScenarios)) {
    throw new Error('Baseline config must include a scenarios array.');
  }

  return {
    baseUrl,
    defaultRunCount,
    requestCount,
    runMode,
    scenarios: rawScenarios.map((scenario) => parseScenario(scenario)),
    schemaVersion,
  };
}

/**
 * Role: Parses the rerun count override for API baseline capture.
 * Boundary: Environment parsing only. Must reject non-positive integers.
 */
export function parseRunCount(rawValue: string) {
  return parsePositiveInteger(rawValue, 'FOCUSBUDDY_API_BASELINE_RUNS');
}

/**
 * Role: Parses the sequential request-count override for API baseline capture.
 * Boundary: Environment parsing only. Must reject non-positive integers.
 */
export function parseRequestCount(rawValue: string) {
  return parsePositiveInteger(rawValue, 'FOCUSBUDDY_API_BASELINE_REQUESTS');
}

/**
 * Role: Resolves the required api.health.get scenario from the parsed baseline config.
 * Boundary: Scenario selection only. Must not silently invent fallback scenarios.
 */
export function getRequiredScenario(config: BaselineConfig) {
  const healthScenario = config.scenarios.find(
    (scenario): scenario is HealthScenario => scenario.id === healthScenarioId,
  );

  if (!healthScenario) {
    throw new Error('Missing required scenario definition in apps/api/performance/baseline.config.json.');
  }

  return healthScenario;
}

function parseScenario(rawScenario: unknown): BaselineScenario {
  if (!isRecord(rawScenario)) {
    throw new Error('Each baseline scenario must be a JSON object.');
  }

  const { expectedStatus, id, method, path } = rawScenario;

  if (typeof id !== 'string' || typeof method !== 'string' || typeof path !== 'string') {
    throw new Error('Each baseline scenario must include string id, method, and path fields.');
  }

  if (id !== healthScenarioId) {
    throw new Error(`Unsupported scenario id in apps/api/performance/baseline.config.json: ${id}`);
  }

  if (method !== 'GET') {
    throw new Error('The api.health.get scenario must use the GET method.');
  }

  if (typeof expectedStatus !== 'number' || !Number.isInteger(expectedStatus) || expectedStatus < 100) {
    throw new Error('The api.health.get scenario must include an integer expectedStatus.');
  }

  return {
    expectedStatus,
    id,
    method,
    path,
  };
}

function parsePositiveInteger(rawValue: string, variableName: string) {
  const parsedValue = Number.parseInt(rawValue, 10);

  if (!Number.isInteger(parsedValue) || parsedValue < 1) {
    throw new Error(`Invalid ${variableName} value: ${rawValue}`);
  }

  return parsedValue;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}