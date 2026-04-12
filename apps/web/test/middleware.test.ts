/** @jest-environment node */

import { jest } from '@jest/globals';
import { NextRequest } from 'next/server';

import { middleware } from '../src/middleware';
import {
  focusbuddyRequestIdHeader,
  focusbuddyTraceIdHeader,
} from '../src/lib/logging/next-middleware-logger';

describe('web middleware', () => {
  it('adds correlation headers to the response', () => {
    const infoSpy = jest.spyOn(console, 'info').mockImplementation(() => undefined);
    const request = new NextRequest('https://focusbuddy.example/health', {
      headers: {
        [focusbuddyRequestIdHeader]: 'req-700',
        [focusbuddyTraceIdHeader]: 'trace-700',
      },
    });

    const response = middleware(request);

    expect(response.headers.get(focusbuddyRequestIdHeader)).toBe('req-700');
    expect(response.headers.get(focusbuddyTraceIdHeader)).toBe('trace-700');

    infoSpy.mockRestore();
  });
});
