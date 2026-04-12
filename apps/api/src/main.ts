import * as reflectMetadata from 'reflect-metadata';

import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module.js';
import { loadLocalRuntimeEnv } from './config/local-runtime-env.js';
import { ApiRequestLoggingInterceptor } from './logging/api-request-logging.interceptor.js';
import { createApiRuntimeLogger } from './logging/api-runtime-logger.js';

async function bootstrap(): Promise<void> {
  void reflectMetadata;

  loadLocalRuntimeEnv();
  const apiRuntimeLogger = createApiRuntimeLogger();

  const app = await NestFactory.create(AppModule);
  const port = Number.parseInt(process.env.PORT ?? '3001', 10);

  app.enableShutdownHooks();
  app.useGlobalInterceptors(new ApiRequestLoggingInterceptor(apiRuntimeLogger));

  await app.listen(port, '0.0.0.0');
}

void bootstrap();
