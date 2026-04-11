import { Module } from '@nestjs/common';

import { HealthModule } from '#api/health/health.module';
import { PrismaModule } from '#api/prisma/prisma.module';

@Module({
  imports: [PrismaModule, HealthModule],
})
export class AppModule {}