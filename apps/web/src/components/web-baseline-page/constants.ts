/**
 * Role: Defines static copy and card metadata for the baseline landing page module.
 * Boundary: Presentational constants only. Runtime fetching and logging stay outside this file.
 * Ref: #179
 */
export const baselineHeroTags = [
  'Next.js app router',
  'Generated contract client',
  'Jest + MSW',
] as const;

export const baselineCards = [
  {
    body:
      'The web workspace now consumes the shared TypeScript, oxlint, and Jest baselines with local Next.js-specific wiring only where the framework needs it.',
    title: 'Shared config entry',
  },
  {
    body:
      'The generated contract package is wrapped behind one web-local helper so later auth, navigation, and safety controls can harden the same entry point instead of many ad hoc calls.',
    title: 'Typed client seam',
  },
  {
    body:
      'MSW is wired into Jest so the first web tests can prove generated-client behavior and UI rendering without waiting for a full backend runtime in the loop.',
    title: 'Mock-first testing',
  },
] as const;

export const baselineFallbackCopy = {
  emptyNote: 'No public note yet.',
  emptySessionDate: 'No public session date yet.',
} as const;
