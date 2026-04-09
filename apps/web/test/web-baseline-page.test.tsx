import type { ComponentProps } from 'react';

import { render, screen } from '@testing-library/react';

import { WebBaselinePage } from '../src/components/web-baseline-page';
import { buildExamplePublicTargetSummary } from '../src/lib/api/example-public-target-summary';

describe('WebBaselinePage', () => {
  it('renders the baseline guidance and contract-backed preview', () => {
    const previewSummary: ComponentProps<typeof WebBaselinePage>['previewSummary'] =
      buildExamplePublicTargetSummary('test-target');

    render(<WebBaselinePage apiBaseUrl="http://localhost:3000" previewSummary={previewSummary} />);

    expect(
      screen.getByRole('heading', { name: /focusbuddy web stack is ready to grow/i }),
    ).toBeInTheDocument();
    expect(screen.getByText('Next.js app router')).toBeInTheDocument();
    expect(screen.getByText('Focus target test-target')).toBeInTheDocument();
  });

  it('renders the optional real logging integration section', () => {
    const previewSummary: ComponentProps<typeof WebBaselinePage>['previewSummary'] =
      buildExamplePublicTargetSummary('test-target');

    render(
      <WebBaselinePage apiBaseUrl="http://localhost:3000" previewSummary={previewSummary}>
        <div>Client and server logging demo</div>
      </WebBaselinePage>,
    );

    expect(
      screen.getByRole('heading', { name: /real logging integration points/i }),
    ).toBeInTheDocument();
    expect(screen.getByText('Client and server logging demo')).toBeInTheDocument();
  });
});
