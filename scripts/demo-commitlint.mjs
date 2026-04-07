import { spawnSync } from 'node:child_process';

const scenarios = [
  {
    label: 'valid header reference',
    message: 'chore: add commitlint demo refs #14\n',
    shouldPass: true,
  },
  {
    label: 'valid footer reference',
    message: 'chore: add commitlint demo\n\nrefs #14\n',
    shouldPass: true,
  },
  {
    label: 'missing issue reference',
    message: 'chore: add commitlint demo\n',
    shouldPass: false,
  },
];

let hasFailure = false;

for (const scenario of scenarios) {
  const result = spawnSync(
    'pnpm',
    ['exec', 'commitlint', '--config', 'commitlint.config.cjs'],
    {
      cwd: process.cwd(),
      encoding: 'utf8',
      input: scenario.message,
    },
  );

  const passed = result.status === 0;
  const marker = passed === scenario.shouldPass ? 'OK' : 'NG';
  console.log(`[${marker}] ${scenario.label}`);

  if (result.stdout.trim()) {
    console.log(result.stdout.trim());
  }

  if (result.stderr.trim()) {
    console.log(result.stderr.trim());
  }

  if (passed !== scenario.shouldPass) {
    hasFailure = true;
  }
}

if (hasFailure) {
  process.exit(1);
}