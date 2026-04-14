const LOCAL_API_BASE_URL = 'http://localhost:3000';
const API_BASE_URL_ENV_NAME = 'NEXT_PUBLIC_FOCUSBUDDY_API_BASE_URL';
const WEB_BASELINE_CAPTURE_ENABLED_ENV_NAME =
  'NEXT_PUBLIC_FOCUSBUDDY_WEB_BASELINE_CAPTURE_ENABLED';
const WEB_BASELINE_CAPTURE_CONTEXT_ENV_NAME =
  'NEXT_PUBLIC_FOCUSBUDDY_WEB_BASELINE_CAPTURE_CONTEXT';

const allowedWebBaselineCaptureContexts = ['parity', 'preview', 'dedicated'] as const;

type WebBaselineCaptureContext = (typeof allowedWebBaselineCaptureContexts)[number];

export type ClientWebEnv = {
  NEXT_PUBLIC_FOCUSBUDDY_API_BASE_URL?: string;
  NEXT_PUBLIC_FOCUSBUDDY_WEB_BASELINE_CAPTURE_CONTEXT?: string;
  NEXT_PUBLIC_FOCUSBUDDY_WEB_BASELINE_CAPTURE_ENABLED?: string;
  NODE_ENV?: string;
};

type WebBaselineCaptureConfig = {
  context: WebBaselineCaptureContext;
  enabled: true;
};

function getDefaultClientEnv(): ClientWebEnv {
  const env: ClientWebEnv = {};
  const apiBaseUrl = process.env.NEXT_PUBLIC_FOCUSBUDDY_API_BASE_URL;
  const webBaselineCaptureContext = process.env.NEXT_PUBLIC_FOCUSBUDDY_WEB_BASELINE_CAPTURE_CONTEXT;
  const webBaselineCaptureEnabled = process.env.NEXT_PUBLIC_FOCUSBUDDY_WEB_BASELINE_CAPTURE_ENABLED;
  const nodeEnv = process.env.NODE_ENV;

  if (apiBaseUrl !== undefined) {
    env.NEXT_PUBLIC_FOCUSBUDDY_API_BASE_URL = apiBaseUrl;
  }

  if (webBaselineCaptureContext !== undefined) {
    env.NEXT_PUBLIC_FOCUSBUDDY_WEB_BASELINE_CAPTURE_CONTEXT = webBaselineCaptureContext;
  }

  if (webBaselineCaptureEnabled !== undefined) {
    env.NEXT_PUBLIC_FOCUSBUDDY_WEB_BASELINE_CAPTURE_ENABLED = webBaselineCaptureEnabled;
  }

  if (nodeEnv !== undefined) {
    env.NODE_ENV = nodeEnv;
  }

  return env;
}

function isLocalApiFallbackEnabled(nodeEnv?: string): boolean {
  return nodeEnv === 'development' || nodeEnv === 'test';
}

function isEnabledFlag(value?: string): boolean {
  return value === '1' || value === 'true';
}

function isWebBaselineCaptureContext(
  value?: string,
): value is WebBaselineCaptureContext {
  return (
    typeof value === 'string' &&
    allowedWebBaselineCaptureContexts.includes(value as WebBaselineCaptureContext)
  );
}

/**
 * Role: Resolves the browser-safe API base URL for the web app client env boundary.
 * Boundary: Client env only. Must not read server-only or test-only env modules.
 * Ref: #179
 */
export function resolveClientApiBaseUrl(env: ClientWebEnv = getDefaultClientEnv()): string | undefined {
  const configuredBaseUrl = env.NEXT_PUBLIC_FOCUSBUDDY_API_BASE_URL;

  if (configuredBaseUrl) {
    return configuredBaseUrl;
  }

  if (isLocalApiFallbackEnabled(env.NODE_ENV)) {
    return LOCAL_API_BASE_URL;
  }

  return undefined;
}

/**
 * Role: Returns the required client API base URL or throws when the runtime contract is invalid.
 * Boundary: Client env only. Caller-facing runtime guard for the generated client seam.
 * Ref: #179
 */
export function getRequiredClientApiBaseUrl(env: ClientWebEnv = getDefaultClientEnv()): string {
  const baseUrl = resolveClientApiBaseUrl(env);

  if (baseUrl) {
    return baseUrl;
  }

  throw new Error(
    `${API_BASE_URL_ENV_NAME} must be set outside development and test when creating the FocusBuddy API client.`,
  );
}

/**
 * Role: Builds the human-readable API origin label shown by the baseline page.
 * Boundary: Client env only. Display helper for runtime diagnostics.
 * Ref: #179
 */
export function getClientApiBaseUrlLabel(env: ClientWebEnv = getDefaultClientEnv()): string {
  return resolveClientApiBaseUrl(env) ?? 'same-origin';
}

/**
 * Role: Parses the client-side web-baseline capture configuration from browser-safe env values.
 * Boundary: Client env only. Validation lives here so callers do not duplicate string parsing logic.
 * Ref: #179
 */
export function resolveWebBaselineCaptureConfig(
  env: ClientWebEnv = getDefaultClientEnv(),
): WebBaselineCaptureConfig | undefined {
  if (!isEnabledFlag(env.NEXT_PUBLIC_FOCUSBUDDY_WEB_BASELINE_CAPTURE_ENABLED)) {
    return undefined;
  }

  if (!isWebBaselineCaptureContext(env.NEXT_PUBLIC_FOCUSBUDDY_WEB_BASELINE_CAPTURE_CONTEXT)) {
    return undefined;
  }

  return {
    context: env.NEXT_PUBLIC_FOCUSBUDDY_WEB_BASELINE_CAPTURE_CONTEXT,
    enabled: true,
  };
}

/**
 * Role: Reports whether baseline capture is enabled for a supported client runtime context.
 * Boundary: Client env only. Callers should not parse feature flags from process.env directly.
 * Ref: #179
 */
export function isWebBaselineCaptureEnabled(env: ClientWebEnv = getDefaultClientEnv()): boolean {
  return resolveWebBaselineCaptureConfig(env) !== undefined;
}

export {
  API_BASE_URL_ENV_NAME,
  WEB_BASELINE_CAPTURE_CONTEXT_ENV_NAME,
  WEB_BASELINE_CAPTURE_ENABLED_ENV_NAME,
};