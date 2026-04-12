import { Module } from '@nestjs/common';

import { HealthController } from '#api/health/health.controller';
import { PrismaModule } from '#api/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [HealthController],
})
export class HealthModule {}
