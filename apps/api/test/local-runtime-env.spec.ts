import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import {
  buildDatabaseUrlRequirementMessage,
  deriveLocalDatabaseUrlFromTrackedInputs,
  loadLocalRuntimeEnv,
  resolveTrackedDotenvPath,
  resolveLocalRuntimeDatabaseUrl,
} from '../src/config/local-runtime-env.js';

describe('local runtime env contract', () => {
  it('keeps an explicit DATABASE_URL unchanged', () => {
    const env = {
      DATABASE_URL: 'postgresql://explicit-user:explicit-pass@db-host:5434/focusbuddy',
      POSTGRES_DB: 'focusbuddy',
      POSTGRES_USER: 'focusbuddy',
      POSTGRES_PASSWORD: 'focusbuddy',
    };

    loadLocalRuntimeEnv(env);

    expect(resolveLocalRuntimeDatabaseUrl(env)).toBe(
      'postgresql://explicit-user:explicit-pass@db-host:5434/focusbuddy',
    );
    expect(env.DATABASE_URL).toBe(
      'postgresql://explicit-user:explicit-pass@db-host:5434/focusbuddy',
    );
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

    expect(env.DATABASE_URL).toBe(
      'postgresql://focusbuddy:local-pass@localhost:5544/focusbuddy-local',
    );
  });

  it('reports missing tracked inputs in the startup error message', () => {
    const message = buildDatabaseUrlRequirementMessage('API runtime', {
      POSTGRES_USER: 'focusbuddy',
    });

    expect(message).toContain('API runtime requires DATABASE_URL.');
    expect(message).toContain('POSTGRES_PORT defaults to 5432 when omitted.');
    expect(message).toContain('Missing tracked local inputs: POSTGRES_DB, POSTGRES_PASSWORD.');
    expect(message).toContain(
      'Compose-based startup should continue to inject DATABASE_URL directly.',
    );
  });

  it('finds the workspace-root .env from an apps/api working directory', () => {
    const tempRoot = mkdtempSync(join(tmpdir(), 'focusbuddy-env-'));

    try {
      const appDirectory = join(tempRoot, 'apps', 'api');

      mkdirSync(appDirectory, { recursive: true });
      writeFileSync(join(tempRoot, 'pnpm-workspace.yaml'), 'packages:\n  - apps/*\n');
      writeFileSync(join(tempRoot, '.env'), 'POSTGRES_DB=focusbuddy\n');

      expect(resolveTrackedDotenvPath(appDirectory)).toBe(join(tempRoot, '.env'));
    } finally {
      rmSync(tempRoot, { recursive: true, force: true });
    }
  });
});
