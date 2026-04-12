import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig } from 'prisma/config';

import {
  buildDatabaseUrlRequirementMessage,
  loadLocalRuntimeEnv,
  resolveLocalRuntimeDatabaseUrl,
} from './src/config/local-runtime-env.js';

const configDirectory = dirname(fileURLToPath(import.meta.url));

loadLocalRuntimeEnv(process.env, { cwd: configDirectory });

const databaseUrl = resolveLocalRuntimeDatabaseUrl();
const fallbackDatabaseUrl = 'postgresql://focusbuddy:focusbuddy@localhost:5432/focusbuddy';
const prismaCommand = process.argv.slice(2).join(' ');
const requiresConfiguredDatabaseUrl =
  prismaCommand.includes('migrate') ||
  prismaCommand.includes('db ') ||
  prismaCommand.includes('studio');

if (requiresConfiguredDatabaseUrl && !databaseUrl) {
  throw new Error(buildDatabaseUrlRequirementMessage('Prisma database commands'));
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: databaseUrl ?? fallbackDatabaseUrl,
  },
});
