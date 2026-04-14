const DEFAULT_WEB_SERVICE_NAME = 'web';

export type ServerWebEnv = {
  FOCUSBUDDY_WEB_SERVICE_NAME?: string;
  NODE_ENV?: string;
};

function getDefaultServerEnv(): ServerWebEnv {
  const globalProcess = globalThis as typeof globalThis & {
    process?: {
      env?: ServerWebEnv;
    };
  };

  return globalProcess.process?.env ?? {};
}

/**
 * Role: Resolves the service name used by web server routes and logs.
 * Boundary: Server env only. Client code must not import this module.
 * Ref: #179
 */
export function getWebServerServiceName(env: ServerWebEnv = getDefaultServerEnv()): string {
  return env.FOCUSBUDDY_WEB_SERVICE_NAME || DEFAULT_WEB_SERVICE_NAME;
}

/**
 * Role: Exposes the current server runtime environment label for server-only decisions.
 * Boundary: Server env only. Returns a stable fallback when NODE_ENV is unset.
 * Ref: #179
 */
export function getWebServerNodeEnv(env: ServerWebEnv = getDefaultServerEnv()): string {
  return env.NODE_ENV || 'development';
}