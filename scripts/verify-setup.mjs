import { accessSync, constants, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const failures = [];

const commitlintConfigPath = resolve(process.cwd(), 'commitlint.config.ts');
const commitMsgHookPath = resolve(process.cwd(), '.husky/commit-msg');
const huskyRuntimePath = resolve(process.cwd(), '.husky/_');

if (!existsSync(commitlintConfigPath)) {
  failures.push('commitlint.config.ts is missing');
}

if (!existsSync(commitMsgHookPath)) {
  failures.push('.husky/commit-msg is missing');
} else {
  try {
    accessSync(commitMsgHookPath, constants.X_OK);
  } catch {
    failures.push('.husky/commit-msg is not executable');
  }
}

if (!existsSync(huskyRuntimePath)) {
  failures.push('.husky/_ is missing. Run pnpm install again.');
}

const hooksPath = spawnSync('git', ['config', '--get', 'core.hooksPath'], {
  cwd: process.cwd(),
  encoding: 'utf8',
});

if (hooksPath.status !== 0 || hooksPath.stdout.trim() !== '.husky/_') {
  failures.push('git core.hooksPath is not set to .husky/_. Run pnpm install again.');
}

const validSmokeTest = spawnSync(
  'pnpm',
  ['exec', 'commitlint', '--config', 'commitlint.config.ts'],
  {
    cwd: process.cwd(),
    encoding: 'utf8',
    input: 'chore: verify commitlint setup refs #14\n',
  },
);

if (validSmokeTest.status !== 0) {
  failures.push('commitlint valid smoke test failed');
}

const invalidSmokeTest = spawnSync(
  'pnpm',
  ['exec', 'commitlint', '--config', 'commitlint.config.ts'],
  {
    cwd: process.cwd(),
    encoding: 'utf8',
    input: 'chore: verify commitlint setup\n',
  },
);

if (invalidSmokeTest.status === 0) {
  failures.push('commitlint invalid smoke test unexpectedly passed');
}

if (failures.length > 0) {
  console.error('Setup verification failed:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log('Setup verification passed. commitlint and the commit-msg hook are ready.');
