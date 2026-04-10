import type { Config } from '@jest/types';

export type JestConfig = Config.InitialOptions;

export const defineJestConfig = <T extends JestConfig>(config: T): T => config;
