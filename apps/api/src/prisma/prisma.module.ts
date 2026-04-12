import { Global, Module } from '@nestjs/common';

import { PrismaService } from '#api/prisma/prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
