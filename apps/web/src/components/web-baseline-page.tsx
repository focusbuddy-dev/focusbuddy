import type { ReactNode } from 'react';

import type { components as ApiComponents } from '@focusbuddy/api-contract/generated/types';

import styles from './web-baseline-page.module.css';

type PublicTargetSummary = ApiComponents['schemas']['PublicTargetSummary'];

type WebBaselinePageProps = {
  apiBaseUrl: string;
  children?: ReactNode;
  previewSummary: PublicTargetSummary;
};

export function WebBaselinePage({ apiBaseUrl, children, previewSummary }: WebBaselinePageProps) {
  return (
    <main className={styles.pageShell}>
      <div className={styles.pageGrid}>
        <section className={styles.hero}>
          <div className={styles.heroLabel}>Issue #22 Web Baseline</div>
          <h1 className={styles.heroTitle}>FocusBuddy web stack is ready to grow.</h1>
          <p className={styles.heroDescription}>
            This baseline keeps feature UI out of scope while proving the Next.js app, the shared
            TypeScript and lint baselines, the generated API client, and the Jest plus MSW test path
            can live together in one workspace.
          </p>
          <div className={styles.heroMeta}>
            <span className={styles.heroMetaItem}>Next.js app router</span>
            <span className={styles.heroMetaItem}>Generated contract client</span>
            <span className={styles.heroMetaItem}>Jest + MSW</span>
          </div>
        </section>

        <section className={styles.cardGrid} aria-label="Baseline pillars">
          <article className={styles.card}>
            <h2 className={styles.sectionTitle}>Shared config entry</h2>
            <p className={styles.bodyText}>
              The web workspace now consumes the shared TypeScript, oxlint, and Jest baselines with
              local Next.js-specific wiring only where the framework needs it.
            </p>
          </article>

          <article className={styles.card}>
            <h2 className={styles.sectionTitle}>Typed client seam</h2>
            <p className={styles.bodyText}>
              The generated contract package is wrapped behind one web-local helper so later auth,
              navigation, and safety controls can harden the same entry point instead of many ad hoc
              calls.
            </p>
            <div className={styles.codeChip}>{apiBaseUrl}</div>
          </article>

          <article className={styles.card}>
            <h2 className={styles.sectionTitle}>Mock-first testing</h2>
            <p className={styles.bodyText}>
              MSW is wired into Jest so the first web tests can prove generated-client behavior and
              UI rendering without waiting for a full backend runtime in the loop.
            </p>
          </article>
        </section>

        <section className={styles.summaryCard} aria-labelledby="preview-summary-title">
          <h2 className={styles.sectionTitle} id="preview-summary-title">
            Contract-backed preview summary
          </h2>
          <p className={styles.bodyText}>
            The sample below is typed from the generated contract and mirrors the kind of data the
            web app can render once the real API is connected.
          </p>
          <div className={styles.summaryStats}>
            <div>
              <strong className={styles.statValue}>{previewSummary.publicSessionCount}</strong>
              <span className={styles.statLabel}>public sessions</span>
            </div>
            <div>
              <strong className={styles.statValue}>
                {previewSummary.totalPublicDurationSeconds}
              </strong>
              <span className={styles.statLabel}>duration seconds</span>
            </div>
            <div>
              <strong className={styles.statValue}>{previewSummary.helpfulStampCount}</strong>
              <span className={styles.statLabel}>helpful stamps</span>
            </div>
          </div>
          <ul className={styles.summaryList}>
            <li>{previewSummary.target.title}</li>
            <li>{previewSummary.recentPublicSessions[0]?.publicNote ?? 'No public note yet.'}</li>
            <li>{previewSummary.lastPublicSessionAt ?? 'No public session date yet.'}</li>
          </ul>
        </section>

        {children ? (
          <section className={styles.card} aria-labelledby="logging-demo-title">
            <h2 className={styles.sectionTitle} id="logging-demo-title">
              Real logging integration points
            </h2>
            {children}
          </section>
        ) : undefined}
      </div>
    </main>
  );
}
