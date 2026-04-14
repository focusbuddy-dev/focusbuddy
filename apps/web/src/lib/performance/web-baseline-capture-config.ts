import {
  WEB_BASELINE_CAPTURE_CONTEXT_ENV_NAME,
  WEB_BASELINE_CAPTURE_ENABLED_ENV_NAME,
  isWebBaselineCaptureEnabled as isPublicWebBaselineCaptureEnabled,
} from '@/env/client';

/**
 * Role: Preserves the baseline capture runtime seam while delegating env parsing to the client env module.
 * Boundary: Runtime helper only. Raw process.env access stays centralized under src/env.
 * Ref: #179
 */
export function isWebBaselineCaptureEnabled() {
  return isPublicWebBaselineCaptureEnabled();
}

export { WEB_BASELINE_CAPTURE_CONTEXT_ENV_NAME, WEB_BASELINE_CAPTURE_ENABLED_ENV_NAME };