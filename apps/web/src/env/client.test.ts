import {
  getClientApiBaseUrlLabel,
  getRequiredClientApiBaseUrl,
  isWebBaselineCaptureEnabled,
  resolveClientApiBaseUrl,
  resolveWebBaselineCaptureConfig,
} from './client';

describe('client env helpers', () => {
  it('returns the configured client API base URL when present', () => {
    expect(
      resolveClientApiBaseUrl({
        NEXT_PUBLIC_FOCUSBUDDY_API_BASE_URL: 'https://api.focusbuddy.dev',
        NODE_ENV: 'production',
      }),
    ).toBe('https://api.focusbuddy.dev');
  });

  it('falls back to localhost only in development and test', () => {
    expect(resolveClientApiBaseUrl({ NODE_ENV: 'development' })).toBe('http://localhost:3000');
    expect(resolveClientApiBaseUrl({ NODE_ENV: 'test' })).toBe('http://localhost:3000');
    expect(resolveClientApiBaseUrl({ NODE_ENV: 'production' })).toBeUndefined();
  });

  it('throws for a missing required client API base URL in production', () => {
    expect(() => getRequiredClientApiBaseUrl({ NODE_ENV: 'production' })).toThrow(
      'NEXT_PUBLIC_FOCUSBUDDY_API_BASE_URL must be set outside development and test when creating the FocusBuddy API client.',
    );
  });

  it('builds a display label without leaking an invalid production fallback', () => {
    expect(getClientApiBaseUrlLabel({ NODE_ENV: 'production' })).toBe('same-origin');
    expect(
      getClientApiBaseUrlLabel({
        NEXT_PUBLIC_FOCUSBUDDY_API_BASE_URL: 'https://api.focusbuddy.dev',
        NODE_ENV: 'production',
      }),
    ).toBe('https://api.focusbuddy.dev');
  });

  it('parses baseline capture config only for enabled flags and supported contexts', () => {
    expect(
      resolveWebBaselineCaptureConfig({
        NEXT_PUBLIC_FOCUSBUDDY_WEB_BASELINE_CAPTURE_CONTEXT: 'parity',
        NEXT_PUBLIC_FOCUSBUDDY_WEB_BASELINE_CAPTURE_ENABLED: 'true',
      }),
    ).toEqual({
      context: 'parity',
      enabled: true,
    });

    expect(
      resolveWebBaselineCaptureConfig({
        NEXT_PUBLIC_FOCUSBUDDY_WEB_BASELINE_CAPTURE_CONTEXT: 'production',
        NEXT_PUBLIC_FOCUSBUDDY_WEB_BASELINE_CAPTURE_ENABLED: 'true',
      }),
    ).toBeUndefined();
    expect(
      resolveWebBaselineCaptureConfig({
        NEXT_PUBLIC_FOCUSBUDDY_WEB_BASELINE_CAPTURE_CONTEXT: 'parity',
        NEXT_PUBLIC_FOCUSBUDDY_WEB_BASELINE_CAPTURE_ENABLED: 'false',
      }),
    ).toBeUndefined();
  });

  it('answers the baseline capture flag from injected env input', () => {
    expect(
      isWebBaselineCaptureEnabled({
        NEXT_PUBLIC_FOCUSBUDDY_WEB_BASELINE_CAPTURE_CONTEXT: 'preview',
        NEXT_PUBLIC_FOCUSBUDDY_WEB_BASELINE_CAPTURE_ENABLED: '1',
      }),
    ).toBe(true);
    expect(
      isWebBaselineCaptureEnabled({
        NEXT_PUBLIC_FOCUSBUDDY_WEB_BASELINE_CAPTURE_CONTEXT: 'preview',
        NEXT_PUBLIC_FOCUSBUDDY_WEB_BASELINE_CAPTURE_ENABLED: '0',
      }),
    ).toBe(false);
  });
});