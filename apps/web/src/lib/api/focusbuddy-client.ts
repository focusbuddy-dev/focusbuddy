import { createApiClient } from '@focusbuddy/api-contract/generated/client';

const DEFAULT_API_BASE_URL = 'http://localhost:3000';

export function getFocusBuddyApiBaseUrl(): string {
  return process.env.NEXT_PUBLIC_FOCUSBUDDY_API_BASE_URL ?? DEFAULT_API_BASE_URL;
}

export function createFocusBuddyApiClient(baseUrl = getFocusBuddyApiBaseUrl()) {
  return createApiClient(baseUrl);
}

export async function fetchPublicTargetSummary(targetId: string, baseUrl?: string) {
  return createFocusBuddyApiClient(baseUrl).getPublicTargetSummary({
    params: { targetId },
  });
}
