import { Controller, Get, Inject } from '@nestjs/common';

import { PrismaService } from '#api/prisma/prisma.service';

type HealthResponse = {
  status: 'ok';
  database: 'up';
};

/**
 * Role: Exposes the repository-owned API health route used by local runtime checks and baseline capture.
 * Boundary: Transport health surface only. Must not absorb broader feature or readiness concerns.
 */
@Controller()
export class HealthController {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  @Get('health')
  async getHealth(): Promise<HealthResponse> {
    await this.prisma.$queryRaw`SELECT 1`;

    return {
      status: 'ok',
      database: 'up',
    };
  }
}
