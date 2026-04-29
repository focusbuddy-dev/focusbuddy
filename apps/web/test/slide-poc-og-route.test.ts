/** @jest-environment node */

import { jest } from '@jest/globals';

type ImageResponseInit = { width?: number; height?: number };

function mockImageResponse(_element: unknown, init?: ImageResponseInit): Response {
  return new Response('mock-png-bytes', {
    headers: {
      'content-type': 'image/png',
      'x-image-width': String(init?.width ?? 0),
      'x-image-height': String(init?.height ?? 0),
    },
  });
}

jest.unstable_mockModule('next/og', () => ({
  ImageResponse: mockImageResponse,
}));

type RouteRequestShape = {
  nextUrl: URL;
};

function buildRequest(query: string): RouteRequestShape {
  return {
    nextUrl: new URL(`https://example.com/slide-poc/og${query}`),
  };
}

describe('slide-poc og route', () => {
  it('returns a 1200x630 PNG response for valid encoded markdown', async () => {
    const { GET } = await import('@/app/slide-poc/og/route');
    const { encodeSlideContent } = await import('@/app/slide-poc/slide-content');

    const encoded = encodeSlideContent('# OGP タイトル\n\n本文サンプル');
    const response = GET(buildRequest(`?d=${encoded}`) as never);

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('image/png');
    expect(response.headers.get('x-image-width')).toBe('1200');
    expect(response.headers.get('x-image-height')).toBe('630');
  });

  it('returns 400 when the d parameter is missing', async () => {
    const { GET } = await import('@/app/slide-poc/og/route');
    const response = GET(buildRequest('') as never);
    expect(response.status).toBe(400);
  });

  it('returns 400 when the encoded content cannot be decoded', async () => {
    const { GET } = await import('@/app/slide-poc/og/route');
    const response = GET(buildRequest('?d=%25%25%25not-valid%25%25%25') as never);
    expect(response.status).toBe(400);
  });
});
