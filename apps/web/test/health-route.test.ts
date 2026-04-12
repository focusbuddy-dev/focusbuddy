/** @jest-environment node */

import { jest } from '@jest/globals';
import { GET } from '../src/app/health/route';
import {
  focusbuddyRequestIdHeader,
  focusbuddyTraceIdHeader,
} from '../src/lib/logging/next-middleware-logger';

describe('web health route', () => {
  it('returns the expected health payload', async () => {
    const infoSpy = jest.spyOn(console, 'info').mockImplementation(() => undefined);

    const response = GET({
      headers: new Headers({
        [focusbuddyRequestIdHeader]: 'request-201',
        [focusbuddyTraceIdHeader]: 'trace-201',
      }),
      method: 'GET',
      nextUrl: {
        pathname: '/health',
      },
    } as never);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true, service: 'web' });
    expect(infoSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        application: 'focusbuddy-web',
        category: 'Health',
        layer: 'web-server',
        logId: 'WEB_HEALTH_001',
        requestId: 'request-201',
        requestMethod: 'GET',
        requestPath: '/health',
        runtime: 'web-server',
        traceId: 'trace-201',
      }),
      'Web health route responded - Status: 200',
    );

    infoSpy.mockRestore();
  });

  it('mints a unique fallback request id when correlation headers are missing', async () => {
    const infoSpy = jest.spyOn(console, 'info').mockImplementation(() => undefined);
    const randomUuidSpy = jest
      .spyOn(globalThis.crypto, 'randomUUID')
      .mockReturnValue('generated-web-health-id');

    const response = GET({
      headers: new Headers(),
      method: 'GET',
      nextUrl: {
        pathname: '/health',
      },
    } as never);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true, service: 'web' });
    expect(infoSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        requestId: 'generated-web-health-id',
        traceId: 'generated-web-health-id',
      }),
      'Web health route responded - Status: 200',
    );

    randomUuidSpy.mockRestore();
    infoSpy.mockRestore();
  });
});
