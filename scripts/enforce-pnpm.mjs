import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export function enforcePnpmOnly(userAgent = process.env.npm_config_user_agent ?? '') {
  const packageManager = userAgent.split(' ')[0]?.split('/')[0] ?? '';

  if (packageManager === 'pnpm') {
    return {
      exitCode: 0,
      errors: [],
    };
  }

  return {
    exitCode: 1,
    errors: [
      'This repository supports pnpm only.',
      'Use just commitlint-setup for the initial setup flow.',
      'If you need to install dependencies directly, use pnpm install --frozen-lockfile.',
    ],
  };
}

const executedScriptPath = typeof process.argv[1] === 'string' ? resolve(process.argv[1]) : null;
const isDirectExecution =
  executedScriptPath !== null && import.meta.url === pathToFileURL(executedScriptPath).href;

if (isDirectExecution) {
  const result = enforcePnpmOnly();

  for (const error of result.errors) {
    console.error(error);
  }

  process.exit(result.exitCode);
}
