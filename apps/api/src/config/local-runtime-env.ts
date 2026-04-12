import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { config as loadDotenvConfig } from 'dotenv';

const DEFAULT_LOCAL_POSTGRES_HOST = 'localhost';
const DEFAULT_POSTGRES_PORT = '5432';
const REQUIRED_TRACKED_POSTGRES_ENV_NAMES = [
  'POSTGRES_DB',
  'POSTGRES_USER',
  'POSTGRES_PASSWORD',
] as const;
const WORKSPACE_MARKER_FILE = 'pnpm-workspace.yaml';

function readTrimmedEnv(env: NodeJS.ProcessEnv, name: string): string | undefined {
  const value = env[name]?.trim();

  return value ? value : undefined;
}

function encodeConnectionPart(value: string): string {
  return encodeURIComponent(value);
}

function findWorkspaceRoot(startDirectory: string): string | undefined {
  let currentDirectory = resolve(startDirectory);

  while (true) {
    if (existsSync(join(currentDirectory, WORKSPACE_MARKER_FILE))) {
      return currentDirectory;
    }

    const parentDirectory = resolve(currentDirectory, '..');

    if (parentDirectory === currentDirectory) {
      return undefined;
    }

    currentDirectory = parentDirectory;
  }
}

export function resolveTrackedDotenvPath(
  currentWorkingDirectory = process.cwd(),
): string | undefined {
  const candidateDirectories = [
    findWorkspaceRoot(currentWorkingDirectory),
    resolve(currentWorkingDirectory),
  ].filter(
    (directory, index, directories): directory is string =>
      Boolean(directory) && directories.indexOf(directory) === index,
  );

  for (const directory of candidateDirectories) {
    const dotenvPath = join(directory, '.env');

    if (existsSync(dotenvPath)) {
      return dotenvPath;
    }
  }

  return undefined;
}

export function deriveLocalDatabaseUrlFromTrackedInputs(
  env: NodeJS.ProcessEnv = process.env,
): string | undefined {
  const databaseName = readTrimmedEnv(env, 'POSTGRES_DB');
  const user = readTrimmedEnv(env, 'POSTGRES_USER');
  const password = readTrimmedEnv(env, 'POSTGRES_PASSWORD');

  if (!databaseName || !user || !password) {
    return undefined;
  }

  const port = readTrimmedEnv(env, 'POSTGRES_PORT') ?? DEFAULT_POSTGRES_PORT;

  return `postgresql://${encodeConnectionPart(user)}:${encodeConnectionPart(password)}@${DEFAULT_LOCAL_POSTGRES_HOST}:${port}/${encodeConnectionPart(databaseName)}`;
}

export function resolveLocalRuntimeDatabaseUrl(
  env: NodeJS.ProcessEnv = process.env,
): string | undefined {
  return readTrimmedEnv(env, 'DATABASE_URL') ?? deriveLocalDatabaseUrlFromTrackedInputs(env);
}

export function buildDatabaseUrlRequirementMessage(
  runtimeContext: string,
  env: NodeJS.ProcessEnv = process.env,
): string {
  const missingTrackedInputs = REQUIRED_TRACKED_POSTGRES_ENV_NAMES.filter(
    (name) => !readTrimmedEnv(env, name),
  );
  const missingTrackedInputsText = missingTrackedInputs.length
    ? ` Missing tracked local inputs: ${missingTrackedInputs.join(', ')}.`
    : '';

  return (
    `${runtimeContext} requires DATABASE_URL. ` +
    'Set DATABASE_URL directly, or set POSTGRES_DB, POSTGRES_USER, and POSTGRES_PASSWORD in .env so host-side local startup can derive a localhost connection string. ' +
    `POSTGRES_PORT defaults to ${DEFAULT_POSTGRES_PORT} when omitted.` +
    `${missingTrackedInputsText} Compose-based startup should continue to inject DATABASE_URL directly.`
  );
}

export function loadLocalRuntimeEnv(
  env: NodeJS.ProcessEnv = process.env,
  options: { cwd?: string } = {},
): void {
  if (env === process.env) {
    const dotenvPath = resolveTrackedDotenvPath(options.cwd);

    if (dotenvPath) {
      loadDotenvConfig({ path: dotenvPath });
    } else {
      loadDotenvConfig();
    }
  }

  const explicitDatabaseUrl = readTrimmedEnv(env, 'DATABASE_URL');

  if (explicitDatabaseUrl) {
    env.DATABASE_URL = explicitDatabaseUrl;

    return;
  }

  const derivedDatabaseUrl = deriveLocalDatabaseUrlFromTrackedInputs(env);

  if (derivedDatabaseUrl) {
    env.DATABASE_URL = derivedDatabaseUrl;
  }
}

export function getRequiredDatabaseUrl(
  runtimeContext: string,
  env: NodeJS.ProcessEnv = process.env,
): string {
  const databaseUrl = resolveLocalRuntimeDatabaseUrl(env);

  if (databaseUrl) {
    return databaseUrl;
  }

  throw new Error(buildDatabaseUrlRequirementMessage(runtimeContext, env));
}
