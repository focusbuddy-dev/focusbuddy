import { defineConfig } from 'oxlint';
import baseConfig from '../base/oxlint.config.ts';

export default defineConfig({
  extends: [baseConfig],
  env: {
    browser: true,
    es2024: true,
  },
});
