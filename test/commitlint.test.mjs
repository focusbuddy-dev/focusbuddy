import assert from 'node:assert/strict';
import test from 'node:test';
import { spawn } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function runCommitlint(message) {
  return new Promise((resolveResult, reject) => {
    const child = spawn('pnpm', ['exec', 'commitlint', '--config', 'commitlint.config.ts'], {
      cwd: repoRoot,
      stdio: ['pipe', 'pipe', 'pipe'],
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

    child.stdin.end(message);
  });
}

function runCommitMsgHook(messageFilePath) {
  return new Promise((resolveResult, reject) => {
    const child = spawn('sh', ['.husky/commit-msg', messageFilePath], {
      cwd: repoRoot,
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

async function writeCommitMessageFile(message) {
  const directory = await mkdtemp(resolve(tmpdir(), 'focusbuddy-commitlint-'));
  const filePath = resolve(directory, 'COMMIT_EDITMSG');
  await writeFile(filePath, message, 'utf8');
  return filePath;
}

test('accepts a commit message with an issue reference in the header', async () => {
  const result = await runCommitlint('chore: add commitlint demo refs #14\n');

  assert.equal(result.code, 0, result.stderr || result.stdout);
});

test('accepts a commit message with an issue reference in the footer', async () => {
  const result = await runCommitlint('chore: add commitlint demo\n\nrefs #14\n');

  assert.equal(result.code, 0, result.stderr || result.stdout);
});

test('rejects a commit message without an issue reference', async () => {
  const result = await runCommitlint('chore: add commitlint demo\n');

  assert.notEqual(result.code, 0, 'expected commitlint to reject the message');
  assert.match(result.stderr || result.stdout, /issue reference/i);
});

test('commit-msg hook accepts a message with an issue reference', async () => {
  const messageFilePath = await writeCommitMessageFile('chore: add commitlint demo refs #14\n');
  const result = await runCommitMsgHook(messageFilePath);

  assert.equal(result.code, 0, result.stderr || result.stdout);
});

test('commit-msg hook rejects a message without an issue reference', async () => {
  const messageFilePath = await writeCommitMessageFile('chore: add commitlint demo\n');
  const result = await runCommitMsgHook(messageFilePath);

  assert.notEqual(result.code, 0, 'expected commit-msg hook to reject the message');
  assert.match(result.stderr || result.stdout, /issue reference/i);
});
