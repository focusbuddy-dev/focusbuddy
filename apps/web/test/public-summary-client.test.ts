import { fetchPublicTargetSummary } from '../src/lib/api/focusbuddy-client';

describe('fetchPublicTargetSummary', () => {
  it('loads a summary through the generated API client', async () => {
    const summary = await fetchPublicTargetSummary('target-42');

    expect(summary.target.title).toBe('Focus target target-42');
    expect(summary.helpfulStampCount).toBe(5);
    expect(summary.recentPublicSessions[0]?.sessionId).toBe('target-42-session-1');
  });
});
