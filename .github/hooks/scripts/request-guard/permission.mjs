import {
  branchMatchesIssue,
  isExecutionLikeTool,
  shouldBypassIssueWorktreeRequirement,
} from './policy.mjs';
import { collectTargetGitContexts, inspectGitWorktreeContext } from './git-context.mjs';
import { buildPromptLikeText, extractIssueNumbers } from './shared.mjs';

function isValidIssueWorktreeContext(gitContext, issueNumbers) {
  return (
    gitContext?.isGitRepo && gitContext.valid && branchMatchesIssue(gitContext.branch, issueNumbers)
  );
}

function formatGitRecoveryGuidance(gitContext, targetGitContexts) {
  const invalidTargetContext = targetGitContexts.find(
    (targetContext) => targetContext.isGitRepo && !targetContext.valid,
  );

  if (invalidTargetContext) {
    return [
      'current branch、current worktree path、git worktree list --porcelain の対応を確認してください。',
      `指定された対象 ${invalidTargetContext.path} にも不整合があります: ${invalidTargetContext.reasons.join(' / ')}。`,
      'main workspace から続行する場合は、有効な Issue 専用 worktree 配下の絶対パスだけを更新対象にしてください。',
    ].join(' ');
  }

  if (gitContext.isGitRepo) {
    return [
      'current branch、current worktree path、git worktree list --porcelain の対応を確認してください。',
      'main workspace から続行する場合は、有効な Issue 専用 worktree 配下の絶対パスだけを更新対象にするか、その worktree を cwd にして再実行してください。',
    ].join(' ');
  }

  return '有効な Issue 専用 worktree 配下の絶対パスだけを更新対象にするか、その worktree を cwd にして再実行してください。';
}

export function buildIssueWorktreePermissionDecision({
  gitContext,
  targetGitContexts,
  referencedIssueNumbers,
  shouldBypassIssueRequirement,
}) {
  const hasValidIssueWorktreeTarget = targetGitContexts.some((targetContext) =>
    isValidIssueWorktreeContext(targetContext, referencedIssueNumbers),
  );
  const currentContextIsIssueWorktree = isValidIssueWorktreeContext(
    gitContext,
    referencedIssueNumbers,
  );

  if (
    gitContext.isGitRepo &&
    !gitContext.valid &&
    !hasValidIssueWorktreeTarget &&
    !shouldBypassIssueRequirement
  ) {
    return {
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason: `Git の branch/worktree 整合確認で停止しました: ${gitContext.reasons.join(' / ')}`,
        additionalContext: formatGitRecoveryGuidance(gitContext, targetGitContexts),
      },
    };
  }

  if (
    gitContext.isGitRepo &&
    !shouldBypassIssueRequirement &&
    !currentContextIsIssueWorktree &&
    !hasValidIssueWorktreeTarget
  ) {
    return {
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason:
          'Issue に対応する git worktree が未確定のまま更新系作業へ進もうとしたため停止しました',
        additionalContext:
          'Issue を確定した後、main から feat/#<issue番号> の worktree を作成し、その worktree 配下の絶対パスだけを更新対象にしてください。既に issue worktree がある場合は、その path を明示して target 側の整合を通してください。',
      },
    };
  }

  return undefined;
}

export function buildPreToolPermissionOutput(cwd, event, state) {
  const toolName = String(event.tool_name || '');

  if (isExecutionLikeTool(toolName) && state.isActionTask) {
    const gitContext = inspectGitWorktreeContext(cwd);
    const referencedIssueNumbers = extractIssueNumbers(
      [state.sourceText || '', buildPromptLikeText(event)].filter(Boolean).join('\n'),
    );
    const targetGitContexts = collectTargetGitContexts(event);
    const permissionDecision = buildIssueWorktreePermissionDecision({
      gitContext,
      targetGitContexts,
      referencedIssueNumbers,
      shouldBypassIssueRequirement: shouldBypassIssueWorktreeRequirement(event),
    });

    if (permissionDecision) {
      return permissionDecision;
    }
  }

  return {
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'allow',
    },
  };
}
