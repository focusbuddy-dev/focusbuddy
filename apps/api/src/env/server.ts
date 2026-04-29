const DEFAULT_API_SERVER_PORT = 3001;
const DEFAULT_API_LOG_LEVEL = 'info';

export type ServerApiEnv = {
  LOG_LEVEL?: string;
  PORT?: string;
};

function getDefaultServerEnv(): ServerApiEnv {
  const globalProcess = globalThis as typeof globalThis & {
    process?: {
      env?: ServerApiEnv;
    };
  };

  return globalProcess.process?.env ?? {};
}

function readTrimmedEnv(env: ServerApiEnv, name: keyof ServerApiEnv): string | undefined {
  const value = env[name]?.trim();

  return value ? value : undefined;
}

/**
 * Role: Resolves the TCP port the NestJS API listens on at bootstrap.
 * Boundary: Server env only. Returns the documented default when PORT is unset or unparsable.
 * Ref: docs/platform/api-module-structure-and-context-policy.md
 */
export function getApiServerPort(env: ServerApiEnv = getDefaultServerEnv()): number {
  const raw = readTrimmedEnv(env, 'PORT');

  if (raw === undefined) {
    return DEFAULT_API_SERVER_PORT;
  }

  const parsed = Number.parseInt(raw, 10);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_API_SERVER_PORT;
}

/**
 * Role: Resolves the log level applied to the API runtime logger.
 * Boundary: Server env only. Returns the documented default when LOG_LEVEL is unset.
 * Ref: docs/platform/api-module-structure-and-context-policy.md
 */
export function getApiServerLogLevel(env: ServerApiEnv = getDefaultServerEnv()): string {
  return readTrimmedEnv(env, 'LOG_LEVEL') ?? DEFAULT_API_LOG_LEVEL;
}
