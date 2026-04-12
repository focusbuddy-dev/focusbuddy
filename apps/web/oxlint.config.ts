import { defineConfig } from 'oxlint';
import webConfig from '@focusbuddy/config-oxlint/web';

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
