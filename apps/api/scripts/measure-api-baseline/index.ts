import { pathToFileURL } from 'node:url';

import { formatError, runMeasureApiBaseline } from './runtime';

export {
  getRequiredScenario,
  parseBaselineConfig,
  parseRequestCount,
  parseRunCount,
  readBaselineConfig,
} from './config';
export { createHealthSnapshot } from './summary';
export { assertScenarioReady, formatError, runMeasureApiBaseline } from './runtime';
export type * from './types';

function isExecutedDirectly(metaUrl: string) {
  const entryPoint = process.argv[1];

  return typeof entryPoint === 'string' && pathToFileURL(entryPoint).href === metaUrl;
}

if (isExecutedDirectly(import.meta.url)) {
  void runMeasureApiBaseline().catch((error: unknown) => {
    console.error(formatError(error));
    process.exit(1);
  });
}