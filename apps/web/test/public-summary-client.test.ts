import { fetchPublicTargetSummary, getFocusBuddyApiBaseUrl } from '@/lib/api/focusbuddy-client';

describe('fetchPublicTargetSummary', () => {
  it('loads a summary through the generated API client', async () => {
    const summary = await fetchPublicTargetSummary('target-42', 'http://localhost:3000');

    expect(summary.target.title).toBe('Focus target target-42');
    expect(summary.helpfulStampCount).toBe(5);
    expect(summary.recentPublicSessions[0]?.sessionId).toBe('target-42-session-1');
  });

  it('fails fast outside development and test when the API base URL is unset', () => {
    const env = process.env as Record<string, string | undefined>;
    const previousNodeEnv = env.NODE_ENV;
    const previousApiBaseUrl = env.NEXT_PUBLIC_FOCUSBUDDY_API_BASE_URL;

    env.NODE_ENV = 'production';
    delete env.NEXT_PUBLIC_FOCUSBUDDY_API_BASE_URL;

    try {
      expect(() => getFocusBuddyApiBaseUrl()).toThrow(
        'NEXT_PUBLIC_FOCUSBUDDY_API_BASE_URL must be set outside development and test when creating the FocusBuddy API client.',
      );
    } finally {
      env.NODE_ENV = previousNodeEnv;

      if (previousApiBaseUrl) {
        env.NEXT_PUBLIC_FOCUSBUDDY_API_BASE_URL = previousApiBaseUrl;
      } else {
        delete env.NEXT_PUBLIC_FOCUSBUDDY_API_BASE_URL;
      }
    }
  });
});
