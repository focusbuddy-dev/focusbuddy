import { pathToFileURL } from 'node:url';

import { formatError, runMeasureWebBaseline } from './runtime';

export {
  getRequiredScenarios,
  parseBaselineConfig,
  parseRunCount,
  readBaselineConfig,
} from './config';
export {
  buildNavigationMetricSummary,
  createInitialLoadSnapshot,
  createNavigationSnapshot,
} from './summary';
export {
  assertBaseUrlReady,
  formatError,
  resolveChromiumExecutablePath,
  runMeasureWebBaseline,
} from './runtime';
export type * from './types';

function isExecutedDirectly(metaUrl: string) {
  const entryPoint = process.argv[1];

  return typeof entryPoint === 'string' && pathToFileURL(entryPoint).href === metaUrl;
}

if (isExecutedDirectly(import.meta.url)) {
  void runMeasureWebBaseline().catch((error: unknown) => {
    console.error(formatError(error));
    process.exit(1);
  });
}