import * as dotenvConfig from 'dotenv/config';

import { defineConfig } from 'prisma/config';

void dotenvConfig;

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: process.env.DATABASE_URL ?? '',
  },
});