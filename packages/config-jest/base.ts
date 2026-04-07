import type { Config } from 'jest';

const config: Config = {
  clearMocks: true,
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/coverage/',
    '/.next/',
    '/generated/',
    '/__generated__/',
  ],
  moduleFileExtensions: ['js', 'cjs', 'mjs', 'ts', 'tsx', 'json'],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/coverage/',
    '/.next/',
    '/generated/',
    '/__generated__/',
  ],
};

export default config;
