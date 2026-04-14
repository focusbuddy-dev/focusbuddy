export const healthScenarioId = 'api.health.get';

export type HealthScenario = {
  expectedStatus: number;
  id: typeof healthScenarioId;
  method: 'GET';
  path: string;
};

export type BaselineScenario = HealthScenario;

export type BaselineConfig = {
  baseUrl: string;
  defaultRunCount: number;
  requestCount: number;
  runMode: string;
  scenarios: BaselineScenario[];
  schemaVersion: number;
};

export type HealthRequestMeasurement = {
  durationMs: number;
  responseBytes: number;
  statusCode: number;
};

export type HealthRun = {
  capturedAt: string;
  requestCount: number;
  requests: HealthRequestMeasurement[];
  statusConsistent: boolean;
};

export type HealthSnapshot = {
  app: 'api';
  capturedAt: string;
  environment: {
    baseUrl: string;
    method: 'GET';
    path: string;
    runtime: 'parity';
  };
  measurements: {
    requestCount: number;
    runs: HealthRun[];
  };
  runMode: string;
  sampleSize: number;
  scenarioId: typeof healthScenarioId;
  schemaVersion: number;
  summary: {
    latencyMs: {
      median: number | undefined;
      p95: number | undefined;
    };
    responseBytes: {
      median: number | undefined;
    };
    status: {
      allExpected: boolean;
      expectedStatus: number;
      observedStatusCodes: number[];
      sampleCount: number;
    };
  };
};