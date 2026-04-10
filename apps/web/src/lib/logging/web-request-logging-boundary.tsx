import type { ReactNode } from 'react'

import { headers } from 'next/headers'

import { resolveWebRequestCorrelation } from './web-request-correlation'
import { WebRequestLoggingProvider } from './web-request-logging-context'

type WebRequestLoggingBoundaryProps = {
  children: ReactNode
}

export async function WebRequestLoggingBoundary({ children }: WebRequestLoggingBoundaryProps) {
  const requestHeaders = await headers()
  const correlation = resolveWebRequestCorrelation(requestHeaders)

  return (
    <WebRequestLoggingProvider
      requestId={correlation.requestId}
      traceId={correlation.traceId}
    >
      {children}
    </WebRequestLoggingProvider>
  )
}
