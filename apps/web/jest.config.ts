/** @jest-config-loader ts-node */
/** @jest-config-loader-options {"transpileOnly": true} */

import nextJest from 'next/jest.js';

import { defineJestConfig, withEsmPackageSupport } from '@focusbuddy/config-jest/define';
import sharedConfig from '@focusbuddy/config-jest/web';

const createJestConfig = nextJest({ dir: './apps/web' });

const config = withEsmPackageSupport(
  defineJestConfig({
    ...sharedConfig,
    rootDir: '.',
    moduleDirectories: ['node_modules', '<rootDir>/src', '<rootDir>/test'],
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'cjs', 'mjs', 'json'],
    setupFilesAfterEnv: ['<rootDir>/test/setup-tests.ts'],
    testMatch: ['<rootDir>/test/**/*.test.ts?(x)'],
  }),
  {
    packageNames: ['msw', '@mswjs', '@open-draft/until'],
  },
);

export default createJestConfig(config);
