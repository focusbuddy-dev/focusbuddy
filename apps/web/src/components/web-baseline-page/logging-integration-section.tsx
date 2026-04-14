import type { ReactNode } from 'react';

import styles from './styles.module.css';

type LoggingIntegrationSectionProps = {
  children?: ReactNode;
};

/**
 * Role: Wraps the optional logging demo area when callers provide integration content.
 * Boundary: Presentational only. It does not create logging side effects by itself.
 * Ref: #179
 */
export function LoggingIntegrationSection({ children }: LoggingIntegrationSectionProps) {
  if (!children) {
    return null;
  }

  return (
    <section className={styles.card} aria-labelledby="logging-demo-title">
      <h2 className={styles.sectionTitle} id="logging-demo-title">
        Real logging integration points
      </h2>
      {children}
    </section>
  );
}