import type { ReactNode } from 'react';

import { HeroSection } from './hero-section';
import { LoggingIntegrationSection } from './logging-integration-section';
import { PreviewSummarySection } from './preview-summary-section';
import type { PublicTargetSummary } from './types';

type BaselinePageSectionsProps = {
  apiBaseUrl: string;
  children?: ReactNode;
  previewSummary: PublicTargetSummary;
};

/**
 * Role: Composes the baseline page sections while keeping the outer entrypoint thin.
 * Boundary: Presentational composition only. Fetching and logging side effects stay in callers.
 * Ref: #179
 */
export function BaselinePageSections({
  apiBaseUrl,
  children,
  previewSummary,
}: BaselinePageSectionsProps) {
  const hasLoggingIntegrationContent = children !== undefined;

  return (
    <>
      <HeroSection apiBaseUrl={apiBaseUrl} />
      <PreviewSummarySection previewSummary={previewSummary} />
      {hasLoggingIntegrationContent ? (
        <LoggingIntegrationSection>{children}</LoggingIntegrationSection>
      ) : undefined}
    </>
  );
}