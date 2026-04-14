'use client';

import { useReportWebVitals } from 'next/web-vitals';

import { captureWebVital } from '@/lib/performance/web-baseline-capture';

export function WebBaselineCaptureBootstrap() {
  // RootLayout is a server component, so the browser-side listener needs a tiny client boundary.
  useReportWebVitals((metric) => {
    captureWebVital(metric);
  });

  return <></>;
}