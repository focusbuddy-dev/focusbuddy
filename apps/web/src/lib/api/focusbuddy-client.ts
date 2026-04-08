import { createApiClient } from '@focusbuddy/api-contract/generated/client';

const LOCAL_API_BASE_URL = 'http://localhost:3000';
const API_BASE_URL_ENV_NAME = 'NEXT_PUBLIC_FOCUSBUDDY_API_BASE_URL';

function resolveFocusBuddyApiBaseUrl(): string | undefined {
  const configuredBaseUrl = process.env.NEXT_PUBLIC_FOCUSBUDDY_API_BASE_URL;

  if (configuredBaseUrl) {
    return configuredBaseUrl;
  }

  if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
    return LOCAL_API_BASE_URL;
  }

  return undefined;
}

export function getFocusBuddyApiBaseUrl(): string {
  const baseUrl = resolveFocusBuddyApiBaseUrl();

  if (baseUrl) {
    return baseUrl;
  }

  throw new Error(
    `${API_BASE_URL_ENV_NAME} must be set outside development and test when creating the FocusBuddy API client.`,
  );
}

export function getFocusBuddyApiBaseUrlLabel(): string {
  return resolveFocusBuddyApiBaseUrl() ?? 'same-origin';
}

export function createFocusBuddyApiClient(baseUrl = getFocusBuddyApiBaseUrl()) {
  return createApiClient(baseUrl);
}

export async function fetchPublicTargetSummary(targetId: string, baseUrl?: string) {
  return createFocusBuddyApiClient(baseUrl).getPublicTargetSummary({
    params: { targetId },
  });
}
