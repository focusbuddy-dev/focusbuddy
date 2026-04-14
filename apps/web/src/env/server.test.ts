import { getWebServerNodeEnv, getWebServerServiceName } from './server';

describe('server env helpers', () => {
  it('returns the configured server service name when present', () => {
    expect(getWebServerServiceName({ FOCUSBUDDY_WEB_SERVICE_NAME: 'focusbuddy-web-alt' })).toBe(
      'focusbuddy-web-alt',
    );
  });

  it('falls back to the default service name when unset', () => {
    expect(getWebServerServiceName({})).toBe('web');
  });

  it('returns the configured server node env when present', () => {
    expect(getWebServerNodeEnv({ NODE_ENV: 'production' })).toBe('production');
  });

  it('falls back to development when server node env is unset', () => {
    expect(getWebServerNodeEnv({})).toBe('development');
  });
});