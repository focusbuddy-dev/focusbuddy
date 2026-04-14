import type { ReactNode } from 'react';

import type { components as ApiComponents } from '@focusbuddy/api-contract/generated/types';

/**
 * Role: Defines the public prop and contract-backed summary types for the baseline page module.
 * Boundary: Type-only surface for the baseline page. No runtime behavior belongs here.
 * Ref: #179
 */
export type PublicTargetSummary = ApiComponents['schemas']['PublicTargetSummary'];

export type WebBaselinePageProps = {
  apiBaseUrl: string;
  children?: ReactNode;
  previewSummary: PublicTargetSummary;
};
