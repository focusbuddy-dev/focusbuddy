import * as reflectMetadata from 'reflect-metadata';

import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';
import { loadLocalRuntimeEnv } from './config/local-runtime-env';

async function bootstrap(): Promise<void> {
  void reflectMetadata;

  loadLocalRuntimeEnv();

  const app = await NestFactory.create(AppModule);
  const port = Number.parseInt(process.env.PORT ?? '3001', 10);

  app.enableShutdownHooks();

  await app.listen(port, '0.0.0.0');
}

void bootstrap();