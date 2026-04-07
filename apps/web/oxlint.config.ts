import { defineConfig } from 'oxlint';
import webConfig from '../../packages/config-oxlint/web/oxlint.config.ts';

export default defineConfig({
  extends: [webConfig],
});
