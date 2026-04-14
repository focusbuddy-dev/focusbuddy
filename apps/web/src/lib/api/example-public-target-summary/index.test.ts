import { buildExamplePublicTargetSummary } from './index';

describe('buildExamplePublicTargetSummary', () => {
  it('creates runtime preview data for the requested target id', () => {
    const previewSummary = buildExamplePublicTargetSummary('baseline-target');

    expect(previewSummary.target.title).toBe('Focus target baseline-target');
    expect(previewSummary.publicSessionCount).toBe(8);
    expect(previewSummary.recentPublicSessions[0]?.sessionId).toBe('baseline-target-session-1');
  });
});
