import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

import { getRequiredDatabaseUrl, loadLocalRuntimeEnv } from '#api/config/local-runtime-env';

function createPrismaClientOptions(): ConstructorParameters<typeof PrismaClient>[0] {
  loadLocalRuntimeEnv();

  const connectionString = getRequiredDatabaseUrl('API runtime');

  return {
    adapter: new PrismaPg({ connectionString }),
  };
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super(createPrismaClientOptions());
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
