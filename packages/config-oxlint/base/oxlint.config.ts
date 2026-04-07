import { defineConfig } from 'oxlint';

export default defineConfig({
  categories: {
    correctness: 'error',
    suspicious: 'warn',
  },
  plugins: ['typescript', 'import', 'unicorn', 'oxc'],
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
