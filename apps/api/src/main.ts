import * as reflectMetadata from 'reflect-metadata';

import { NestFactory } from '@nestjs/core';

import { AppModule } from '#api/app.module';
import { loadLocalRuntimeEnv } from '#api/config/local-runtime-env';
import { getApiServerPort } from '#api/env/server';
import { ApiRequestLoggingInterceptor } from '#api/logging/api-request-logging.interceptor';
import { createApiRuntimeLogger } from '#api/logging/api-runtime-logger';

async function bootstrap(): Promise<void> {
  void reflectMetadata;

  loadLocalRuntimeEnv();
  const apiRuntimeLogger = createApiRuntimeLogger();

  const app = await NestFactory.create(AppModule);
  const port = getApiServerPort();

  app.enableShutdownHooks();
  app.useGlobalInterceptors(new ApiRequestLoggingInterceptor(apiRuntimeLogger));

  await app.listen(port, '0.0.0.0');
}

void bootstrap();
