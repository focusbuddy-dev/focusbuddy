import type { CapturedRouterTransition, CapturedWebVital } from '../../src/lib/performance/web-baseline-capture';

export const initialLoadScenarioId = 'web.home.initial-load';
export const navigationScenarioId = 'web.home.details-navigation';

export type Rating = 'good' | 'needs-improvement' | 'poor';
export type InitialLoadMetricName = 'CLS' | 'FCP' | 'TTFB';
export type InteractionMetricName = 'INP' | 'FID';
export type NavigationMetricName = InteractionMetricName | 'ROUTE_CHANGE_DURATION';

export type LighthouseAuditResult = {
  displayValue?: string;
  numericUnit?: string;
  numericValue?: number;
  score?: number;
};

export type LighthouseRun = {
  audits: Record<string, LighthouseAuditResult>;
  finalDisplayedUrl: string;
  performanceScore?: number;
};

export type BaselineWebVital = {
  capturedAt?: string;
  delta: number;
  id: string;
  name: string;
  navigationType?: string;
  path: string;
  rating?: string;
  value: number;
};

export type ScriptResource = {
  decodedBodySize: number;
  name: string;
  transferSize: number;
};

export type InitialLoadWebVital = BaselineWebVital & {
  name: InitialLoadMetricName;
  rating: Rating;
};

export type InteractionWebVital = CapturedWebVital & {
  name: InteractionMetricName;
};

export type InitialLoadRun = {
  firstLoadJsBytes: number;
  scriptResources: ScriptResource[];
  webVitals: InitialLoadWebVital[];
};

export type NavigationRun = {
  routeChangeDurationMs: number;
  transitions: CapturedRouterTransition[];
  webVitals: InteractionWebVital[];
};

export type InitialLoadScenario = {
  id: typeof initialLoadScenarioId;
  path: string;
};

export type NavigationScenario = {
  id: typeof navigationScenarioId;
  path: string;
  targetSearch: string;
  triggerButtonText: string;
};

export type BaselineScenario = InitialLoadScenario | NavigationScenario;

export type BaselineConfig = {
  baseUrl: string;
  browser: string;
  defaultRunCount: number;
  lighthouse: {
    formFactor: string;
    onlyAudits: string[];
  };
  runMode: string;
  scenarios: BaselineScenario[];
  schemaVersion: number;
};

export type InitialLoadSnapshot = {
  app: 'web';
  capturedAt: string;
  environment: {
    baseUrl: string;
    browser: string;
    formFactor: string;
    runtime: 'parity';
  };
  measurements: {
    lighthouseRuns: LighthouseRun[];
    runs: InitialLoadRun[];
  };
  runMode: string;
  sampleSize: number;
  scenarioId: typeof initialLoadScenarioId;
  schemaVersion: number;
  summary: {
    bundle: {
      firstLoadJsBytes: number | undefined;
      resourceCount: number | undefined;
    };
    lighthouse: Record<string, unknown>;
    webVitals: Record<string, unknown>;
  };
};

export type NavigationSnapshot = {
  app: 'web';
  capturedAt: string;
  environment: {
    baseUrl: string;
    browser: string;
    runtime: 'parity';
    targetSearch: string;
  };
  measurements: {
    runs: NavigationRun[];
  };
  runMode: string;
  sampleSize: number;
  scenarioId: typeof navigationScenarioId;
  schemaVersion: number;
  summary: {
    interactionMetricName: NavigationMetricName;
    routerTransitions: {
      medianCount: number | undefined;
      targetUrl: string;
    };
    webVitals: Record<string, unknown>;
  };
};

export type BrowserWindowState = Window & {
  __FOCUSBUDDY_ROUTER_TRANSITIONS__?: CapturedRouterTransition[];
  __FOCUSBUDDY_WEB_VITALS__?: InteractionWebVital[];
};

export type LayoutShiftEntry = PerformanceEntry & {
  hadRecentInput?: boolean;
  value: number;
};