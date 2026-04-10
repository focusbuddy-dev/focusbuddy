import type { Config } from '@jest/types';

import baseConfig from './base.ts';

const config: Config.InitialOptions = {
  ...baseConfig,
  testEnvironment: 'jsdom',
};

export default config;
