import assert from 'node:assert/strict';
import test from 'node:test';

import { buildIssueWorktreePermissionDecision } from '../.github/hooks/scripts/request-guard/permission.mjs';

function createGitContext(overrides = {}) {
  return {
    isGitRepo: true,
    valid: true,
    reasons: [],
    branch: 'main',
    topLevel: '/workspaces/focusbuddy',
    ...overrides,
  };
}

test('allows when current workspace is invalid but target issue worktree is valid', () => {
  const result = buildIssueWorktreePermissionDecision({
    gitContext: createGitContext({
      valid: false,
      reasons: ['current branch は別 worktree に割り当て済みです'],
    }),
    targetGitContexts: [
      createGitContext({
        branch: 'feat/#183',
        topLevel: '/workspaces/focusbuddy/.worktrees/issue-183',
        path: '/workspaces/focusbuddy/.worktrees/issue-183/.github/copilot-instructions.md',
      }),
    ],
    referencedIssueNumbers: ['183'],
    shouldBypassIssueRequirement: false,
  });

  assert.equal(result, null);
});

test('denies when current workspace is invalid and target issue worktree is also invalid', () => {
  const result = buildIssueWorktreePermissionDecision({
    gitContext: createGitContext({
      valid: false,
      reasons: ['current branch は別 worktree に割り当て済みです'],
    }),
    targetGitContexts: [
      createGitContext({
        valid: false,
        branch: 'feat/#183',
        reasons: ['current worktree path が git worktree list に存在しません'],
        path: '/workspaces/focusbuddy/.worktrees/issue-183/.github/copilot-instructions.md',
      }),
    ],
    referencedIssueNumbers: ['183'],
    shouldBypassIssueRequirement: false,
  });

  assert.equal(result?.hookSpecificOutput.permissionDecision, 'deny');
  assert.match(result?.hookSpecificOutput.permissionDecisionReason || '', /branch\/worktree 整合確認/);
  assert.match(result?.hookSpecificOutput.additionalContext || '', /指定された対象/);
});

test('denies when neither current context nor target path resolves to an issue worktree', () => {
  const result = buildIssueWorktreePermissionDecision({
    gitContext: createGitContext({ branch: 'main' }),
    targetGitContexts: [],
    referencedIssueNumbers: ['183'],
    shouldBypassIssueRequirement: false,
  });

  assert.equal(result?.hookSpecificOutput.permissionDecision, 'deny');
  assert.match(result?.hookSpecificOutput.additionalContext || '', /絶対パス/);
});