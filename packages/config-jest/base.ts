import { defineJestConfig } from './define.ts';

const config = defineJestConfig({
  clearMocks: true,
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/coverage/',
    '/.next/',
    '/generated/',
    '/__generated__/',
  ],
  moduleFileExtensions: ['js', 'cjs', 'mjs', 'json'],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/coverage/',
    '/.next/',
    '/generated/',
    '/__generated__/',
  ],
});

export default config;
