/** @jest-config-loader ts-node */
/** @jest-config-loader-options {"transpileOnly": true} */

import { defineJestConfig } from '../../packages/config-jest/define.ts';
import sharedConfig from '../../packages/config-jest/api.ts';

const config = defineJestConfig({
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
});

export default config;
