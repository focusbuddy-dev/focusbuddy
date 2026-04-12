'use client';

import { createContext, useContext, useRef, type ReactNode } from 'react';

import type { WebRequestCorrelation } from './web-request-correlation';

type WebRequestLoggingContextValue = WebRequestCorrelation & {
  sessionId: string;
};

const WebRequestLoggingContext = createContext<WebRequestLoggingContextValue | undefined>(
  undefined,
);

function createClientSessionId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return 'web-client-session';
}

type WebRequestLoggingProviderProps = WebRequestCorrelation & {
  children: ReactNode;
};

export function WebRequestLoggingProvider({
  children,
  requestId,
  traceId,
}: WebRequestLoggingProviderProps) {
  const sessionIdRef = useRef<string | undefined>(undefined);

  if (sessionIdRef.current === undefined) {
    sessionIdRef.current = createClientSessionId();
  }

  return (
    <WebRequestLoggingContext.Provider
      value={{
        requestId,
        sessionId: sessionIdRef.current,
        traceId,
      }}
    >
      {children}
    </WebRequestLoggingContext.Provider>
  );
}

export function useWebRequestLogging(): WebRequestLoggingContextValue {
  const context = useContext(WebRequestLoggingContext);

  if (context === undefined) {
    throw new Error('useWebRequestLogging must be used within WebRequestLoggingProvider');
  }

  return context;
}
