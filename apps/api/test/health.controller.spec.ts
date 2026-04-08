import { Test } from '@nestjs/testing';

import { HealthController } from '../src/health/health.controller';
import { PrismaService } from '../src/prisma/prisma.service';

type PrismaProbe = {
  $queryRawUnsafe: (query: string) => Promise<unknown>;
};

describe('HealthController', () => {
  it('returns an OK health payload when the database probe succeeds', async () => {
    const prisma: jest.Mocked<PrismaProbe> = {
      $queryRawUnsafe: jest.fn().mockResolvedValue(1),
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
    expect(prisma.$queryRawUnsafe).toHaveBeenCalledWith('SELECT 1');
  });
});