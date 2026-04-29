import { getApiServerLogLevel, getApiServerPort } from '#api/env/server';

describe('getApiServerPort', () => {
  it('returns the documented default when PORT is unset', () => {
    expect(getApiServerPort({})).toBe(3001);
  });

  it('parses PORT when set to a positive integer', () => {
    expect(getApiServerPort({ PORT: '4000' })).toBe(4000);
  });

  it('treats whitespace-only PORT as unset', () => {
    expect(getApiServerPort({ PORT: '   ' })).toBe(3001);
  });

  it('falls back to the default when PORT is not parsable', () => {
    expect(getApiServerPort({ PORT: 'abc' })).toBe(3001);
  });

  it('falls back to the default when PORT is not positive', () => {
    expect(getApiServerPort({ PORT: '0' })).toBe(3001);
    expect(getApiServerPort({ PORT: '-5' })).toBe(3001);
  });
});

describe('getApiServerLogLevel', () => {
  it("returns 'info' when LOG_LEVEL is unset", () => {
    expect(getApiServerLogLevel({})).toBe('info');
  });

  it('returns the trimmed LOG_LEVEL when set', () => {
    expect(getApiServerLogLevel({ LOG_LEVEL: 'debug' })).toBe('debug');
    expect(getApiServerLogLevel({ LOG_LEVEL: '  warn  ' })).toBe('warn');
  });

  it('falls back when LOG_LEVEL is whitespace only', () => {
    expect(getApiServerLogLevel({ LOG_LEVEL: '   ' })).toBe('info');
  });
});
