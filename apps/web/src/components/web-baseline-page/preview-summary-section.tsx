import styles from './styles.module.css';
import { baselineFallbackCopy } from './constants';
import type { PublicTargetSummary } from './types';

type PreviewSummarySectionProps = {
  previewSummary: PublicTargetSummary;
};

/**
 * Role: Renders the contract-backed preview summary block for the baseline page.
 * Boundary: Presentational only. Summary shaping and fallback policy stay outside this component.
 * Ref: #179
 */
export function PreviewSummarySection({ previewSummary }: PreviewSummarySectionProps) {
  return (
    <section className={styles.summaryCard} aria-labelledby="preview-summary-title">
      <h2 className={styles.sectionTitle} id="preview-summary-title">
        Contract-backed preview summary
      </h2>
      <p className={styles.bodyText}>
        The sample below is typed from the generated contract and mirrors the kind of data the web
        app can render once the real API is connected.
      </p>
      <div className={styles.summaryStats}>
        <div>
          <strong className={styles.statValue}>{previewSummary.publicSessionCount}</strong>
          <span className={styles.statLabel}>public sessions</span>
        </div>
        <div>
          <strong className={styles.statValue}>{previewSummary.totalPublicDurationSeconds}</strong>
          <span className={styles.statLabel}>duration seconds</span>
        </div>
        <div>
          <strong className={styles.statValue}>{previewSummary.helpfulStampCount}</strong>
          <span className={styles.statLabel}>helpful stamps</span>
        </div>
      </div>
      <ul className={styles.summaryList}>
        <li>{previewSummary.target.title}</li>
        <li>
          {previewSummary.recentPublicSessions[0]?.publicNote ?? baselineFallbackCopy.emptyNote}
        </li>
        <li>{previewSummary.lastPublicSessionAt ?? baselineFallbackCopy.emptySessionDate}</li>
      </ul>
    </section>
  );
}