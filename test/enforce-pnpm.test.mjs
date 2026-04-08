import assert from 'node:assert/strict';
import test from 'node:test';
import { spawn } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const scriptPath = resolve(repoRoot, 'scripts/enforce-pnpm.mjs');

function runEnforcePnpm(userAgent, scriptEntryPath = scriptPath) {
  return new Promise((resolveResult, reject) => {
    const child = spawn(process.execPath, [scriptEntryPath], {
      cwd: repoRoot,
      env: {
        ...process.env,
        npm_config_user_agent: userAgent,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', reject);
    child.on('close', (code) => {
      resolveResult({ code, stdout, stderr });
    });
  });
}

test('allows pnpm user agents', async () => {
  const result = await runEnforcePnpm('pnpm/10.31.0 npm/? node/v24.14.0 linux x64');

  assert.equal(result.code, 0, result.stderr || result.stdout);
  assert.equal(result.stderr, '');
});

test('rejects npm user agents with guidance', async () => {
  const result = await runEnforcePnpm('npm/10.9.0 node/v24.14.0 linux x64');

  assert.equal(result.code, 1, 'expected npm user agent to be rejected');
  assert.match(result.stderr, /This repository supports pnpm only\./);
  assert.match(result.stderr, /Use just commitlint-setup for the initial setup flow\./);
  assert.match(
    result.stderr,
    /If you need to install dependencies directly, use pnpm install --frozen-lockfile\./,
  );
});

test('rejects yarn and empty user agents', async (t) => {
  for (const userAgent of ['yarn/1.22.22 npm/? node/v24.14.0 linux x64', '']) {
    await t.test(`rejects ${userAgent || 'empty'} user agent`, async () => {
      const result = await runEnforcePnpm(userAgent);

      assert.equal(result.code, 1, 'expected non-pnpm user agent to be rejected');
      assert.match(result.stderr, /This repository supports pnpm only\./);
    });
  }
});

test('rejects npm user agents when executed via the relative preinstall path', async () => {
  const result = await runEnforcePnpm(
    'npm/10.9.0 node/v24.14.0 linux x64',
    'scripts/enforce-pnpm.mjs',
  );

  assert.equal(result.code, 1, 'expected relative-path execution to reject npm user agent');
  assert.match(result.stderr, /This repository supports pnpm only\./);
  assert.match(result.stderr, /Use just commitlint-setup for the initial setup flow\./);
});
