/** @jest-config-loader ts-node */
/** @jest-config-loader-options {"transpileOnly": true} */

import type { Config } from 'jest';

import sharedConfig from '../../packages/config-jest/api.ts';

const config: Config = {
  ...sharedConfig,
  moduleFileExtensions: [...(sharedConfig.moduleFileExtensions ?? []), 'ts'],
  roots: ['<rootDir>/src', '<rootDir>/test'],
  testMatch: ['<rootDir>/test/**/*.spec.ts'],
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.json',
      },
    ],
  },
};

export default config;
