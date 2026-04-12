import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

import { checkWorkspaceBoundaries } from '../scripts/check-workspace-boundaries.mjs';

async function createWorkspace(tempRoot, relativePath, packageName, extra = {}) {
  const workspaceRoot = resolve(tempRoot, relativePath);
  await mkdir(resolve(workspaceRoot, 'src'), { recursive: true });
  await writeFile(
    resolve(workspaceRoot, 'package.json'),
    JSON.stringify({ name: packageName, private: true, version: '0.0.0', ...extra }, undefined, 2),
    'utf8',
  );
  return workspaceRoot;
}

test('accepts package imports from apps and same-workspace relative imports', async () => {
  const repoRoot = await mkdtemp(resolve(tmpdir(), 'focusbuddy-boundaries-ok-'));

  await createWorkspace(repoRoot, 'apps/web', '@focusbuddy/web', {
    dependencies: {
      '@focusbuddy/logger': 'workspace:*',
    },
  });
  await createWorkspace(repoRoot, 'packages/logger', '@focusbuddy/logger', {
    exports: {
      '.': './dist/index.js',
    },
    main: './dist/index.js',
  });

  await writeFile(
    resolve(repoRoot, 'apps/web/src/index.ts'),
    "import { logger } from '@focusbuddy/logger';\nimport './local.js';\nexport { logger };\n",
    'utf8',
  );
  await writeFile(
    resolve(repoRoot, 'apps/web/src/local.js'),
    'export const local = true;\n',
    'utf8',
  );

  const violations = await checkWorkspaceBoundaries(repoRoot);

  assert.deepEqual(violations, []);
});

test('rejects relative imports that escape the current workspace', async () => {
  const repoRoot = await mkdtemp(resolve(tmpdir(), 'focusbuddy-boundaries-relative-'));

  await createWorkspace(repoRoot, 'apps/web', '@focusbuddy/web');
  await createWorkspace(repoRoot, 'packages/logger', '@focusbuddy/logger', {
    exports: {
      '.': './dist/index.js',
    },
    main: './dist/index.js',
  });

  await writeFile(
    resolve(repoRoot, 'apps/web/src/index.ts'),
    "import '../../../packages/logger/src/index.js';\n",
    'utf8',
  );

  const violations = await checkWorkspaceBoundaries(repoRoot);

  assert.equal(violations.length, 1);
  assert.match(violations[0], /relative import .* escapes @focusbuddy\/web/);
  assert.match(violations[0], /@focusbuddy\/logger/);
});

test('rejects package dependencies on app workspaces', async () => {
  const repoRoot = await mkdtemp(resolve(tmpdir(), 'focusbuddy-boundaries-deps-'));

  await createWorkspace(repoRoot, 'apps/api', '@focusbuddy/api');
  await createWorkspace(repoRoot, 'packages/logger', '@focusbuddy/logger', {
    dependencies: {
      '@focusbuddy/api': 'workspace:*',
    },
  });

  const violations = await checkWorkspaceBoundaries(repoRoot);

  assert.equal(violations.length, 1);
  assert.match(violations[0], /must not depend on app workspace @focusbuddy\/api/);
});

test('rejects undeclared workspace package imports', async () => {
  const repoRoot = await mkdtemp(resolve(tmpdir(), 'focusbuddy-boundaries-undeclared-'));

  await createWorkspace(repoRoot, 'apps/web', '@focusbuddy/web');
  await createWorkspace(repoRoot, 'packages/logger', '@focusbuddy/logger', {
    exports: {
      '.': './dist/index.js',
    },
    main: './dist/index.js',
  });

  await writeFile(
    resolve(repoRoot, 'apps/web/src/index.ts'),
    "import { logger } from '@focusbuddy/logger';\nexport { logger };\n",
    'utf8',
  );

  const violations = await checkWorkspaceBoundaries(repoRoot);

  assert.equal(violations.length, 1);
  assert.match(violations[0], /does not declare @focusbuddy\/logger in package\.json/);
});

test('rejects imports for unexported workspace subpaths', async () => {
  const repoRoot = await mkdtemp(resolve(tmpdir(), 'focusbuddy-boundaries-subpath-'));

  await createWorkspace(repoRoot, 'apps/web', '@focusbuddy/web', {
    dependencies: {
      '@focusbuddy/logger': 'workspace:*',
    },
  });
  await createWorkspace(repoRoot, 'packages/logger', '@focusbuddy/logger', {
    exports: {
      '.': './dist/index.js',
      './server': './dist/server.js',
    },
    main: './dist/index.js',
  });

  await writeFile(
    resolve(repoRoot, 'apps/web/src/index.ts'),
    "import { createBrowserLogger } from '@focusbuddy/logger/browser';\nexport { createBrowserLogger };\n",
    'utf8',
  );

  const violations = await checkWorkspaceBoundaries(repoRoot);

  assert.equal(violations.length, 1);
  assert.match(violations[0], /is not an allowed export of @focusbuddy\/logger/);
  assert.match(violations[0], /@focusbuddy\/logger\/server/);
});

test('treats export subpath regex metacharacters literally except for export wildcards', async () => {
  const repoRoot = await mkdtemp(resolve(tmpdir(), 'focusbuddy-boundaries-subpath-regex-'));

  await createWorkspace(repoRoot, 'apps/web', '@focusbuddy/web', {
    dependencies: {
      '@focusbuddy/logger': 'workspace:*',
    },
  });
  await createWorkspace(repoRoot, 'packages/logger', '@focusbuddy/logger', {
    exports: {
      './feature.v1/*': './dist/feature.v1/*.js',
    },
  });

  await writeFile(
    resolve(repoRoot, 'apps/web/src/index.ts'),
    [
      "import { allowed } from '@focusbuddy/logger/feature.v1/browser';",
      "import { blocked } from '@focusbuddy/logger/featureXv1/browser';",
      'export { allowed, blocked };',
      '',
    ].join('\n'),
    'utf8',
  );

  const violations = await checkWorkspaceBoundaries(repoRoot);

  assert.equal(violations.length, 1);
  assert.match(violations[0], /@focusbuddy\/logger\/featureXv1\/browser/);
  assert.doesNotMatch(violations[0], /@focusbuddy\/logger\/feature\.v1\/browser/);
});

test('rejects undeclared workspace packages in tsconfig extends', async () => {
  const repoRoot = await mkdtemp(resolve(tmpdir(), 'focusbuddy-boundaries-tsconfig-'));

  await createWorkspace(repoRoot, 'apps/api', '@focusbuddy/api');
  await createWorkspace(repoRoot, 'packages/config-typescript', '@focusbuddy/config-typescript', {
    exports: {
      './api': './api.json',
    },
  });

  await writeFile(
    resolve(repoRoot, 'apps/api/tsconfig.json'),
    JSON.stringify({ extends: '@focusbuddy/config-typescript/api' }, undefined, 2),
    'utf8',
  );

  const violations = await checkWorkspaceBoundaries(repoRoot);

  assert.equal(violations.length, 1);
  assert.match(violations[0], /does not declare @focusbuddy\/config-typescript in package\.json/);
});

test('accepts exported workspace subpaths in tsconfig extends', async () => {
  const repoRoot = await mkdtemp(resolve(tmpdir(), 'focusbuddy-boundaries-tsconfig-ok-'));

  await createWorkspace(repoRoot, 'apps/api', '@focusbuddy/api', {
    devDependencies: {
      '@focusbuddy/config-typescript': 'workspace:*',
    },
  });
  await createWorkspace(repoRoot, 'packages/config-typescript', '@focusbuddy/config-typescript', {
    exports: {
      './api': './api.json',
    },
  });

  await writeFile(
    resolve(repoRoot, 'apps/api/tsconfig.json'),
    JSON.stringify({ extends: '@focusbuddy/config-typescript/api' }, undefined, 2),
    'utf8',
  );

  const violations = await checkWorkspaceBoundaries(repoRoot);

  assert.deepEqual(violations, []);
});

test('the repository currently satisfies the workspace boundary rules', async () => {
  const repoRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
  const violations = await checkWorkspaceBoundaries(repoRoot);

  assert.deepEqual(violations, []);
});
