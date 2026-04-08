import * as dotenvConfig from 'dotenv/config';

import { defineConfig } from 'prisma/config';

void dotenvConfig;

const databaseUrl = process.env.DATABASE_URL?.trim();
const fallbackDatabaseUrl = 'postgresql://focusbuddy:focusbuddy@localhost:5432/focusbuddy';
const prismaCommand = process.argv.slice(2).join(' ');
const requiresConfiguredDatabaseUrl =
  prismaCommand.includes('migrate') || prismaCommand.includes('db ') || prismaCommand.includes('studio');

if (requiresConfiguredDatabaseUrl && !databaseUrl) {
  throw new Error(
    'DATABASE_URL is required for Prisma database commands. Set it in the environment or .env before running Prisma.',
  );
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: databaseUrl ?? fallbackDatabaseUrl,
  },
});
