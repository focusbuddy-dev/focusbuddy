import { createApiClient } from '@focusbuddy/api-contract/generated/client';

import {
  getClientApiBaseUrlLabel,
  getRequiredClientApiBaseUrl,
} from '@/env/client';

/**
 * Role: Returns the configured public API base URL required by the generated web client seam.
 * Boundary: Delegates env access to the client env module instead of reading process.env directly.
 * Ref: #179
 */
export function getFocusBuddyApiBaseUrl(): string {
  return getRequiredClientApiBaseUrl();
}

/**
 * Role: Returns the display label for the current public API origin used by the baseline page.
 * Boundary: Public runtime display helper only.
 * Ref: #179
 */
export function getFocusBuddyApiBaseUrlLabel(): string {
  return getClientApiBaseUrlLabel();
}

/**
 * Role: Creates the generated FocusBuddy API client for browser-safe public summary calls.
 * Boundary: Client seam only. Auth and request policy hardening stay outside this helper.
 * Ref: #179
 */
export function createFocusBuddyApiClient(baseUrl = getFocusBuddyApiBaseUrl()) {
  return createApiClient(baseUrl);
}

/**
 * Role: Loads one public target summary through the generated contract client.
 * Boundary: Thin request helper only. Does not own caching, retries, or UI recovery decisions.
 * Ref: #179
 */
export async function fetchPublicTargetSummary(targetId: string, baseUrl?: string) {
  return createFocusBuddyApiClient(baseUrl).getPublicTargetSummary({
    params: { targetId },
  });
}
