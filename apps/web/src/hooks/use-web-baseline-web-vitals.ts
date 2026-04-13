'use client';

import { useReportWebVitals } from 'next/web-vitals';

import { captureWebVital } from '@/lib/performance/web-baseline-capture';

export function useWebBaselineWebVitals() {
  useReportWebVitals((metric) => {
    captureWebVital(metric);
  });
}