/** @jest-config-loader ts-node */
/** @jest-config-loader-options {"transpileOnly": true} */

import { defineJestConfig } from '@focusbuddy/config-jest/define';
import sharedConfig from '@focusbuddy/config-jest/api';

const config = defineJestConfig({
  ...sharedConfig,
  moduleNameMapper: {
    '^#api/(.*)$': '<rootDir>/src/$1',
  },
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
