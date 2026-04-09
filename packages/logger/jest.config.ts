/** @jest-config-loader ts-node */
/** @jest-config-loader-options {"transpileOnly": true} */

import type { Config } from 'jest'

import sharedConfig from '../config-jest/api.ts'

const config: Config = {
  ...sharedConfig,
  rootDir: '../..',
  moduleFileExtensions: [...(sharedConfig.moduleFileExtensions ?? []), 'ts'],
  testMatch: ['<rootDir>/packages/logger/test/**/*.spec.ts'],
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/packages/logger/tsconfig.test.json',
      },
    ],
  },
}

export default config