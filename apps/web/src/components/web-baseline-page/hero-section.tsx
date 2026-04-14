import styles from './styles.module.css';
import { baselineCards, baselineHeroTags } from './constants';

type HeroSectionProps = {
  apiBaseUrl: string;
};

/**
 * Role: Renders the hero and baseline pillar cards for the web baseline page.
 * Boundary: Presentational only. It shows already-prepared copy and labels without owning data loading.
 * Ref: #179
 */
export function HeroSection({ apiBaseUrl }: HeroSectionProps) {
  return (
    <>
      <section className={styles.hero}>
        <div className={styles.heroLabel}>Issue #22 Web Baseline</div>
        <h1 className={styles.heroTitle}>FocusBuddy web stack is ready to grow.</h1>
        <p className={styles.heroDescription}>
          This baseline keeps feature UI out of scope while proving the Next.js app, the shared
          TypeScript and lint baselines, the generated API client, and the Jest plus MSW test path
          can live together in one workspace.
        </p>
        <div className={styles.heroMeta}>
          {baselineHeroTags.map((tag) => (
            <span className={styles.heroMetaItem} key={tag}>
              {tag}
            </span>
          ))}
        </div>
      </section>

      <section className={styles.cardGrid} aria-label="Baseline pillars">
        {baselineCards.map((card) => (
          <article className={styles.card} key={card.title}>
            <h2 className={styles.sectionTitle}>{card.title}</h2>
            <p className={styles.bodyText}>{card.body}</p>
            {card.title === 'Typed client seam' ? (
              <div className={styles.codeChip}>{apiBaseUrl}</div>
            ) : undefined}
          </article>
        ))}
      </section>
    </>
  );
}