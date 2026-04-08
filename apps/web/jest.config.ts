/** @jest-config-loader ts-node */
/** @jest-config-loader-options {"transpileOnly": true} */

import type { Config } from 'jest';
import nextJest from 'next/jest.js';

import sharedConfig from '../../packages/config-jest/web.ts';

const createJestConfig = nextJest({ dir: './apps/web' });

const config: Config = {
  ...sharedConfig,
  moduleDirectories: ['node_modules', '<rootDir>/src', '<rootDir>/test'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'cjs', 'mjs', 'json'],
  rootDir: '../../',
  setupFilesAfterEnv: ['<rootDir>/apps/web/test/setup-tests.ts'],
  testMatch: ['<rootDir>/apps/web/test/**/*.test.ts?(x)'],
  transformIgnorePatterns: ['/node_modules/(?!(msw|@mswjs|until-async)/)'],
};

export default createJestConfig(config);
