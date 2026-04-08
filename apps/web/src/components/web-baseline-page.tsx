import type { components as ApiComponents } from '@focusbuddy/api-contract/generated/types';

type PublicTargetSummary = ApiComponents['schemas']['PublicTargetSummary'];

type WebBaselinePageProps = {
  apiBaseUrl: string;
  previewSummary: PublicTargetSummary;
};

export function WebBaselinePage({ apiBaseUrl, previewSummary }: WebBaselinePageProps) {
  return (
    <main className="page-shell">
      <div className="page-grid">
        <section className="hero">
          <div className="hero-label">Issue #22 Web Baseline</div>
          <h1>FocusBuddy web stack is ready to grow.</h1>
          <p>
            This baseline keeps feature UI out of scope while proving the Next.js app, the shared
            TypeScript and lint baselines, the generated API client, and the Jest plus MSW test path
            can live together in one workspace.
          </p>
          <div className="hero-meta">
            <span>Next.js app router</span>
            <span>Generated contract client</span>
            <span>Jest + MSW</span>
          </div>
        </section>

        <section className="card-grid" aria-label="Baseline pillars">
          <article className="card">
            <h2>Shared config entry</h2>
            <p>
              The web workspace now consumes the shared TypeScript, oxlint, and Jest baselines with
              local Next.js-specific wiring only where the framework needs it.
            </p>
          </article>

          <article className="card">
            <h2>Typed client seam</h2>
            <p>
              The generated contract package is wrapped behind one web-local helper so later auth,
              navigation, and safety controls can harden the same entry point instead of many ad hoc
              calls.
            </p>
            <div className="code-chip">{apiBaseUrl || 'same-origin'}</div>
          </article>

          <article className="card">
            <h2>Mock-first testing</h2>
            <p>
              MSW is wired into Jest so the first web tests can prove generated-client behavior and
              UI rendering without waiting for a full backend runtime in the loop.
            </p>
          </article>
        </section>

        <section className="summary-card" aria-labelledby="preview-summary-title">
          <h2 id="preview-summary-title">Contract-backed preview summary</h2>
          <p>
            The sample below is typed from the generated contract and mirrors the kind of data the
            web app can render once the real API is connected.
          </p>
          <div className="summary-stats">
            <div>
              <strong>{previewSummary.publicSessionCount}</strong>
              <span>public sessions</span>
            </div>
            <div>
              <strong>{previewSummary.totalPublicDurationSeconds}</strong>
              <span>duration seconds</span>
            </div>
            <div>
              <strong>{previewSummary.helpfulStampCount}</strong>
              <span>helpful stamps</span>
            </div>
          </div>
          <ul>
            <li>{previewSummary.target.title}</li>
            <li>{previewSummary.recentPublicSessions[0]?.publicNote ?? 'No public note yet.'}</li>
            <li>{previewSummary.lastPublicSessionAt ?? 'No public session date yet.'}</li>
          </ul>
        </section>
      </div>
    </main>
  );
}
