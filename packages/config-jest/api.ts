import type { Config } from 'jest';

import baseConfig from './base.ts';

const config: Config = {
  ...baseConfig,
  testEnvironment: 'node',
};

export default config;
