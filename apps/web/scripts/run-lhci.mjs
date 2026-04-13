// Keep this wrapper zero-build for now; if the LHCI flow grows further, move it to TypeScript.
import { spawn } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from 'playwright';

const __dirname = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(__dirname, '..');
const configPath = resolve(appRoot, '.lighthouserc.json');
const chromePath = chromium.executablePath();
const baseUrl = new URL(
  '/',
  process.env.FOCUSBUDDY_WEB_BASELINE_BASE_URL ?? 'http://127.0.0.1:3000',
).toString();

await assertBaseUrlReady(baseUrl);

const child = spawn(
  process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm',
  [
    'exec',
    'lhci',
    'autorun',
    `--config=${configPath}`,
    `--collect.url=${baseUrl}`,
    `--collect.chromePath=${chromePath}`,
  ],
  {
    cwd: appRoot,
    env: {
      ...process.env,
      CHROME_PATH: chromePath,
      LHCI_COLLECT__CHROME_PATH: chromePath,
    },
    stdio: 'inherit',
  },
);

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 1);
});

child.on('error', (error) => {
  console.error(
    `Failed to start LHCI autorun from ${appRoot}: ${formatError(error)}`,
  );
  process.exit(1);
});

async function assertBaseUrlReady(url) {
  let response;

  try {
    response = await fetch(url, { redirect: 'manual' });
  } catch (error) {
    throw new Error(
      `LHCI target URL is not reachable before launch: ${url}. ${formatError(error)}`,
      { cause: error },
    );
  }

  if (!response.ok) {
    throw new Error(
      `LHCI target URL returned ${response.status} before launch: ${url}`,
    );
  }
}

function formatError(error) {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}