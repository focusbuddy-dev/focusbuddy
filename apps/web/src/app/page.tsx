import { WebBaselinePage } from '@/components/web-baseline-page';
import { WebLoggingDemo } from '@/components/web-logging-demo';
import { getFocusBuddyApiBaseUrlLabel } from '@/lib/api/focusbuddy-client';
import { buildExamplePublicTargetSummary } from '@/lib/api/example-public-target-summary';
import { WebRequestLoggingBoundary } from '@/lib/logging/web-request-logging-boundary';

export default async function HomePage() {
  const previewSummary = buildExamplePublicTargetSummary('baseline-target');

  return (
    <WebBaselinePage apiBaseUrl={getFocusBuddyApiBaseUrlLabel()} previewSummary={previewSummary}>
      <WebRequestLoggingBoundary>
        <WebLoggingDemo targetId="baseline-target" />
      </WebRequestLoggingBoundary>
    </WebBaselinePage>
  );
}
