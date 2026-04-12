import { Test } from '@nestjs/testing';
import { jest } from '@jest/globals';

import { HealthController } from '#api/health/health.controller';
import { PrismaService } from '#api/prisma/prisma.service';

type PrismaProbe = {
  $queryRaw: (query: TemplateStringsArray) => Promise<unknown>;
};

describe('HealthController', () => {
  it('returns an OK health payload when the database probe succeeds', async () => {
    const prisma: jest.Mocked<PrismaProbe> = {
      $queryRaw: jest.fn().mockResolvedValue(1),
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    const controller = moduleRef.get(HealthController);

    await expect(controller.getHealth()).resolves.toEqual({
      status: 'ok',
      database: 'up',
    });
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
    expect(prisma.$queryRaw.mock.calls[0]?.[0]).toContain('SELECT 1');
  });
});
