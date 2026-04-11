import { defineConfig } from 'oxlint';
import apiConfig from '@focusbuddy/config-oxlint/api';

export default defineConfig({
  extends: [apiConfig],
});
