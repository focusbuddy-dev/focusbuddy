import { defineConfig } from 'oxlint';
import webConfig from '../../packages/config-oxlint/web/oxlint.config.ts';

export default defineConfig({
  extends: [webConfig],
  overrides: [
    {
      files: ['src/app/layout.tsx', 'test/setup-tests.ts'],
      rules: {
        'import/no-unassigned-import': 'off',
      },
    },
  ],
});
