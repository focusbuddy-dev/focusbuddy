import { defineJestConfig, withEsmPackageSupport } from '@focusbuddy/config-jest/define';

describe('withEsmPackageSupport', () => {
  it('replaces the node_modules ignore pattern with one allowlist pattern', () => {
    const config = withEsmPackageSupport(
      defineJestConfig({
        transformIgnorePatterns: ['/node_modules/', '/dist/'],
      }),
      {
        packageNames: ['msw', '@mswjs', '@open-draft/until'],
      },
    );

    expect(config.transformIgnorePatterns).toEqual([
      '/node_modules/(?!(?:msw|@mswjs|@open-draft/until)(?:/|$))/',
      '/dist/',
    ]);
  });

  it('merges ESM extensions without duplicates', () => {
    const config = withEsmPackageSupport(
      defineJestConfig({
        extensionsToTreatAsEsm: ['.ts'],
        transformIgnorePatterns: ['/node_modules/'],
      }),
      {
        extensionsToTreatAsEsm: ['.tsx', '.ts'],
      },
    );

    expect(config.extensionsToTreatAsEsm).toEqual(['.ts', '.tsx']);
    expect(config.transformIgnorePatterns).toEqual(['/node_modules/']);
  });
});
