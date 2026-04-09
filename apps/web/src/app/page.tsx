import { WebBaselinePage } from '../components/web-baseline-page';
import { WebLoggingDemo } from '../components/web-logging-demo';
import { getFocusBuddyApiBaseUrlLabel } from '../lib/api/focusbuddy-client';
import { buildExamplePublicTargetSummary } from '../lib/api/example-public-target-summary';
import { headers } from 'next/headers';

import { focusbuddyRequestIdHeader, focusbuddyTraceIdHeader } from '@focusbuddy/logger';

export default async function HomePage() {
  const previewSummary = buildExamplePublicTargetSummary('baseline-target');
  const requestHeaders = await headers();
  const requestId =
    requestHeaders.get(focusbuddyRequestIdHeader) ??
    requestHeaders.get(focusbuddyTraceIdHeader) ??
    'web-home-request';
  const traceId = requestHeaders.get(focusbuddyTraceIdHeader) ?? requestId;

  return (
    <WebBaselinePage
      apiBaseUrl={getFocusBuddyApiBaseUrlLabel()}
      previewSummary={previewSummary}
    >
      <WebLoggingDemo requestId={requestId} targetId="baseline-target" traceId={traceId} />
    </WebBaselinePage>
  );
}
