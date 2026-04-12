/** @jest-config-loader ts-node */
/** @jest-config-loader-options {"transpileOnly": true} */

import { defineJestConfig, withEsmPackageSupport } from '../../packages/config-jest/define.ts';
import sharedConfig from '../../packages/config-jest/api.ts';

const config = withEsmPackageSupport(
  defineJestConfig({
    ...sharedConfig,
    moduleFileExtensions: [...(sharedConfig.moduleFileExtensions ?? []), 'ts'],
    moduleNameMapper: {
      '^(\\.{1,2}/.*)\\.js$': '$1',
    },
    roots: ['<rootDir>/src', '<rootDir>/test'],
    testMatch: ['<rootDir>/test/**/*.spec.ts'],
    transform: {
      '^.+\\.ts$': [
        'ts-jest',
        {
          tsconfig: '<rootDir>/tsconfig.json',
          useESM: true,
        },
      ],
    },
  }),
  {
    extensionsToTreatAsEsm: ['.ts'],
  },
);

export default config;
