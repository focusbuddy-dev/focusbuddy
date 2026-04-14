import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { chromium } from 'playwright';

const __dirname = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(__dirname, '..');
const configPath = resolve(appRoot, '.lighthouserc.json');

export async function runLhci() {
  const chromePath = resolveChromiumExecutablePath();
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

  await new Promise<void>((resolvePromise, rejectPromise) => {
    child.on('exit', (code, signal) => {
      if (signal) {
        process.kill(process.pid, signal);
        return;
      }

      if (code === 0) {
        resolvePromise();
        return;
      }

      rejectPromise(new Error(`LHCI autorun exited with code ${code ?? 1}.`));
    });

    child.on('error', (error) => {
      rejectPromise(
        new Error(
          `Failed to start LHCI autorun from ${appRoot}: ${formatError(error)}`,
          { cause: error },
        ),
      );
    });
  });
}

export function resolveChromiumExecutablePath() {
  let executablePath = '';

  try {
    executablePath = chromium.executablePath();
  } catch {
    executablePath = '';
  }

  if (!executablePath || !existsSync(executablePath)) {
    throw new Error(
      'Playwright Chromium is not installed. Run `pnpm --filter @focusbuddy/web measure:browser` first.',
    );
  }

  return executablePath;
}

export async function assertBaseUrlReady(url: string) {
  const response = await fetch(url, { redirect: 'manual' }).catch((error: unknown) => {
    throw new Error(`LHCI target URL is not reachable before launch: ${url}. ${formatError(error)}`, {
      cause: error,
    });
  });

  if (!response.ok) {
    throw new Error(`LHCI target URL returned ${response.status} before launch: ${url}`);
  }
}

export function formatError(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

function isExecutedDirectly(metaUrl: string) {
  const entryPoint = process.argv[1];

  return typeof entryPoint === 'string' && pathToFileURL(entryPoint).href === metaUrl;
}

if (isExecutedDirectly(import.meta.url)) {
  void runLhci().catch((error: unknown) => {
    console.error(formatError(error));
    process.exit(1);
  });
}