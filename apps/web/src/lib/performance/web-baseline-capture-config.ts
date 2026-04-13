const WEB_BASELINE_CAPTURE_ENABLED_ENV_NAME =
  'NEXT_PUBLIC_FOCUSBUDDY_WEB_BASELINE_CAPTURE_ENABLED';

export function isWebBaselineCaptureEnabled() {
  const configuredValue = process.env[WEB_BASELINE_CAPTURE_ENABLED_ENV_NAME];

  return configuredValue === '1' || configuredValue === 'true';
}

export { WEB_BASELINE_CAPTURE_ENABLED_ENV_NAME };