/** @jest-config-loader ts-node */
/** @jest-config-loader-options {"transpileOnly": true} */

import nextJest from 'next/jest.js';

import { defineJestConfig, withEsmPackageSupport } from '../../packages/config-jest/define.ts';
import sharedConfig from '../../packages/config-jest/web.ts';

const createJestConfig = nextJest({ dir: './apps/web' });

const config = withEsmPackageSupport(
  defineJestConfig({
    ...sharedConfig,
    extensionsToTreatAsEsm: ['.ts', '.tsx'],
    rootDir: '.',
    moduleDirectories: ['node_modules', '<rootDir>/src', '<rootDir>/test'],
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'cjs', 'mjs', 'json'],
    setupFilesAfterEnv: ['<rootDir>/test/setup-tests.ts'],
    testMatch: ['<rootDir>/test/**/*.test.ts?(x)'],
  }),
  {
    packageNames: [
      '@focusbuddy/api-contract',
      '@focusbuddy/logger',
      'msw',
      '@mswjs',
      '@open-draft/until',
    ],
  },
);

export default createJestConfig(config);
