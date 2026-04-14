import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { WebBaselineCaptureBootstrap } from '@/app/web-baseline-capture-bootstrap';
import { isWebBaselineCaptureEnabled } from '@/lib/performance/web-baseline-capture-config';
import './globals.css';

export const metadata: Metadata = {
  title: 'FocusBuddy Web',
  description: 'Next.js baseline for the FocusBuddy web app.',
};

type RootLayoutProps = {
  children: ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body>
        {/* Guard 1: skip mounting the client listener unless the baseline lane explicitly opts in. */}
        {isWebBaselineCaptureEnabled() ? <WebBaselineCaptureBootstrap /> : undefined}
        {children}
      </body>
    </html>
  );
}
