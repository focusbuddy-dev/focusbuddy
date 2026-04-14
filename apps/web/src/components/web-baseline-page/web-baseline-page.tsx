import styles from './styles.module.css';
import { BaselinePageSections } from './baseline-page-sections';
import type { WebBaselinePageProps } from './types';

/**
 * Role: Renders the baseline landing page shell for the current web app contract demo.
 * Boundary: Presentational composition only. Logging and navigation side effects stay in child boundaries.
 * Ref: #179
 */
export function WebBaselinePage({ apiBaseUrl, children, previewSummary }: WebBaselinePageProps) {
  return (
    <main className={styles.pageShell}>
      <div className={styles.pageGrid}>
        <BaselinePageSections
          apiBaseUrl={apiBaseUrl}
          previewSummary={previewSummary}
          children={children}
        />
      </div>
    </main>
  );
}