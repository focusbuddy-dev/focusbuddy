/** @jest-environment node */

import { GET } from '../src/app/health/route';

describe('web health route', () => {
  it('returns the expected health payload', async () => {
    const response = GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true, service: 'web' });
  });
});