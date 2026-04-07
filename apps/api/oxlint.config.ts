import { defineConfig } from 'oxlint';
import apiConfig from '../../packages/config-oxlint/api/oxlint.config.ts';

export default defineConfig({
  extends: [apiConfig],
});
