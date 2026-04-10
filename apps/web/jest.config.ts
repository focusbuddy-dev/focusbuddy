/** @jest-config-loader ts-node */
/** @jest-config-loader-options {"transpileOnly": true} */

import type { Config } from '@jest/types';
import nextJest from 'next/jest.js';

import sharedConfig from '../../packages/config-jest/web.ts';

const createJestConfig = nextJest({ dir: './apps/web' });

const config: Config.InitialOptions = {
  ...sharedConfig,
  rootDir: '.',
  moduleDirectories: ['node_modules', '<rootDir>/src', '<rootDir>/test'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'cjs', 'mjs', 'json'],
  setupFilesAfterEnv: ['<rootDir>/test/setup-tests.ts'],
  testMatch: ['<rootDir>/test/**/*.test.ts?(x)'],
  transformIgnorePatterns: ['/node_modules/(?!(msw|@mswjs|@open-draft/until)/)'],
};

export default createJestConfig(config);
