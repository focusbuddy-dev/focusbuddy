import { captureRouterTransitionStart } from './src/lib/performance/web-baseline-capture';

export function onRouterTransitionStart(
  url: string,
  navigationType: 'push' | 'replace' | 'traverse',
) {
  captureRouterTransitionStart({
    navigationType,
    url,
  });
}