import { WebBaselinePage } from '../components/web-baseline-page';
import { getFocusBuddyApiBaseUrl } from '../lib/api/focusbuddy-client';
import { buildExamplePublicTargetSummary } from '../lib/api/example-public-target-summary';

export default function HomePage() {
  return (
    <WebBaselinePage
      apiBaseUrl={getFocusBuddyApiBaseUrl()}
      previewSummary={buildExamplePublicTargetSummary('baseline-target')}
    />
  );
}
