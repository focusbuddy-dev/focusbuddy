export default {
  extends: ['stylelint-config-standard'],
  ignoreFiles: ['**/.next/**', '**/coverage/**', '**/node_modules/**'],
  rules: {
    // oxlint-disable-next-line unicorn/no-null -- stylelint uses null to disable inherited rules.
    'selector-class-pattern': null,
  },
};