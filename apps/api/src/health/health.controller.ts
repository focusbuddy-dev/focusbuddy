import { Controller, Get } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

type HealthResponse = {
  status: 'ok';
  database: 'up';
};

@Controller()
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('health')
  async getHealth(): Promise<HealthResponse> {
    await this.prisma.$queryRawUnsafe('SELECT 1');

    return {
      status: 'ok',
      database: 'up',
    };
  }
}