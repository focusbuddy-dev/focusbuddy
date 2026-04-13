'use client';

import { useReportWebVitals } from 'next/web-vitals';

import { captureWebVital } from '@/lib/performance/web-baseline-capture';

const reportWebVital: Parameters<typeof useReportWebVitals>[0] = (metric) => {
  captureWebVital(metric);
};

export function WebVitalsReporter() {
  useReportWebVitals(reportWebVital);

  return <></>;
}