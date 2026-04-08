import { WebBaselinePage } from '../components/web-baseline-page';
import { getFocusBuddyApiBaseUrlLabel } from '../lib/api/focusbuddy-client';
import { buildExamplePublicTargetSummary } from '../lib/api/example-public-target-summary';

export default function HomePage() {
  return (
    <WebBaselinePage
      apiBaseUrl={getFocusBuddyApiBaseUrlLabel()}
      previewSummary={buildExamplePublicTargetSummary('baseline-target')}
    />
  );
}
