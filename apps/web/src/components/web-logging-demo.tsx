'use client';

import { useEffect, useRef, useTransition } from 'react';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import {
  logWebBaselineButtonClicked,
  logWebBaselineNavigationCompleted,
  logWebBaselinePageViewed,
} from '../lib/logging/web-baseline-page-logger';
import { useWebRequestLogging } from '../lib/logging/web-request-logging-context';
import styles from './web-baseline-page.module.css';

type WebLoggingDemoProps = {
  targetId: string;
};

export function WebLoggingDemo({ targetId }: WebLoggingDemoProps) {
  const [isPending, startTransition] = useTransition();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { requestId, sessionId, traceId } = useWebRequestLogging();
  const lastLocationRef = useRef<string | undefined>(undefined);

  const currentView = searchParams.get('view') ?? 'overview';
  const currentQuery = searchParams.toString();
  const currentLocation = currentQuery.length > 0 ? `${pathname}?${currentQuery}` : pathname;

  useEffect(() => {
    const request = {
      requestId,
      requestPath: currentLocation,
      route: 'home',
      targetId,
      traceId,
    };
    const user = {
      sessionId,
    };

    if (lastLocationRef.current === undefined) {
      logWebBaselinePageViewed({
        request,
        user,
        view: currentView,
      });
      lastLocationRef.current = currentLocation;
      return;
    }

    if (lastLocationRef.current !== currentLocation) {
      logWebBaselineNavigationCompleted({
        destination: currentLocation,
        request,
        trigger: 'router.push',
        user,
      });
      lastLocationRef.current = currentLocation;
    }
  }, [currentLocation, currentView, requestId, sessionId, targetId, traceId]);

  const handleClientActionClick = () => {
    logWebBaselineButtonClicked({
      action: 'log-client-action',
      actionTarget: 'client-log-button',
      request: {
        requestId,
        requestPath: currentLocation,
        route: 'home',
        targetId,
        traceId,
      },
      user: {
        sessionId,
      },
    });
  };

  const handleNavigateClick = () => {
    const nextView = currentView === 'details' ? 'overview' : 'details';
    const nextLocation = `/?view=${nextView}`;

    logWebBaselineButtonClicked({
      action: 'navigate-baseline-page',
      actionTarget: nextLocation,
      request: {
        requestId,
        requestPath: currentLocation,
        route: 'home',
        targetId,
        traceId,
      },
      user: {
        sessionId,
      },
    });

    startTransition(() => {
      router.push(nextLocation);
    });
  };

  return (
    <div>
      <p className={styles.bodyText}>
        The logger is wired into a real client component. Initial display logs once, button clicks
        log boundary actions, and query-string navigation logs after the route state changes.
      </p>
      <div className={styles.heroMeta}>
        <span className={styles.heroMetaItem}>Current view: {currentView}</span>
        <span className={styles.heroMetaItem}>Request: {requestId}</span>
        <span className={styles.heroMetaItem}>Session: {sessionId}</span>
        <span className={styles.heroMetaItem}>Trace: {traceId}</span>
      </div>
      <div className={styles.loggingActionRow}>
        <button className={styles.loggingButton} onClick={handleClientActionClick} type="button">
          Log client button action
        </button>
        <button className={styles.loggingButton} onClick={handleNavigateClick} type="button">
          {currentView === 'details' ? 'Return to overview demo' : 'Navigate to details demo'}
        </button>
      </div>
      <p aria-live="polite" className={styles.loggingStatus}>
        {isPending ? 'Navigation log is pending...' : 'Client logging demo is idle.'}
      </p>
    </div>
  );
}
