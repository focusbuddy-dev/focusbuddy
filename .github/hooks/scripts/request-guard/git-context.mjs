import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { buildPromptLikeText, normalizeGuardText } from './shared.mjs';

export function runGit(args, cwd) {
  return spawnSync('git', args, {
    cwd,
    encoding: 'utf8',
  });
}

export function parseWorktreeList(stdout) {
  const entries = [];
  let currentEntry = null;

  for (const line of String(stdout || '').split('\n')) {
    if (!line.trim()) {
      currentEntry = null;
      continue;
    }

    if (line.startsWith('worktree ')) {
      currentEntry = {
        worktree: line.slice('worktree '.length).trim(),
        branch: '',
      };
      entries.push(currentEntry);
      continue;
    }

    if (!currentEntry) {
      continue;
    }

    if (line.startsWith('branch ')) {
      currentEntry.branch = line.slice('branch '.length).trim();
    }
  }

  return entries;
}

export function inspectGitWorktreeContext(cwd) {
  const topLevelResult = runGit(['rev-parse', '--show-toplevel'], cwd);

  if (topLevelResult.status !== 0) {
    return {
      isGitRepo: false,
      valid: true,
      reasons: [],
    };
  }

  const topLevel = String(topLevelResult.stdout || '').trim();
  const branchResult = runGit(['branch', '--show-current'], cwd);
  const worktreeResult = runGit(['worktree', 'list', '--porcelain'], cwd);
  const branch = String(branchResult.stdout || '').trim();
  const entries = parseWorktreeList(worktreeResult.stdout || '');
  const normalizedTopLevel = path.resolve(topLevel);
  const currentEntry = entries.find((entry) => path.resolve(entry.worktree) === normalizedTopLevel);
  const branchRef = branch ? `refs/heads/${branch}` : '';
  const branchOwners = branchRef ? entries.filter((entry) => entry.branch === branchRef) : [];
  const reasons = [];

  if (!branch) {
    reasons.push('current branch が detached か未確定です');
  }

  if (worktreeResult.status !== 0) {
    reasons.push('git worktree list を取得できませんでした');
  }

  if (!currentEntry) {
    reasons.push('current worktree path が git worktree list に存在しません');
  }

  if (currentEntry && branchRef && currentEntry.branch !== branchRef) {
    reasons.push('current worktree の branch 情報と git branch --show-current が一致しません');
  }

  if (branchRef && branchOwners.length === 0) {
    reasons.push(
      'current branch が git worktree list 上のどの worktree にも割り当てられていません',
    );
  }

  if (branchRef && branchOwners.length > 1) {
    reasons.push('current branch が複数 worktree に割り当てられています');
  }

  if (
    branchRef &&
    branchOwners.length === 1 &&
    path.resolve(branchOwners[0].worktree) !== normalizedTopLevel
  ) {
    reasons.push('current branch は別 worktree に割り当て済みです');
  }

  return {
    isGitRepo: true,
    valid: reasons.length === 0,
    reasons,
    topLevel,
    branch,
  };
}

export function extractPatchTargetPaths(text) {
  const matches = normalizeGuardText(text).matchAll(/^\*\*\* (?:Add|Update|Delete) File: (.+)$/gm);

  return [...matches].map((match) => String(match[1] || '').trim());
}

export function extractAbsolutePaths(text) {
  const absolutePathPattern = /(\\\\[^\s"'`]+|[A-Za-z]:\\[^\s"'`]+|\/[^\s"'`]+)/g;
  const matches = normalizeGuardText(text).matchAll(absolutePathPattern);

  return [...matches].map((match) => String(match[0] || '').trim());
}

export function findExistingPath(targetPath) {
  let currentPath = path.resolve(targetPath);

  while (!fs.existsSync(currentPath)) {
    const parentPath = path.dirname(currentPath);

    if (parentPath === currentPath) {
      return null;
    }

    currentPath = parentPath;
  }

  return currentPath;
}

export function collectTargetGitContexts(event) {
  const collectedText = buildPromptLikeText(event);
  const paths = new Set([
    ...extractPatchTargetPaths(collectedText),
    ...extractAbsolutePaths(collectedText),
  ]);
  const contexts = [];
  const gitContextCache = new Map();

  for (const targetPath of paths) {
    if (!path.isAbsolute(targetPath)) {
      continue;
    }

    const existingPath = findExistingPath(targetPath);

    if (!existingPath) {
      continue;
    }

    const lstat = fs.lstatSync(existingPath);
    const isSymlink = lstat.isSymbolicLink();
    const resolvedPath = isSymlink ? fs.realpathSync(existingPath) : existingPath;
    const stat = fs.statSync(resolvedPath);
    const inspectPath = stat.isDirectory() ? resolvedPath : path.dirname(resolvedPath);

    if (!gitContextCache.has(inspectPath)) {
      gitContextCache.set(inspectPath, inspectGitWorktreeContext(inspectPath));
    }

    const gitContext = gitContextCache.get(inspectPath);

    if (isSymlink) {
      if (!gitContext || !gitContext.topLevel) {
        continue;
      }

      const topLevel = path.resolve(gitContext.topLevel);
      const normalizedTopLevel = topLevel.endsWith(path.sep) ? topLevel : topLevel + path.sep;
      const normalizedResolved = path.resolve(resolvedPath);

      if (!normalizedResolved.startsWith(normalizedTopLevel)) {
        continue;
      }
    }

    contexts.push({
      path: targetPath,
      inspectPath,
      ...gitContext,
    });
  }

  return contexts;
}
