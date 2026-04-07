/** @jest-config-loader ts-node */
/** @jest-config-loader-options {"transpileOnly": true} */

import type { Config } from 'jest';

import sharedConfig from '../../packages/config-jest/web.ts';

const config: Config = sharedConfig;

export default config;
