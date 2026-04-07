import { defineConfig } from 'oxlint';
import repositoryConfig from './packages/config-oxlint/repository/oxlint.config.ts';

export default defineConfig({
  extends: [repositoryConfig],
});
