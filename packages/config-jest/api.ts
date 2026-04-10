import baseConfig from './base.ts';
import { defineJestConfig } from './define.ts';

const config = defineJestConfig({
  ...baseConfig,
  testEnvironment: 'node',
});

export default config;
