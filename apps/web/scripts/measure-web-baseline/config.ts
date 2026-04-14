import { readFile } from 'node:fs/promises';

import {
  type BaselineConfig,
  type BaselineScenario,
  type InitialLoadScenario,
  initialLoadScenarioId,
  type NavigationScenario,
  navigationScenarioId,
} from './types';

export async function readBaselineConfig(filePath: string) {
  const rawConfig = JSON.parse(await readFile(filePath, 'utf8')) as unknown;

  return parseBaselineConfig(rawConfig);
}

export function parseBaselineConfig(rawConfig: unknown): BaselineConfig {
  if (!isRecord(rawConfig)) {
    throw new Error('Baseline config must be a JSON object.');
  }

  const { baseUrl, browser, lighthouse: rawLighthouse, runMode } = rawConfig;
  const defaultRunCount = rawConfig.defaultRunCount;
  const schemaVersion = rawConfig.schemaVersion;

  if (typeof baseUrl !== 'string') {
    throw new Error('Baseline config must include a string baseUrl.');
  }

  if (typeof browser !== 'string') {
    throw new Error('Baseline config must include a string browser.');
  }

  if (typeof defaultRunCount !== 'number' || !Number.isInteger(defaultRunCount) || defaultRunCount < 1) {
    throw new Error('Baseline config must include a positive integer defaultRunCount.');
  }

  if (typeof runMode !== 'string') {
    throw new Error('Baseline config must include a string runMode.');
  }

  if (typeof schemaVersion !== 'number' || !Number.isInteger(schemaVersion) || schemaVersion < 1) {
    throw new Error('Baseline config must include a positive integer schemaVersion.');
  }

  if (!isRecord(rawLighthouse)) {
    throw new Error('Baseline config must include a lighthouse object.');
  }

  const { formFactor, onlyAudits } = rawLighthouse;

  if (typeof formFactor !== 'string') {
    throw new Error('Baseline config lighthouse.formFactor must be a string.');
  }

  if (!Array.isArray(onlyAudits) || onlyAudits.some((auditId) => typeof auditId !== 'string')) {
    throw new Error('Baseline config lighthouse.onlyAudits must be a string array.');
  }

  const rawScenarios = rawConfig.scenarios;

  if (!Array.isArray(rawScenarios)) {
    throw new Error('Baseline config must include a scenarios array.');
  }

  return {
    baseUrl,
    browser,
    defaultRunCount,
    lighthouse: {
      formFactor,
      onlyAudits,
    },
    runMode,
    scenarios: rawScenarios.map((scenario) => parseScenario(scenario)),
    schemaVersion,
  };
}

export function parseRunCount(rawValue: string) {
  const parsedValue = Number.parseInt(rawValue, 10);

  if (!Number.isInteger(parsedValue) || parsedValue < 1) {
    throw new Error(`Invalid FOCUSBUDDY_WEB_BASELINE_RUNS value: ${rawValue}`);
  }

  return parsedValue;
}

export function getRequiredScenarios(config: BaselineConfig) {
  const initialLoadScenario = config.scenarios.find(
    (scenario): scenario is InitialLoadScenario => scenario.id === initialLoadScenarioId,
  );
  const navigationScenario = config.scenarios.find(
    (scenario): scenario is NavigationScenario => scenario.id === navigationScenarioId,
  );

  if (!initialLoadScenario || !navigationScenario) {
    throw new Error('Missing required scenario definitions in apps/web/performance/baseline.config.json.');
  }

  return { initialLoadScenario, navigationScenario };
}

function parseScenario(rawScenario: unknown): BaselineScenario {
  if (!isRecord(rawScenario)) {
    throw new Error('Each baseline scenario must be a JSON object.');
  }

  const { id, path } = rawScenario;

  if (typeof id !== 'string' || typeof path !== 'string') {
    throw new Error('Each baseline scenario must include string id and path fields.');
  }

  if (id === initialLoadScenarioId) {
    return {
      id,
      path,
    };
  }

  if (id === navigationScenarioId) {
    if (typeof rawScenario.targetSearch !== 'string' || typeof rawScenario.triggerButtonText !== 'string') {
      throw new Error(
        'The details-navigation scenario must include string targetSearch and triggerButtonText fields.',
      );
    }

    return {
      id,
      path,
      targetSearch: rawScenario.targetSearch,
      triggerButtonText: rawScenario.triggerButtonText,
    };
  }

  throw new Error(`Unsupported scenario id in apps/web/performance/baseline.config.json: ${id}`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}