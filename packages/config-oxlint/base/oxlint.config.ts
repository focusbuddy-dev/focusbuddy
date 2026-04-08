import { defineConfig } from 'oxlint';

export default defineConfig({
  categories: {
    correctness: 'error',
    suspicious: 'warn',
  },
  plugins: ['typescript', 'import', 'unicorn', 'oxc'],
  rules: {
    eqeqeq: 'error',
    'no-eq-null': 'error',
    'typescript/no-confusing-non-null-assertion': 'error',
    'typescript/no-explicit-any': 'error',
    'typescript/no-extra-non-null-assertion': 'error',
    'typescript/no-non-null-assertion': 'error',
    'unicorn/no-null': 'error',
  },
  ignorePatterns: [
    'node_modules/**',
    'dist/**',
    'coverage/**',
    '.next/**',
    '.turbo/**',
    '.worktrees/**',
    'packages/api-contract/generated/**',
    '**/generated/**',
    '**/__generated__/**',
  ],
});
