import {
  buildDatabaseUrlRequirementMessage,
  deriveLocalDatabaseUrlFromTrackedInputs,
  loadLocalRuntimeEnv,
  resolveLocalRuntimeDatabaseUrl,
} from '../src/config/local-runtime-env';

describe('local runtime env contract', () => {
  it('keeps an explicit DATABASE_URL unchanged', () => {
    const env = {
      DATABASE_URL: 'postgresql://explicit-user:explicit-pass@db-host:5434/focusbuddy',
      POSTGRES_DB: 'focusbuddy',
      POSTGRES_USER: 'focusbuddy',
      POSTGRES_PASSWORD: 'focusbuddy',
    };

    loadLocalRuntimeEnv(env);

    expect(resolveLocalRuntimeDatabaseUrl(env)).toBe('postgresql://explicit-user:explicit-pass@db-host:5434/focusbuddy');
    expect(env.DATABASE_URL).toBe('postgresql://explicit-user:explicit-pass@db-host:5434/focusbuddy');
  });

  it('derives a localhost DATABASE_URL from tracked PostgreSQL inputs', () => {
    const env = {
      POSTGRES_DB: 'focusbuddy-local',
      POSTGRES_USER: 'focusbuddy',
      POSTGRES_PASSWORD: 'local-pass',
      POSTGRES_PORT: '5544',
    };

    expect(deriveLocalDatabaseUrlFromTrackedInputs(env)).toBe(
      'postgresql://focusbuddy:local-pass@localhost:5544/focusbuddy-local',
    );

    loadLocalRuntimeEnv(env);

    expect(env.DATABASE_URL).toBe('postgresql://focusbuddy:local-pass@localhost:5544/focusbuddy-local');
  });

  it('reports missing tracked inputs in the startup error message', () => {
    const message = buildDatabaseUrlRequirementMessage('API runtime', {
      POSTGRES_USER: 'focusbuddy',
    });

    expect(message).toContain('API runtime requires DATABASE_URL.');
    expect(message).toContain('POSTGRES_PORT defaults to 5432 when omitted.');
    expect(message).toContain('Missing tracked local inputs: POSTGRES_DB, POSTGRES_PASSWORD.');
    expect(message).toContain('Compose-based startup should continue to inject DATABASE_URL directly.');
  });
});