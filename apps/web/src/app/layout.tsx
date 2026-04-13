import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { WebVitalsReporter } from '@/components/web-vitals-reporter';
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
        <WebVitalsReporter />
        {children}
      </body>
    </html>
  );
}
