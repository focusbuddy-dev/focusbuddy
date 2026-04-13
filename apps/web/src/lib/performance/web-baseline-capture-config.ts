const WEB_BASELINE_CAPTURE_ENABLED_ENV_NAME =
  'NEXT_PUBLIC_FOCUSBUDDY_WEB_BASELINE_CAPTURE_ENABLED';
const WEB_BASELINE_CAPTURE_CONTEXT_ENV_NAME =
  'NEXT_PUBLIC_FOCUSBUDDY_WEB_BASELINE_CAPTURE_CONTEXT';

const allowedWebBaselineCaptureContexts = new Set(['parity', 'preview', 'dedicated']);

export function isWebBaselineCaptureEnabled() {
  const configuredValue = process.env[WEB_BASELINE_CAPTURE_ENABLED_ENV_NAME];
  const configuredContext = process.env[WEB_BASELINE_CAPTURE_CONTEXT_ENV_NAME];

  return (
    (configuredValue === '1' || configuredValue === 'true') &&
    typeof configuredContext === 'string' &&
    allowedWebBaselineCaptureContexts.has(configuredContext)
  );
}

export {
  WEB_BASELINE_CAPTURE_CONTEXT_ENV_NAME,
  WEB_BASELINE_CAPTURE_ENABLED_ENV_NAME,
};