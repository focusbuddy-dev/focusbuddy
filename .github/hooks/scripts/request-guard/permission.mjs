import {
  branchMatchesIssue,
  isExecutionLikeTool,
  shouldBypassIssueWorktreeRequirement,
} from "./policy.mjs";
import {
  collectTargetGitContexts,
  inspectGitWorktreeContext,
} from "./git-context.mjs";
import {buildPromptLikeText, extractIssueNumbers} from "./shared.mjs";

export function buildPreToolPermissionOutput(cwd, event, state) {
  const toolName = String(event.tool_name || "");

  if (isExecutionLikeTool(toolName) && state.isActionTask) {
    const gitContext = inspectGitWorktreeContext(cwd);
    const referencedIssueNumbers = extractIssueNumbers(
      [state.sourceText || "", buildPromptLikeText(event)]
        .filter(Boolean)
        .join("\n"),
    );
    const targetGitContexts = collectTargetGitContexts(event);
    const hasValidIssueWorktreeTarget = targetGitContexts.some(
      (targetContext) =>
        targetContext.isGitRepo &&
        targetContext.valid &&
        branchMatchesIssue(targetContext.branch, referencedIssueNumbers),
    );
    const currentContextIsIssueWorktree =
      gitContext.isGitRepo &&
      gitContext.valid &&
      branchMatchesIssue(gitContext.branch, referencedIssueNumbers);

    if (gitContext.isGitRepo && !gitContext.valid) {
      return {
        hookSpecificOutput: {
          hookEventName: "PreToolUse",
          permissionDecision: "deny",
          permissionDecisionReason: `Git の branch/worktree 整合確認で停止しました: ${gitContext.reasons.join(" / ")}`,
          additionalContext:
            "更新系の作業前に current branch、current worktree path、git worktree list の対応を確認し、整合が取れた状態で再実行してください。",
        },
      };
    }

    if (
      gitContext.isGitRepo &&
      !shouldBypassIssueWorktreeRequirement(event) &&
      !currentContextIsIssueWorktree &&
      !hasValidIssueWorktreeTarget
    ) {
      return {
        hookSpecificOutput: {
          hookEventName: "PreToolUse",
          permissionDecision: "deny",
          permissionDecisionReason:
            "Issue に対応する git worktree が未確定のまま更新系作業へ進もうとしたため停止しました",
          additionalContext:
            "Issue を確定した後、main から feat/#<issue番号> の worktree を作成し、その worktree 配下のパスだけを更新対象にしてください。current workspace が main のままでも、編集対象が issue worktree 内の絶対パスなら実行できます。",
        },
      };
    }
  }

  return {
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "allow",
    },
  };
}
