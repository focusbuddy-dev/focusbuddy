import type { components as ApiComponents } from '@focusbuddy/api-contract/generated/types';

type PublicTargetSummary = ApiComponents['schemas']['PublicTargetSummary'];

export function buildExamplePublicTargetSummary(targetId: string): PublicTargetSummary {
  return {
    target: {
      title: `Focus target ${targetId}`,
      sourceType: 'URL',
      sourceUrl: 'https://focusbuddy.dev/demo-target',
      genre: 'deep-work',
    },
    publicSessionCount: 8,
    totalPublicDurationSeconds: 9600,
    lastPublicSessionAt: '2026-04-08T08:00:00.000Z',
    helpfulStampCount: 5,
    recentPublicSessions: [
      {
        sessionId: `${targetId}-session-1`,
        startedAt: '2026-04-07T21:00:00.000Z',
        durationSeconds: 1500,
        completedByUser: true,
        publicNote: 'Stable contract-first preview from the web baseline.',
      },
    ],
  };
}
