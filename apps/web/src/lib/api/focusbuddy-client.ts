import { createApiClient } from '@focusbuddy/api-contract/generated/client';

const LOCAL_API_BASE_URL = 'http://localhost:3000';

export function getFocusBuddyApiBaseUrl(): string {
  const configuredBaseUrl = process.env.NEXT_PUBLIC_FOCUSBUDDY_API_BASE_URL;

  if (configuredBaseUrl) {
    return configuredBaseUrl;
  }

  if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
    return LOCAL_API_BASE_URL;
  }

  return '';
}

export function createFocusBuddyApiClient(baseUrl = getFocusBuddyApiBaseUrl()) {
  return createApiClient(baseUrl);
}

export async function fetchPublicTargetSummary(targetId: string, baseUrl?: string) {
  return createFocusBuddyApiClient(baseUrl).getPublicTargetSummary({
    params: { targetId },
  });
}
