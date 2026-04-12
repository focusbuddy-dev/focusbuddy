import { jest } from '@jest/globals';

import { resolveWebRequestCorrelation } from '../src/lib/logging/web-request-correlation';
import {
  focusbuddyRequestIdHeader,
  focusbuddyTraceIdHeader,
} from '../src/lib/logging/next-middleware-logger';

describe('web request correlation helper', () => {
  it('reuses incoming correlation headers', () => {
    const correlation = resolveWebRequestCorrelation(
      new Headers({
        [focusbuddyRequestIdHeader]: 'request-301',
        [focusbuddyTraceIdHeader]: 'trace-301',
      }),
    );

    expect(correlation).toEqual({
      requestId: 'request-301',
      traceId: 'trace-301',
    });
  });

  it('mints a fallback request id when headers are missing', () => {
    const randomUuidSpy = jest
      .spyOn(globalThis.crypto, 'randomUUID')
      .mockReturnValue('generated-request-301');

    const correlation = resolveWebRequestCorrelation(new Headers());

    expect(correlation).toEqual({
      requestId: 'generated-request-301',
      traceId: 'generated-request-301',
    });

    randomUuidSpy.mockRestore();
  });
});
